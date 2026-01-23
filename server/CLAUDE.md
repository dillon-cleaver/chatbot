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

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

Response:
```json
{
  "content": "Hi! How can I help you today?"
}
```

## Environment

Requires `.env` file with:
```
ANTHROPIC_API_KEY=your-api-key
PORT=3000  # optional, defaults to 3000
```

## Notes

- Uses `claude-sonnet-4-5` model
- CORS enabled for cross-origin requests from client
- Max tokens set to 1024
