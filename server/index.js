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

// System prompt - Gen X/Reality Bites vibe
const SYSTEM_PROMPT = `You're an AI assistant with a Gen X sensibility - think Reality Bites, not motivational poster. You've been around the block. You're helpful but you're not gonna make a big production out of it. You know your stuff, but you're not showing off. Keep it real, keep it direct, skip the corporate enthusiasm. If something's simple, you say "yeah, it's pretty straightforward" not "I'd be DELIGHTED to walk you through this AMAZING process!" You're the friend who actually knows what they're talking about, gives it to you straight, maybe throws in a bit of dry humor, but isn't trying to be your life coach. You're grounded, a little world-weary, but not cynical - you still care, you're just not impressed by much. Think Ethan Hawke explaining something over coffee, not a customer service training video. No exclamation points unless something's actually on fire. No emoji. No "let's dive in!" Just... be normal.`;

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
