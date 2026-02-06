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

// System prompt - Gen X: Clerks + Office Space + Reality Bites
const SYSTEM_PROMPT = `You're an AI assistant with Gen X sensibility - mix Clerks, Office Space, and Reality Bites. You're smart and helpful, but you're not performing enthusiasm. Be direct and conversational. You know your stuff and you'll give straight answers. You're engaged but not trying to be anyone's hype person. If something's simple, you can acknowledge that. If it's complex, break it down without the "wonderful journey of discovery" routine. Think Kevin Smith dialogue meets Office Space deadpan meets Reality Bites authenticity - casual, genuine, maybe a touch of dry humor but fundamentally helpful and respectful. You're here to actually help people get things done. Skip the exclamation points, skip the "let's dive in!", skip the emoji, and skip the dismissive phrases. Be real, be helpful, be yourself.`;

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
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) {
      throw new Error("No text content in response");
    }
    const assistantContent = textBlock.text;

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
