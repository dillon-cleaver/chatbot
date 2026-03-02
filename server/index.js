import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { toolDefinitions, toolExecutors } from "./tools/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_TOOL_ITERATIONS = 10;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You're a helpful AI assistant with a realistic, down-to-earth Gen X attitude. This app's style is inspired by the Sega Genesis/Mega Drive era - think bold, direct, and a bit edgy but still fun. Be succinct and get to the point without fluff. You're warm and genuine, but you don't sugarcoat things. Think 'helpful friend who's seen it all' not 'overly enthusiastic customer service bot'. Keep explanations clear and practical. If something's complicated, say so. If it's simple, don't overcomplicate it. No corporate speak, no emoji spam - just real talk.

When you use tools, do not announce that you are about to use them — the user interface already shows tool activity. Just use them and incorporate the results naturally into your response.

IMPORTANT: For any question about current events, recent news, sports schedules, dates of upcoming events, or anything that could have changed after your training data — always use web_search first. Do not rely on your training data for time-sensitive information. This includes questions like "have there been any updates to X", "what's the latest on Y", or "has anything changed with Z" — even if the user also attached a file. When in doubt, search.`;

function getSystemPrompt() {
  const now = new Date();
  return `${BASE_SYSTEM_PROMPT}\n\nCurrent date and time: ${now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}. Always account for the current date when answering time-sensitive questions — don't correct yourself mid-answer.`;
}

function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseMessageContent(msg) {
  let content = msg.content;
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed[0]?.type) {
        content = parsed;
      }
    } catch {
      // Plain string, use as-is
    }
  }
  return { role: msg.role, content };
}

// All tools: Anthropic built-in web search + custom tools
const allTools = [
  { type: "web_search_20250305", name: "web_search" },
  ...toolDefinitions,
];

app.post("/chat", async (req, res) => {
  const { messages, conversation_id } = req.body;

  // Validate before switching to SSE (these return JSON errors)
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  // Switch to SSE — flushHeaders() is required in Express 5 to send
  // headers immediately, otherwise the client never receives them and
  // the connection appears to hang until the first res.write().
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const convId = conversation_id || crypto.randomUUID();

  // Track client disconnect to abort in-flight work.
  // Listen on `res` (not `req`) because in Express 5 `req` emits 'close'
  // once the request body is consumed, not when the client disconnects.
  let clientDisconnected = false;
  let activeStream = null;
  res.on("close", () => {
    clientDisconnected = true;
    if (activeStream) {
      activeStream.abort();
    }
  });

  const debug = process.env.DEBUG === "true";

  try {
    const apiMessages = messages.map(parseMessageContent);
    const totalUsage = { input_tokens: 0, output_tokens: 0 };
    const toolsUsed = new Set();

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      if (clientDisconnected) return;

      // Use streaming to detect server-side tool activity (web search) in real time
      const stream = anthropic.messages.stream({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: getSystemPrompt(),
        tools: allTools,
        messages: apiMessages,
      });
      activeStream = stream;

      // Relay server-side tool events (built-in web search) to client via SSE
      stream.on("streamEvent", (event) => {
        if (clientDisconnected) return;
        if (event.type !== "content_block_start") return;
        const block = event.content_block;
        if (block.type === "server_tool_use") {
          toolsUsed.add(block.name);
          sendSSE(res, "tool_use", {
            tool: block.name,
            input: block.input ?? {},
          });
        } else if (block.type === "web_search_tool_result") {
          sendSSE(res, "tool_result", { tool: "web_search", success: true });
        }
      });

      const response = await stream.finalMessage();
      activeStream = null;

      if (response.usage) {
        totalUsage.input_tokens += response.usage.input_tokens;
        totalUsage.output_tokens += response.usage.output_tokens;
        if (debug) {
          console.log(
            `[Token Usage] Iteration ${i + 1}: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`,
          );
        }
      }

      if (clientDisconnected) return;

      if (response.stop_reason === "tool_use") {
        // Append assistant's full content (includes tool_use blocks)
        apiMessages.push({ role: "assistant", content: response.content });

        const toolResultBlocks = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          if (clientDisconnected) return;

          toolsUsed.add(block.name);
          sendSSE(res, "tool_use", { tool: block.name, input: block.input });

          const executor = toolExecutors[block.name];
          let result;
          if (executor) {
            result = await executor(block.input);
            sendSSE(res, "tool_result", { tool: block.name, success: true });
          } else {
            result = `Unknown tool: ${block.name}`;
            sendSSE(res, "tool_result", {
              tool: block.name,
              success: false,
              error: result,
            });
          }

          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }

        apiMessages.push({ role: "user", content: toolResultBlocks });
        continue;
      }

      // stop_reason is 'end_turn' or 'max_tokens' — extract final text
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
      if (debug) {
        console.log(
          `[Token Usage] Total: input=${totalUsage.input_tokens}, output=${totalUsage.output_tokens}`,
        );
      }
      sendSSE(res, "done", {
        content: text,
        conversation_id: convId,
        usage: totalUsage,
        ...(toolsUsed.size > 0 ? { tools_used: [...toolsUsed] } : {}),
      });
      res.end();
      return;
    }

    // Exhausted tool iterations — send whatever text we have
    sendSSE(res, "error", { error: "Too many tool calls. Please try again." });
    res.end();
  } catch (error) {
    if (clientDisconnected) return;
    console.error("Error calling Claude API:", error);
    sendSSE(res, "error", {
      error: "Failed to get response from Claude",
    });
    res.end();
  }
});

// Serve client static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Try a different port or stop the other process.`,
    );
    process.exit(1);
  }
  throw err;
});
