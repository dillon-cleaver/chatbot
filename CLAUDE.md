# Chatbot

Claude-powered chatbot with a React frontend and Express backend.

## Structure

```
├── client/    # React 19 + Vite frontend
├── server/    # Express 5 API server
```

See `client/CLAUDE.md` and `server/CLAUDE.md` for package-specific details.

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Run client and server in parallel
pnpm dev:client       # Run client only (port 5173)
pnpm dev:server       # Run server only (port 3000)
pnpm build            # Build client for production
pnpm lint             # Lint client
```

## Setup

1. Copy `server/.env.example` to `server/.env` (if exists) or create `server/.env`:
   ```
   ANTHROPIC_API_KEY=your-api-key
   ```
2. Run `pnpm install` from root
3. Run `pnpm dev` to start both services
