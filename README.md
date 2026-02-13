# Chatbot

A modern, context-aware chatbot powered by Claude with file upload and analysis capabilities. Upload documents, images, spreadsheets, and more—then have natural conversations with Claude about their contents.

## Features

### Conversational AI
- Powered by Claude (Anthropic) — configurable model via environment variable
- Markdown-formatted responses with syntax highlighting
- Persistent conversation history stored locally in IndexedDB
- Dark/light theme toggle

### File Upload & Management
- Upload multiple file types: PDF, images (PNG/JPEG/GIF/WebP), Word docs, Excel spreadsheets, PowerPoint, CSV, and plain text
- Files stored locally in the browser via IndexedDB — nothing leaves your machine until you send a message
- View, select, and delete uploaded files in a modal interface

### Selective File Attachment
- Choose which files to include with each message
- Visual file chips show selected files below chat input
- Maximum 5 files per message for optimal performance
- Selections persist per-conversation across page reloads

### Intelligent File Processing
- **PDFs**: Small PDFs sent as native document blocks; large PDFs (100+ pages or 100KB+) have text extracted
- **Images**: Sent as base64 image blocks for Claude's vision capabilities
- **Word (.docx)**: Text extraction via Mammoth
- **Excel (.xlsx)**: Formatted as markdown tables per sheet
- **PowerPoint (.pptx)**: Slide text extracted from XML
- **CSV**: Parsed and formatted as markdown tables
- **Text**: Read directly (max 1MB)
- All processing happens client-side before sending to the API

### Brutalist Design
- Clean, bold aesthetic with chunky borders and shadows
- Custom fonts: Fraunces (headings) and Roboto (body)
- Responsive layout optimized for chat interfaces

### Accessibility
- Skip link for keyboard users to bypass header
- Semantic landmarks and ARIA live regions
- Roving tabindex for file and conversation lists
- `prefers-reduced-motion` support
- Full keyboard navigation (press `?` to see shortcuts)

## Architecture

```
┌──────────────────────────────────┐
│         React Frontend           │
│        (Vite + TypeScript)       │
│                                  │
│  ┌────────────┐  ┌────────────┐  │         ┌──────────────────┐
│  │  IndexedDB  │  │    File    │  │         │  Express Backend  │
│  │             │  │ Processor  │  │ ──────► │  (Stateless Proxy) │
│  │ - files     │  │ (client)   │  │  HTTP   │                    │
│  │ - messages  │  │            │  │ ◄────── │  POST /chat only   │
│  │ - convos    │  └────────────┘  │         └────────┬───────────┘
│  └────────────┘                   │                  │
└──────────────────────────────────┘                  ▼
                                               ┌─────────────┐
                                               │  Anthropic   │
                                               │  Claude API  │
                                               └─────────────┘
```

The server is a stateless proxy — no database, no file storage. All persistence (files, conversations, messages) is handled client-side via IndexedDB.

## How It Works

### File Upload Flow
1. User selects files via the attach button or `Shift+Ctrl/Cmd+U`
2. Files are stored in IndexedDB as Blobs alongside metadata
3. Files appear in the attach modal for selection

### Chat with Files Flow
1. User selects files in the modal (pending state prevents background updates while browsing)
2. Selected files appear as chips below the chat input
3. User types a message and sends it
4. Client processes each selected file based on type:
   - **PDFs & Images**: Encoded as base64 content blocks
   - **Office docs**: Text extracted and sent as text content blocks
   - **Text/CSV**: Read and formatted as text content blocks
5. Message + content blocks sent as JSON to server
6. Server passes the content through to Claude API
7. Response rendered with markdown formatting
8. Selected files cleared for next message

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
   ANTHROPIC_MODEL=claude-haiku-4-5-20251001  # optional
   PORT=3000                                   # optional, defaults to 3000
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
├── client/                  # React 19 + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                # Main app with routing
│   │   ├── main.tsx               # React entry point
│   │   ├── index.css              # Global styles + theme variables
│   │   ├── types.ts               # TypeScript type definitions
│   │   ├── components/
│   │   │   ├── chat/              # Chat UI (messages, input, layout)
│   │   │   ├── files/             # File modal, chips, list
│   │   │   ├── history/           # Conversation history modal
│   │   │   ├── layout/            # Header, skip link
│   │   │   └── ui/                # Shared UI primitives (Modal, etc.)
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useChat.ts         # Message sending + conversation state
│   │   │   ├── useConversations.ts # Conversation CRUD
│   │   │   ├── useFileManager.ts  # File upload, selection, persistence
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── services/
│   │   │   ├── indexedDBService.ts # IndexedDB wrapper (files, messages, convos)
│   │   │   └── fileProcessor.ts   # Client-side file extraction
│   │   └── utils/                 # Helpers (API, errors, UUID, file utils)
│   ├── package.json
│   └── vite.config.ts
│
├── server/                  # Express 5 backend (stateless proxy)
│   ├── index.js             # Single-file server with POST /chat
│   ├── package.json
│   └── .env                 # Environment variables (create this)
│
├── package.json             # Root workspace config
├── pnpm-workspace.yaml      # pnpm workspace definition
└── README.md
```

## Technology Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **react-markdown** - Markdown rendering
- **CSS Modules** - Scoped styling
- **idb** - IndexedDB wrapper for persistence
- **pdfjs-dist** - PDF text extraction
- **mammoth** - Word document parsing
- **xlsx** - Excel spreadsheet parsing
- **papaparse** - CSV parsing
- **jszip** - ZIP/PPTX extraction

### Backend
- **Express 5** - Web framework
- **Anthropic SDK** - Claude API client

## API

The server exposes a single endpoint:

### `POST /chat`

Send a message to Claude.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What's in this document?" }
  ],
  "conversation_id": "optional-uuid"
}
```

The `content` field can be a plain string or a JSON-stringified array of content blocks (text, image, document) when files are attached.

**Response:**
```json
{
  "content": "This document discusses...",
  "conversation_id": "uuid"
}
```

## Configuration

### Supported File Types
- **Documents**: PDF, Word (.docx)
- **Images**: PNG, JPEG, GIF, WebP
- **Spreadsheets**: Excel (.xlsx), CSV
- **Presentations**: PowerPoint (.pptx)
- **Text**: Plain text (.txt)

### File Size Limits
- PDFs and images: 5MB per file
- Text-based files: 1MB per file
- Maximum files per message: 5

### Model Configuration
- Default model: `claude-haiku-4-5-20251001`
- Configurable via `ANTHROPIC_MODEL` environment variable in `server/.env`
- Max tokens: 2048

## Git Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `ci`, `build`

## Development Notes

- All data is stored client-side in IndexedDB (conversations, messages, and file blobs)
- The server is completely stateless — it only proxies requests to the Claude API
- File processing (text extraction, base64 encoding) happens in the browser before sending
- File selections persist per-conversation via localStorage and survive page reloads

## License

MIT

## Contributing

Contributions welcome! Please follow the Conventional Commits format for all commits and PR titles.
