# Chatbot

A modern, context-aware chatbot powered by Claude with file upload and analysis capabilities. Upload documents, images, spreadsheets, and more—then have natural conversations with Claude about their contents.

## Features

### 💬 Conversational AI
- Powered by Claude Sonnet 4.5 (Anthropic)
- Markdown-formatted responses with syntax highlighting
- Conversation history maintained throughout the session
- Dark/light theme toggle

### 📎 File Upload & Management
- Upload multiple file types: PDF, images (PNG/JPEG/GIF/WebP), Word docs, Excel spreadsheets, PowerPoint, CSV, and plain text
- Files and conversation history stored in **IndexedDB** (browser-only; no server-side storage)
- View uploaded files in modal interface
- Delete files when no longer needed
- Clearing site data clears all conversations and files

### 🎯 Selective File Attachment
- Choose which files to include with each message
- Visual file chips show selected files below chat input
- Maximum 5 files per message for optimal performance
- Files cleared after sending to prevent accidental reuse

### 🤖 Intelligent File Processing
- **PDFs**: Native Claude document understanding (up to 20,000 pages)
- **Images**: Claude's vision capabilities analyze visual content
- **Word/Excel/PowerPoint**: Text extraction and formatting
- **CSV**: Parsed and formatted as readable tables
- Automatic content type detection and validation

### 🎨 Brutalist Design
- Clean, bold aesthetic with chunky borders and shadows
- Custom fonts: Fraunces (headings) and Roboto (body)
- Responsive layout optimized for chat interfaces

### ⌨️ Keyboard Accessible
- Full keyboard navigation throughout the app
- Global shortcuts for common actions
- Arrow key navigation in modals and lists
- Screen reader friendly with ARIA live regions

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message (when in input) |
| `Shift+Enter` | New line in message |
| `Ctrl/⌘+Enter` | Send message (from anywhere) |
| `Ctrl/⌘+U` | Open file attach modal |
| `Ctrl/⌘+Y` | Open chat history |
| `Escape` | Close modal / toggle input focus |
| `?` | Show keyboard shortcuts (when not typing) |
| `↑/↓` | Navigate lists and modal sections |
| `←/→` | Navigate header buttons or row actions |
| `Home/End` | Jump to first/last list item |
| `Space/Enter` | Toggle selection or activate focused button |

## Accessibility

- **Skip link** for keyboard users to bypass header
- **Semantic landmarks** (`<header>`, `<main>`, `<nav>`)
- **ARIA live regions** announce dynamic content (message sent, file uploaded, etc.)
- **Roving tabindex** for file and conversation lists
- **Reduced motion** support via `prefers-reduced-motion`
- **Visible focus indicators** on all interactive elements
- **Focus trap** in modals with proper Tab cycling

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │ ◄─────► │  Express Backend │
│ (Vite + IndexedDB)│  /chat  │ (stateless proxy) │
└────────┬────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐          ┌─────────────┐
│    IndexedDB    │          │  Anthropic  │
│ conversations   │          │ Claude API  │
│ messages, files │          └─────────────┘
└─────────────────┘
```

All persistent data (conversations, messages, uploaded files) lives in the browser via IndexedDB. The server only exposes `POST /chat` and proxies to the LLM; it does not store data.

## How It Works

### File Upload Flow
1. User selects files via the 📎 button in the header
2. Files are stored in **IndexedDB** in the browser (no server upload)
3. Files appear in modal for selection

### Chat with Files Flow
1. User checks boxes next to files in the modal to select them
2. Selected files appear as "chips" below the chat input
3. User types a message and clicks Send
4. Frontend reads file blobs from IndexedDB, processes them client-side (PDFs, images, Office docs, etc.), and builds content blocks
5. Frontend sends `messages` (with last user message content as content blocks) and `conversation_id` to `POST /chat`
6. Server forwards messages to Claude API (no file storage or DB)
7. Response is stored in IndexedDB and rendered with markdown
8. Selected files cleared for next message

### File Processing Details

File processing runs **in the client** (`client/src/services/fileProcessor.ts`). Content blocks (text, image, document) are built there and sent in the `/chat` request. The server does not read or store files.

## Prerequisites

- Node.js 18+
- pnpm 10+
- [Anthropic API key](https://console.anthropic.com/)

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chatbot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**

   Create `server/.env`:
   ```env
   ANTHROPIC_API_KEY=your-api-key-here
   PORT=3000  # optional, defaults to 3000
   ```

4. **Start the application**
   ```bash
   pnpm dev
   ```

   This starts both the client and server in parallel:
   - **Client**: http://localhost:5173
   - **Server**: http://localhost:3000

## Available Commands

From the root directory:

```bash
pnpm install          # Install all dependencies (client + server)
pnpm dev              # Run client and server in parallel
pnpm dev:client       # Run client only (port 5173)
pnpm dev:server       # Run server only (port 3000)
pnpm build            # Build client for production
pnpm lint             # Lint client code
```

From `server/` directory:

```bash
pnpm start            # Run server only (port 3000)
```

## Project Structure

```
chatbot/
├── client/              # React 19 frontend
│   ├── src/
│   │   ├── App.jsx           # Main chat component
│   │   ├── App.module.css    # Component styles
│   │   ├── index.css         # Global styles + theme
│   │   └── main.jsx          # React entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/              # Express 5 backend (stateless)
│   ├── index.js              # POST /chat only; proxies to Claude
│   ├── package.json
│   └── .env                  # ANTHROPIC_API_KEY, PORT (create this)
│
├── package.json         # Root workspace config
├── pnpm-workspace.yaml  # pnpm workspace definition
└── README.md           # This file
```

## Technology Stack

### Frontend
- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **react-markdown** - Markdown rendering
- **CSS Modules** - Scoped styling

### Backend
- **Express 5** - Web framework
- **Anthropic SDK** - Claude API client (stateless; no DB or file storage)

## API Endpoints

The server exposes only one endpoint:

### `POST /chat`
Send messages to Claude. Client sends content blocks (including file content) in the last user message; no file IDs.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What's in this document?" }
  ],
  "conversation_id": "optional-uuid-from-client"
}
```

**Response:**
```json
{
  "content": "This document discusses...",
  "conversation_id": "uuid"
}
```

## Deployment

For a live/production build, point the client at your chat server:

- **Build:** Set `VITE_API_URL` to your server URL when building (e.g. `VITE_API_URL=https://your-api.example.com pnpm build`), or configure it in `.env` (e.g. `client/.env.production` with `VITE_API_URL=https://...`). If unset, the client uses `http://localhost:3000`.
- **Server:** Deploy the server (e.g. Node host or serverless) so it exposes `POST /chat`; keep CORS enabled for your frontend origin.
- **Storage:** The app uses IndexedDB only; there is no server-side database or file storage. Clearing site data in the browser clears all conversations and uploaded files.

### Supported File Types
- **Documents**: PDF, Word (.doc, .docx)
- **Images**: PNG, JPEG, GIF, WebP
- **Spreadsheets**: Excel (.xls, .xlsx), CSV
- **Presentations**: PowerPoint (.ppt, .pptx) - basic support
- **Text**: Plain text (.txt)

### File Size Limits
- PDFs and images: 5MB per file
- Text-based files: 1MB per file
- Upload limit: 10MB per request
- Maximum files per message: 5

### Model Configuration
- Model: `claude-haiku-4-5-20251001` (Claude Haiku 4.5)
- Max tokens: 2048
- Adjustable in `server/index.js`

## Git Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `ci`, `build`

## Development Notes

- Conversations, messages, and uploaded files are stored in **IndexedDB** in the browser
- Clearing site data (or unregistering the site) clears all conversations and files
- File selections are cleared after each message to prevent accidental context pollution
- The server is stateless: no database or file storage on the server

## Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Full PowerPoint text extraction
- [ ] File previews in modal
- [ ] Drag-and-drop file upload
- [ ] Export conversation as markdown/PDF
- [ ] Streaming responses from Claude
- [ ] File size optimization/compression

## License

MIT

## Contributing

Contributions welcome! Please follow the Conventional Commits format for all commits and PR titles.
