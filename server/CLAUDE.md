# Server

Express API that proxies chat messages to Claude.

## Stack

- Express 5
- Anthropic SDK
- Node.js (ESM)
- pnpm

## Commands

```bash
pnpm start    # Start server on port 3000
```

## Structure

- `index.js` - Single file Express server with `/chat` endpoint

## API

### POST /chat

Request (client may send last user message with `content` as an array of content blocks from IndexedDB files):
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "conversation_id": "optional-uuid-from-client"
}
```

Response:
```json
{
  "content": "Hi! How can I help you today?",
  "conversation_id": "uuid"
}
```

The server is stateless: no database, no file storage. Conversations and files are stored in IndexedDB on the client.

## Environment

Requires `.env` file with:
```
ANTHROPIC_API_KEY=your-api-key
PORT=3000  # optional, defaults to 3000
```

## Personality

The chatbot has a Gen X/90s personality inspired by the Sega Genesis/Mega Drive era:
- Bold, direct, and slightly edgy but still fun
- Succinct and gets to the point without fluff
- Warm and genuine, but doesn't sugarcoat things
- Clear and practical explanations
- No corporate speak or emoji spam

The system prompt is defined in the `SYSTEM_PROMPT` constant in `index.js`.

## Notes

- Uses `claude-haiku-4-5-20251001` model (Claude Haiku 4.5)
- CORS enabled for cross-origin requests from client
- Max tokens set to 2048
- System prompt configured for Gen X/90s Sega Genesis-inspired personality
