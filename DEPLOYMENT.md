# Deployment

The app is deployed on [Railway](https://railway.com) as a single service. The Express server serves both the API and the built client static files.

## Architecture

In production, there's one Railway service running the Express server:

1. **Build step**: `pnpm --filter client build` compiles the React app into `client/dist/`
2. **Start step**: `pnpm --filter server start` runs the Express server
3. Express serves `client/dist/` as static files and handles `/chat` API requests
4. The client uses same-origin requests in production (no CORS needed)

This is configured in `server/railway.json`.

## How It Works

### Static file serving in Express

The server (`server/index.js`) serves the client build output:

```javascript
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});
```

The catch-all route sends `index.html` for any unmatched path, enabling client-side routing.

### API base URL

In `client/src/utils/api.ts`, the API URL is determined at build time:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '');
```

- **Development**: Uses `http://localhost:3000` (Vite dev server on 5173, Express on 3000)
- **Production**: Uses `''` (empty string = same origin, since Express serves everything)
- **Override**: Set `VITE_API_URL` env var at build time if needed

### Railway configuration

The `server/railway.json` file configures the build and deploy:

- **Build command**: `pnpm --filter client build` — builds the React app
- **Start command**: `pnpm --filter server start` — starts Express
- **Watch patterns**: Both `/server/**` and `/client/**` trigger redeploys

### Environment variables

Set these in Railway's Variables tab (not in files):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ANTHROPIC_MODEL` | No | Claude model ID (defaults to `claude-haiku-4-5-20251001`) |
| `PORT` | No | Railway sets this automatically |

## Lessons Learned

### Why not a separate client service?

We tried several approaches for serving the client independently on Railway:

1. **`vite preview`** — Binds to localhost by default. Even with `--host`, Railway's proxy couldn't reliably connect. Port configuration was also tricky (Vite defaults to 4173, Railway assigns its own port).

2. **Custom Node.js HTTP server** — A minimal `http.createServer` serving static files. Worked locally but Railway's proxy still returned 502s with no requests reaching the server.

3. **Caddy** — Railway's own Vite template uses Caddy as a web server, but that adds complexity.

Serving from Express was the simplest solution: one service, no CORS, no extra configuration.

### Express 5 route syntax

Express 5 uses `path-to-regexp` v8, which requires named parameters for wildcards:

```javascript
// Express 4
app.get("*", handler);

// Express 5
app.get("/{*path}", handler);
```

The old `"*"` syntax throws `PathError: Missing parameter name at index 1`.

### Railway watch patterns

Railway's `watchPatterns` in `railway.json` control which file changes trigger a redeploy. Since the server service builds and serves the client, both `/server/**` and `/client/**` must be included.

### `import.meta.env` is build-time only

Vite's `import.meta.env` variables are baked into the bundle at build time, not read at runtime. If you need to change `VITE_API_URL`, you must rebuild the client — you can't just set a runtime environment variable.
