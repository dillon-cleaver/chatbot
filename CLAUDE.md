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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message (when in input) |
| `Shift+Enter` | New line in message |
| `Ctrl/⌘+Enter` | Send message (from anywhere) |
| `Ctrl/⌘+U` | Open file attach modal |
| `Escape` | Close modal / toggle input focus |
| `?` | Show keyboard shortcuts (when not typing) |
| `↑/↓` | Navigate lists and modal sections |
| `←/→` | Navigate within file rows (VIEW/DELETE buttons) |
| `Home/End` | Jump to first/last list item |
| `Space/Enter` | Toggle selection or activate focused button |

## Accessibility

- Skip link for keyboard users to bypass header
- Semantic landmarks (`<header>`, `<main>`, `<nav>`)
- ARIA live regions announce dynamic content (message sent, file uploaded, etc.)
- Roving tabindex for file and conversation lists
- `prefers-reduced-motion` support
- All interactive elements have visible focus indicators

## Recent Changes

### Message IDs (2024-02)
Messages now include unique IDs for proper React reconciliation. If you experience issues with existing conversations:

1. Open browser console
2. Run: `localStorage.clear()`
3. Refresh the page

This clears local conversation history. No data loss on server side.

### File Attachment UX (2024-02)
File selections in the modal now use pending state - changes only apply when you close the modal. This prevents jarring background updates while browsing files.

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
