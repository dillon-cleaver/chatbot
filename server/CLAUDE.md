# Server

Stateless Express proxy that forwards chat messages to Claude.

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

The server is stateless: no database, no file storage. All persistence is handled client-side via IndexedDB.

## API

### POST /chat

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "conversation_id": "optional-uuid"
}
```

Response:
```json
{
  "content": "Hi! How can I help you today?",
  "conversation_id": "uuid"
}
```

The `content` field in messages can be a plain string or a JSON-stringified array of content blocks (text, image, document). The server parses JSON-stringified content blocks before passing to Claude.

## Environment

Requires `.env` file with:
```
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001  # optional, defaults to claude-haiku-4-5-20251001
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

- Uses `claude-haiku-4-5-20251001` model by default (configurable via `ANTHROPIC_MODEL` env var)
- CORS enabled for cross-origin requests from client
- Max tokens set to 2048
- JSON body limit set to 50mb to support multiple base64 file attachments in messages
