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
- Persistent storage using SQLite database
- View uploaded files in modal interface
- Delete files when no longer needed

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

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │ ◄─────► │  Express Backend │
│   (Vite + CSS)  │  HTTP   │   (Node + ESM)   │
└─────────────────┘         └──────────────────┘
                                      │
                            ┌─────────┴─────────┐
                            ▼                   ▼
                    ┌──────────────┐    ┌─────────────┐
                    │   SQLite DB  │    │ Anthropic   │
                    │ (File Metadata)│   │  Claude API │
                    └──────────────┘    └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ File System  │
                    │  (uploads/)  │
                    └──────────────┘
```

## How It Works

### File Upload Flow
1. User selects files via the 📎 button in the header
2. Files uploaded to Express server via `multer`
3. Metadata stored in SQLite database (original name, MIME type, size, upload timestamp)
4. Physical files saved to `server/uploads/` directory
5. Files appear in modal for selection

### Chat with Files Flow
1. User checks boxes next to files in the modal to select them
2. Selected files appear as "chips" below the chat input
3. User types a message and clicks Send
4. Frontend sends message + array of selected file IDs to backend
5. Backend processes each file based on type:
   - **PDFs & Images**: Encoded as base64 and sent as `document` or `image` content blocks
   - **Text files**: Read and sent as `text` content blocks
   - **Office docs**: Parsed and extracted text sent as `text` content blocks
6. All content blocks (message text + file contents) sent to Claude API
7. Claude analyzes the message in context of the files
8. Response rendered with markdown formatting
9. Selected files cleared for next message

### File Processing Details

**PDF & Image Processing** (`fileProcessor.js:14-45`)
```javascript
// PDFs sent as native document blocks
{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: '...' }}

// Images sent as vision-compatible blocks
{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: '...' }}
```

**Text Extraction** (`fileProcessor.js:106-177`)
- Word docs parsed with `mammoth` library
- Excel sheets converted to tables with `xlsx`
- CSV parsed with `csv-parse` into formatted tables
- Plain text read directly

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
├── server/              # Express 5 backend
│   ├── index.js              # Express server + API endpoints
│   ├── fileProcessor.js      # File type processing logic
│   ├── package.json
│   ├── .env                  # Environment variables (create this)
│   ├── database.db           # SQLite database (auto-created)
│   └── uploads/              # File storage (auto-created)
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
- **Anthropic SDK** - Claude API client
- **better-sqlite3** - Database for file metadata
- **multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **mammoth** - Word document parsing
- **xlsx** - Excel spreadsheet parsing
- **csv-parse** - CSV file parsing

## API Endpoints

### `POST /chat`
Send a message to Claude, optionally with attached files.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What's in this document?" }
  ],
  "fileIds": ["uuid-1", "uuid-2"]  // optional, max 5
}
```

**Response:**
```json
{
  "content": "This document discusses..."
}
```

### `POST /upload`
Upload one or more files.

**Request:** `multipart/form-data` with `files` field

**Response:**
```json
[
  {
    "id": "uuid",
    "original_name": "document.pdf",
    "mime_type": "application/pdf",
    "size": 102400,
    "uploaded_at": "2024-01-20T10:30:00.000Z"
  }
]
```

### `GET /files`
List all uploaded files.

### `GET /files/:id`
View/download a specific file.

### `DELETE /files/:id`
Delete a file from storage and database.

## Configuration

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
- Model: `claude-sonnet-4-5`
- Max tokens: 2048
- Adjustable in `server/index.js:136`

## Git Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `ci`, `build`

## Development Notes

- The SQLite database (`database.db`) is created automatically on first run
- Uploaded files persist in `server/uploads/` directory
- The `uploads/` directory is created automatically if it doesn't exist
- File selections are cleared after each message to prevent accidental context pollution
- Conversation history is maintained in browser memory (clears on refresh)

## Future Enhancements

- [ ] Persistent conversation history across sessions
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
