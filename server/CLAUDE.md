# Server

Stateless Express proxy that forwards chat messages to Claude with tool calling support.

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

- `index.js` - Express server with `/chat` SSE endpoint, streaming Anthropic API, tool execution loop, and static file serving for the client in production
- `railway.json` - Railway deployment config (build + deploy settings)
- `tools/index.js` - Custom tool registry (exports `toolDefinitions` and `toolExecutors`)
- `tools/fetchUrl.js` - URL content fetcher

The server is stateless: no database, no file storage. All persistence is handled client-side via IndexedDB.

## Production / Deployment

In production (Railway), the server also serves the built client from `client/dist/`. See `DEPLOYMENT.md` in the project root for details.

Express 5 uses `path-to-regexp` v8 — wildcard routes require named parameters: `"/{*path}"` not `"*"`.

## API

### POST /chat (SSE)

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "conversation_id": "optional-uuid"
}
```

Response is a Server-Sent Events stream with these event types:

| Event | Data | When |
|-------|------|------|
| `tool_use` | `{ tool, input }` | Claude is calling a tool (built-in or custom) |
| `tool_result` | `{ tool, success, error? }` | Tool execution completed |
| `done` | `{ content, conversation_id }` | Final text response ready |
| `error` | `{ error }` | Something went wrong |

Validation errors (400, 500) are returned as JSON before the SSE stream starts.

The `content` field in messages can be a plain string or a JSON-stringified array of content blocks (text, image, document). The server parses JSON-stringified content blocks before passing to Claude.

## Tools

### Built-in: web_search (Anthropic server tool)
Uses Anthropic's built-in `web_search_20250305` tool — search is executed server-side by the API during streaming. No extra API key required. The server detects search activity via stream events and relays `tool_use`/`tool_result` SSE events to the client.

### Custom tools
Custom tools are registered in `tools/index.js`. Each tool module exports:
- `definition` — Claude tool schema (`{ name, description, input_schema }`)
- `execute(input)` — async function returning a string result (never throws; returns error string on failure)

#### fetch_url
Fetches and extracts text content from a URL. Strips HTML tags, decodes entities, and truncates to ~10,000 characters. No API key required.

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

The system prompt is defined in the `BASE_SYSTEM_PROMPT` constant in `index.js`.

## Notes

- Uses `claude-haiku-4-5-20251001` model by default (configurable via `ANTHROPIC_MODEL` env var)
- CORS enabled for cross-origin requests from client
- Max tokens set to 4096
- JSON body limit set to 50mb to support multiple base64 file attachments in messages
- Uses streaming Anthropic API (`messages.stream()`) to detect built-in tool activity in real time
- Custom tool execution loop limited to 10 iterations to prevent runaway tool chains
