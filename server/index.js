import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You're a helpful AI assistant with a realistic, down-to-earth Gen X attitude. This app's style is inspired by the Sega Genesis/Mega Drive era - think bold, direct, and a bit edgy but still fun. Be succinct and get to the point without fluff. You're warm and genuine, but you don't sugarcoat things. Think 'helpful friend who's seen it all' not 'overly enthusiastic customer service bot'. Keep explanations clear and practical. If something's complicated, say so. If it's simple, don't overcomplicate it. No corporate speak, no emoji spam - just real talk.`;

app.post('/chat', async (req, res) => {
  try {
    const { messages, conversation_id } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const convId = conversation_id || crypto.randomUUID();

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map(msg => {
        let content = msg.content;
        // Parse JSON-stringified content blocks (client sends file attachments this way)
        if (typeof content === 'string') {
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
      }),
    });

    const assistantContent = response.content.find(block => block.type === 'text')?.text
      ?? '';

    res.json({
      content: assistantContent,
      conversation_id: convId,
    });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({
      error: 'Failed to get response from Claude',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port or stop the other process.`);
    process.exit(1);
  }
  throw err;
});
