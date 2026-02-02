# Chatbot

Claude-powered chatbot with a React frontend and Express backend. Features a Gen X/90s personality inspired by the Sega Genesis/Mega Drive era.

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
pnpm lint             # Lint client code
```

Or from within the `server/` directory:
```bash
pnpm start            # Run server only (port 3000)
```

## Setup

1. Copy `server/.env.example` to `server/.env` (if exists) or create `server/.env`:
   ```
   ANTHROPIC_API_KEY=your-api-key
   ```
2. Run `pnpm install` from root
3. Run `pnpm dev` to start both services

## Git Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format for all commit messages and PR titles:

```
<type>: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- **feat** – a new feature is introduced with the changes
- **fix** – a bug fix has occurred
- **chore** – changes that do not relate to a fix or feature and don't modify src or test files (for example updating dependencies)
- **refactor** – refactored code that neither fixes a bug nor adds a feature
- **docs** – updates to documentation such as a the README or other markdown files
- **style** – changes that do not affect the meaning of the code, likely related to code formatting such as white-space, missing semi-colons, and so on.
- **test** – including new or correcting previous tests
- **perf** – performance improvements
- **ci** – continuous integration related
- **build** – changes that affect the build system or external dependencies
