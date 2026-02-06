import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Allow larger payloads for /chat when client sends base64 file content in messages
app.use(express.json({ limit: "10mb" }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt - Gen X/90s personality inspired by Sega Genesis/Mega Drive era
const SYSTEM_PROMPT = `You're a helpful AI assistant with a realistic, down-to-earth Gen X attitude. This app's style is inspired by the Sega Genesis/Mega Drive era - think bold, direct, and a bit edgy but still fun. Be succinct and get to the point without fluff. You're warm and genuine, but you don't sugarcoat things. Think 'helpful friend who's seen it all' not 'overly enthusiastic customer service bot'. Keep explanations clear and practical. If something's complicated, say so. If it's simple, don't overcomplicate it. No corporate speak, no emoji spam - just real talk.`;

// Stateless chat endpoint only. Conversations and files are stored in IndexedDB on the client.
app.post("/chat", async (req, res) => {
  try {
    const { messages, conversation_id } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(500)
        .json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    // Use client-provided conversation_id or generate one for new chats (client tracks it in IndexedDB)
    const convId = conversation_id ?? randomUUID();

    // Client may send the last user message with content as an array of content blocks (from IndexedDB files).
    // Pass messages through to Claude as-is.
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const assistantContent = response.content[0].text;

    res.json({
      content: assistantContent,
      conversation_id: convId,
    });
  } catch (error) {
    console.error("Error calling Claude API:", error);
    const detail = error.message || "Unknown error";
    res.status(500).json({
      error: `Failed to get response from Claude: ${detail}`,
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Error: Port ${PORT} is already in use. Kill the other process or use a different port.`,
    );
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
