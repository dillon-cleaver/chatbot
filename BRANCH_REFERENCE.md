# Branch Reference: `dillon/api-key-update` (PR #5)

> **Purpose:** This document catalogs every valuable change on the `dillon/api-key-update` branch, organized into logical issue groups for clean re-implementation as separate PRs. The multi-provider LLM feature (settings modal, provider system, crypto, etc.) is documented under [Excluded](#excluded--multi-provider-llm-system) and should **not** be re-implemented from this branch.

---

## Table of Contents

- [Issue 1: IndexedDB Client-Side Storage](#issue-1-indexeddb-client-side-storage)
- [Issue 2: Client-Side File Processing](#issue-2-client-side-file-processing)
- [Issue 3: Accessibility & Keyboard Navigation](#issue-3-accessibility--keyboard-navigation)
- [Issue 4: UI Polish & Design System](#issue-4-ui-polish--design-system)
- [Issue 5: Error Handling](#issue-5-error-handling)
- [Issue 6: Documentation & Config](#issue-6-documentation--config)
- [Excluded: Multi-Provider LLM System](#excluded-multi-provider-llm-system)
- [Known Bugs & Gotchas](#known-bugs--gotchas)
- [File Inventory](#file-inventory)

---

## Issue 1: IndexedDB Client-Side Storage

Moves all persistent data (conversations, messages, files) from server-side SQLite to client-side IndexedDB. The server becomes a stateless proxy with a single `POST /chat` endpoint.

### New Files

#### `client/src/services/indexedDBService.ts` (289 lines)

Full client-side storage layer using the `idb` library (typed wrapper around IndexedDB).

**Database schema** (`chatbot-db`, version 2):
- **`conversations`** store — keyPath: `id`, index: `updated_at`
  - Fields: `id`, `title`, `created_at` (epoch ms), `updated_at` (epoch ms), `message_count`
- **`messages`** store — keyPath: `id`, indexes: `conversation_id`, `timestamp`
  - Fields: `id`, `conversation_id`, `role`, `content`, `timestamp` (epoch ms)
- **`files`** store — keyPath: `id` (no indexes)
  - Fields: `id`, `original_name`, `stored_name`, `mime_type`, `size`, `uploaded_at` (epoch ms), `blob` (Blob)

**Migration strategy:** Version-gated `upgrade()` callback with `oldVersion < N` checks. V2 is currently identical to V1 (placeholder for future migrations).

**Internal DB types** (not exported — only used within the service):
```ts
interface ConversationDB { id: string; title: string; created_at: number; updated_at: number; message_count: number; }
interface MessageDB { id: string; conversation_id: string; role: "user" | "assistant"; content: string; timestamp: number; }
interface FileDB { id: string; original_name: string; stored_name: string; mime_type: string; size: number; uploaded_at: number; blob: Blob; }
```

**Exported API surface:**

| Function | Signature | Notes |
|----------|-----------|-------|
| `createConversation` | `(title: string) => Promise<Conversation>` | Generates UUID, sets timestamps |
| `addMessage` | `(conversationId, role, content) => Promise<Message>` | Also increments conversation `message_count` and `updated_at` |
| `loadConversation` | `(conversationId) => Promise<{id, title, messages, created_at, updated_at}>` | Messages sorted by timestamp ascending |
| `listConversations` | `() => Promise<Conversation[]>` | Sorted by `updated_at` descending |
| `deleteConversation` | `(conversationId) => Promise<void>` | Deletes conversation + all its messages |
| `deleteAllConversations` | `() => Promise<void>` | Clears both stores |
| `updateConversationTitle` | `(conversationId, title) => Promise<void>` | Updates title + `updated_at` |
| `addFile` | `(originalName, mimeType, size, blob) => Promise<UploadedFile>` | Stores Blob directly in IndexedDB |
| `listFiles` | `() => Promise<UploadedFile[]>` | Sorted by `uploaded_at` descending |
| `getFileBlob` | `(fileId) => Promise<{file: UploadedFile, blob: Blob}>` | Returns both metadata and blob |
| `deleteFileById` | `(fileId) => Promise<void>` | |

**Key design decisions:**
- Timestamps stored as epoch milliseconds internally, converted to ISO strings in return values
- `stored_name` generated as `${Date.now()}_${sanitized_original_name}`
- Files stored as raw Blobs (not base64) for efficiency
- `getDB()` is a private singleton-like factory (calls `openDB` each time but IDB handles caching)

**Client dependency:** `idb` ^8.0.0

### Modified Files

#### `client/src/hooks/useConversations.ts`

All `api.*` calls replaced with `indexedDB.*` calls:
- `api.fetchConversation()` → `indexedDB.loadConversation()`
- `api.fetchConversations()` → `indexedDB.listConversations()`
- `api.deleteConversation()` → `indexedDB.deleteConversation()`
- `api.deleteAllConversations()` → `indexedDB.deleteAllConversations()`
- `api.updateConversationTitle()` → `indexedDB.updateConversationTitle()`

Other changes:
- Added `onError?: (message: string) => void` prop — replaces `alert()` calls with callback
- `loadConversation` no longer uses AbortController signal for the IndexedDB call (no network request), but still checks `abortController.signal.aborted` before the call
- Conversation-not-found check updated: `err?.status === 404 || (err instanceof Error && err.message === "Conversation not found")`
- `useEffect` dependency for initial load changed from `// eslint-disable-next-line` to `[refreshConversations]`
- Cleanup check uses `abortControllerRef.current?.signal.aborted` instead of local `abortController.signal.aborted`

#### `client/src/hooks/useFileManager.ts`

All `api.*` calls replaced with `indexedDB.*` calls:
- `api.fetchFiles()` → `indexedDB.listFiles()`
- `api.uploadFiles(filesToUpload)` → loop calling `indexedDB.addFile()` for each file
- `api.deleteFile()` → `indexedDB.deleteFileById()`
- `api.viewFile()` → `indexedDB.getFileBlob()` + `URL.createObjectURL()` + `window.open()`

`viewFile` is now async and manages blob URL lifecycle:
- Creates object URL from blob
- Opens in new tab
- Revokes URL after 5 minutes via `setTimeout`
- Also revokes on `beforeunload` if popup window is accessible
- Logs warning if popup is blocked

#### `client/src/hooks/useChat.ts`

Major rewrite for IndexedDB integration. Key changes (default mode only; strip the `settings.mode` branching):
- Imports `indexedDB` service and `processFile` (and `generateUUID` instead of `crypto.randomUUID()`)
- `onConversationCreated` signature changed to `(conversationId: string | null) => void` (null = rollback)
- Creates conversation in IndexedDB on first message: title = first 50 chars of input (or 47 + "...")
- Saves user message to IndexedDB before API call
- Saves assistant message to IndexedDB after API call
- **Rollback pattern:** If API call fails on a newly-created conversation, deletes it from IndexedDB and calls `onConversationCreated(null)`

**Content blocks for file attachments:**
When `selectedFileIds.length > 0`, builds an array of content blocks:
```ts
const contentBlocks: Array<
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
> = [{ type: "text", text: input.trim() }];
```
For each file: reads blob from IndexedDB → creates `File` object → calls `processFile()` → appends appropriate content block.

Last message content is `JSON.stringify(contentBlocks)` — server expects string content and passes through to Claude.

**Note:** `api.sendChatMessage()` no longer accepts `fileIds` parameter (see api.ts below).

#### `client/src/utils/api.ts`

Stripped down to a single export:

```ts
export async function sendChatMessage(
  messages: Message[],
  conversationId: string | null,
): Promise<ChatResponse>
```

Changes:
- Removed all file API functions (`fetchFiles`, `uploadFiles`, `deleteFile`, `viewFile`)
- Removed all conversation API functions (`fetchConversations`, `fetchConversation`, `deleteConversation`, `deleteAllConversations`, `updateConversationTitle`)
- Removed `fileIds` parameter from `sendChatMessage`
- Added `VITE_API_URL` env var support: `const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"`
- Added 413 status handling ("File too large")
- Added fallback to `response.text()` if JSON parsing fails
- Added `TypeError` catch for network errors ("Network error: Check your connection")
- Wrapped in try/catch with proper error re-throwing

### Server Simplification

#### `server/index.js` (~85 lines, down from ~600)

**Removed:**
- `better-sqlite3` — no more SQLite database
- `multer` — no more file uploads
- `uuid` — uses `crypto.randomUUID()` (Node built-in) instead
- `fs`, `path`, `fileURLToPath` — no filesystem access
- `fileProcessor.js` import — file processing moved to client

**Removed endpoints:** `GET /conversations`, `GET /conversations/:id`, `POST /conversations`, `PATCH /conversations/:id`, `DELETE /conversations/:id`, `DELETE /conversations`, `POST /conversations/:id/messages`, `POST /upload`, `GET /files`, `GET /files/:id`, `DELETE /files/:id`, error handling middleware

**Remaining endpoint:** `POST /chat` only

**Key changes to `/chat`:**
- `express.json({ limit: "10mb" })` — increased from default to support base64 file content in messages
- No longer creates/updates conversations or messages in a database
- `conversation_id` from request used as-is, or generates new UUID via `randomUUID()` if not provided
- Model changed from `claude-sonnet-4-5` to `process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"`
- Response extraction changed: finds `text` block via `response.content.find(block => block.type === "text")` instead of `response.content[0].text`
- System prompt updated (Clerks + Office Space + Reality Bites reference)
- Added `server.on("error")` handler for `EADDRINUSE`

#### `server/fileProcessor.js` (DELETED)

302-line server-side file processor — entirely replaced by client-side `fileProcessor.ts`.

#### `server/package.json`

**Removed dependencies:**
- `better-sqlite3` (SQLite)
- `csv-parse` (CSV parsing)
- `mammoth` (Word docs)
- `multer` (file uploads)
- `pdf-parse` (PDF parsing)
- `uuid` (UUID generation)
- `xlsx` (Excel parsing)

**Remaining dependencies:** `@anthropic-ai/sdk`, `cors`, `dotenv`, `express`

#### `server/.env.example` (NEW)

```
# Anthropic API key for the default server-proxied Claude Haiku mode
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## Issue 2: Client-Side File Processing

Moves all file processing from the server to the client, with lazy-loaded libraries and local PDF.js worker.

### New Files

#### `client/src/services/fileProcessor.ts` (339 lines)

**Lazy loading pattern:**
```ts
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
// ...
async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  }
  return pdfjsLib;
}
```
Same pattern for `mammoth`, `XLSX`, `csvParse`. Libraries are loaded on first use, not at startup.

**PDF.js worker bundling:**
```ts
// @ts-ignore - Vite special syntax for worker imports
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
```
The `?url` import tells Vite to emit the worker file and return its URL. This avoids CDN dependencies and MITM risks.

**Size limits:**
| Type | Max Size | Max Extracted Text |
|------|----------|-------------------|
| Image | 5 MB | N/A (base64) |
| Document (PDF) | 5 MB | 200,000 chars |
| Text | 1 MB | 200,000 chars |
| CSV | 1 MB | 200,000 chars |
| Word (.docx) | 1 MB | 200,000 chars |
| Excel (.xlsx) | 1 MB | 200,000 chars |

**`ProcessedFile` return type:**
```ts
export interface ProcessedFile {
  type: "image" | "document" | "text";
  data: string; // base64 for images, extracted text for everything else
  mimeType?: string; // only set for images
}
```

**Processing functions:**

| Function | Input | Output Type | Notes |
|----------|-------|-------------|-------|
| `processImage` | Image files | `"image"` | Returns base64 via FileReader |
| `processPDF` | PDF files | `"text"` | Extracts text with page numbers, limits to 200 pages |
| `processText` | Plain text | `"text"` | Direct FileReader text read |
| `processCSV` | CSV files | `"text"` | Parsed with `csv-parse/sync`, formatted as markdown table, max 100 rows |
| `processWord` | .docx files | `"text"` | Extracted with mammoth `extractRawText` |
| `processExcel` | .xlsx files | `"text"` | Each sheet formatted as table via xlsx `sheet_to_json`, max 50 rows per sheet |

**Main router:** `processFile(file: File): Promise<ProcessedFile>` — routes by MIME type.

**Truncation behavior:** All text extractors check against `MAX_EXTRACTED_TEXT_CHARS` (200,000) and append `[Content truncated - document too large]` if exceeded.

**Helpers:**
- `fileToBase64(file)` — FileReader → base64, strips data URL prefix
- `fileToText(file)` — FileReader → text string

#### `client/src/vite-env.d.ts` (NEW)

```ts
/// <reference types="vite/client" />
```

Required for Vite's `import.meta.env` and `?url` import type support.

### Client Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `pdfjs-dist` | ^4.0.0 | PDF text extraction |
| `mammoth` | ^1.11.0 | Word document parsing |
| `xlsx` | ^0.18.5 | Excel spreadsheet parsing |
| `csv-parse` | ^5.5.0 | CSV parsing |
| `idb` | ^8.0.0 | Typed IndexedDB wrapper |

**Note:** `@anthropic-ai/sdk` was also added to client but only for the multi-provider feature — **do not include** when re-implementing this issue.

---

## Issue 3: Accessibility & Keyboard Navigation

### Modified Files

#### `client/src/hooks/useAnnouncer.ts`

**Reference counting for shared live regions:**
Multiple component instances can safely use the announcer without creating duplicate DOM elements or removing elements still needed by other instances.

```ts
let politeRefCount = 0;
let assertiveRefCount = 0;
```

On mount: checks for existing `#announcer-polite` / `#announcer-assertive` elements before creating. Increments ref count.

On unmount: decrements ref count. Only removes DOM elements when count reaches 0. Also nulls out refs.

**Magic number extracted:** `ANNOUNCEMENT_DELAY_MS = 50`

#### `client/src/hooks/useKeyboardShortcuts.ts`

**New shortcuts:**
| Shortcut | Handler | Notes |
|----------|---------|-------|
| `Ctrl/⌘ + S` | `onSettings?.()` | Open settings (strip this if not re-implementing settings) |
| `Shift + Ctrl/⌘ + O` | `onNewChat?.()` | Start new chat |

**New handler props:** `onSettings`, `onNewChat` added to `KeyboardShortcutHandlers` interface.

**Updated `KEYBOARD_SHORTCUTS` array** (for help modal display):
- "Send message (from anywhere)" → "Send message (even without input focus)"
- Added `Ctrl/⌘ + S` → "Open settings"
- Added `Shift + Ctrl/⌘ + O` → "Start new chat"

#### `client/src/components/ui/Modal/Modal.tsx`

**Focus trap fix:** Focusable element selector updated to exclude disabled elements:
```
Before: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
After:  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
```

Applied in three places: initial focus, focus trap (Tab key), and first-focusable fallback.

**Escape key:** Added `e.stopPropagation()` to prevent duplicate handling by global shortcuts.

#### `client/src/components/ui/AlertDialog/AlertDialog.tsx`

Same focus-trap selector fix as Modal (exclude disabled elements).

#### `client/src/components/ui/ConfirmDialog/ConfirmDialog.tsx`

Same focus-trap selector fix as Modal (exclude disabled elements).

#### `client/src/components/ui/Button/Button.tsx`

**Configurable `type` prop:** Button now accepts `type` prop (defaults to `"button"`) instead of hardcoding `type="button"`. Spread from `...props` was already passing it through, but now it's explicitly destructured with a default.

#### `client/src/components/layout/Header/Header.tsx`

**Arrow key navigation between header buttons:**

Navigation order: Help → History → Settings → Theme Toggle

Each button has a `handleXxxKeyDown` callback:
- `ArrowLeft` → focus previous button
- `ArrowRight` → focus next button
- `ArrowDown` → `onNavigateDown?.()` (focus chat input)

New button: **Settings** (`<Settings size={20} />` from lucide-react) — wire to settings modal or remove if not re-implementing settings.

New props: `onSettingsClick`, new ref: `settingsButtonRef`.

Removed: `aria-keyshortcuts="?"` from help button.

#### `client/src/components/layout/Header/Header.module.css`

Added `.settingsButton` to all existing rule groups (`.helpButton`, `.historyButton`, `.themeToggle`): base styles, hover, active, focus-visible, and mobile responsive.

#### `client/src/components/history/ConversationItem/ConversationItem.module.css`

Title input focus style updated:
- Added `position: relative; z-index: 1;` (raises above siblings)
- Removed `box-shadow: 0 0 0 2px var(--focus-shadow);`
- Kept `border-color: var(--focus-color)` and `outline: none`

#### `client/src/components/files/FileAttachModal/FileAttachModal.tsx`

- Removed verbose comments (code is self-documenting)
- Added "Files are stored and processed locally" hint at bottom of modal:
  ```tsx
  <div className={styles.localFilesHint}>
    <p>Files are stored and processed locally; only message content is sent to the server.</p>
  </div>
  ```

#### `client/src/components/files/FileAttachModal/FileAttachModal.module.css`

Added `.localFilesHint` styles (centered secondary text at bottom of file list).

---

## Issue 4: UI Polish & Design System

### `client/src/index.css`

**New CSS variable:**
```css
--focus-outline: var(--focus-outline-width) solid var(--focus-color);
```
Shorthand for consistent focus ring styling across components.

**Neobrutalist reset:**
```css
input, textarea, select, button {
  border-radius: 0;
  -webkit-appearance: none;
  appearance: none;
}
```
Forces sharp corners on all form elements to match the neobrutalist design.

### `client/src/components/ui/Button/Button.module.css`

Removed `border-radius: 4px` from `.button` — now inherits the global `border-radius: 0` reset.

### `client/src/components/chat/ChatMessages/ChatMessages.module.css`

**Loading animation (bouncing dots):**
```css
.loadingDots { display: inline-flex; gap: 4px; align-items: center; }
.loadingDots span { width: 8px; height: 8px; background-color: var(--button-bg); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite; }
.loadingDots span:nth-child(2) { animation-delay: 0.2s; }
.loadingDots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
```

**Assistant message typography:**
- Added `font-family: "Fraunces", serif`
- Font size `1rem` → `1.1rem`
- Added `font-weight: 500` and `letter-spacing: 0.02em`
- Added `display: flex; align-items: center; gap: 0.75rem;` (for loading dots layout)

### `client/src/components/chat/ChatMessages/ChatMessages.tsx`

- Loading message now uses bouncing dots animation + text:
  ```tsx
  <span className={styles.loadingDots} aria-hidden="true"><span /><span /><span /></span>
  {loadingMessage}
  ```
- Loading messages changed from ALL CAPS to Title Case: "Processing...", "Thinking...", "Calculating...", "One moment..."
- Added `aria-atomic="true"` to loading message container
- Added `onViewFile` prop passed through to `MessageItem`

### `client/src/components/chat/MessageItem/MessageItem.tsx`

- Added `onViewFile?: (fileId: string) => void | Promise<void>` prop
- `handleFileClick` now calls `onViewFile` instead of `api.viewFile` — decoupled from API module

### `client/src/components/chat/ChatInput/ChatInput.module.css`

- Gap values changed from `0.5rem` to `12px` (`.inputContainer`, `.inputRow`)
- Input focus style: removed double box-shadow, added `position: relative; z-index: 1`
- Mobile: `line-height: 34px` → `line-height: 1.5` (relative, supports multi-line)
- Mobile: `padding: 0 0.75rem` → `padding: 0.5rem 0.75rem` (added vertical padding)

### `client/src/components/chat/FileChipsDisplay/FileChipsDisplay.module.css`

File chip border changed from hardcoded `border: 3px solid #6c5ce7` to `border: var(--border-width) solid var(--border-color)` — uses design system variables.

### `client/src/components/chat/ChatContent/ChatContent.tsx`

- Timing constants extracted: `MODAL_CLOSE_ANIMATION_MS = 150`, `FOCUS_AFTER_NEW_CHAT_MS = 50`
- Auto-focus input after modal close (in addition to scroll)
- `handleConversationCreated` handles null (rollback) — stays on current page

### `client/src/components/chat/ChatContent/ChatContent.module.css`

**Mode indicator** (may not be needed without multi-provider):
```css
.modeIndicator { padding: 0.5rem 1rem; background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color); font-size: 0.875rem; color: var(--text-secondary); text-align: center; }
```

### `.gitignore`

Added:
- `.pnpm-store/`
- `*.db` (SQLite database files)
- `server/uploads/` (legacy upload directory)

---

## Issue 5: Error Handling

### New Files

#### `client/src/utils/errors.ts` (105 lines)

**`ValidationError` class:**
```ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

**`validateMessages(messages: Message[]): void`** — Validates messages array before API call:
- Must be a non-empty array
- Each message must have valid `role` ("user" | "assistant")
- Each message must have non-empty string `content`
- Throws `ValidationError` with index-specific messages

**`getUserFriendlyError(error: unknown): string`** — Converts technical errors to user-facing messages:
- `ValidationError` → returns message as-is
- Strips technical prefixes (`Error:`, `TypeError:`, etc.)
- Pattern matching for common errors:
  - "failed to fetch" / "networkerror" → "Connection error: Check your network and try again"
  - "timeout" / "timed out" → "Request timed out. Please try again"
  - "401" / "unauthorized" → "Authentication failed. Check your API key"
  - "403" / "forbidden" → "Access denied. Check your API key permissions"
  - "404" / "not found" → "Resource not found. Check your configuration"
  - "429" / "too many requests" → "Rate limit exceeded. Please wait and try again"
  - "500" / "internal server error" → "Server error. Please try again later"
  - "503" / "service unavailable" → "Service temporarily unavailable. Please try again later"
- Fallback: "An unexpected error occurred"

#### `client/src/constants/errorMessages.ts` (58 lines)

Standardized error message constants:

```ts
export const ERROR_MESSAGES = {
  ENCRYPTION_FAILED, DECRYPTION_FAILED,           // Encryption (multi-provider only)
  SETTINGS_LOAD_FAILED, SETTINGS_SAVE_FAILED, INVALID_SETTINGS, // Settings (multi-provider only)
  API_KEY_MISSING, API_CONNECTION_FAILED, API_REQUEST_FAILED,
  FILE_UPLOAD_FAILED, FILE_DELETE_FAILED, FILE_PROCESS_FAILED, FILE_TOO_LARGE, FILE_TYPE_UNSUPPORTED,
  CONVERSATION_LOAD_FAILED, CONVERSATION_DELETE_FAILED, CONVERSATION_CREATE_FAILED,
  MESSAGE_SEND_FAILED, MESSAGE_EMPTY,
  NETWORK_ERROR, NETWORK_TIMEOUT,
  PROVIDER_NOT_CONFIGURED, PROVIDER_INVALID, MODEL_NOT_SELECTED, // Multi-provider only
  INDEXEDDB_ERROR, INDEXEDDB_NOT_SUPPORTED,
} as const;

export const ERROR_MESSAGE_BUILDERS = {
  apiError: (message: string) => `API error: ${message}`,
  providerError: (provider: string, message: string) => `${provider} error: ${message}`,
  fileError: (filename: string, message: string) => `Error with ${filename}: ${message}`,
} as const;
```

**Note:** Some constants are only used by the multi-provider system. When re-implementing, include only the ones relevant to the features being shipped.

---

## Issue 6: Documentation & Config

### `CLAUDE.md`

- Added keyboard shortcuts: `Ctrl/⌘+Y` (history), `Ctrl/⌘+S` (settings), `Shift+Ctrl/⌘+O` (new chat)
- Updated arrow key description: "Navigate within file rows" → "Navigate header buttons or row actions"
- Added Accessibility section (skip link, landmarks, ARIA, roving tabindex, reduced motion, focus indicators)
- Added Security section (API key storage, network security) — mostly multi-provider relevant

### `server/CLAUDE.md`

- Updated API docs: request now accepts `conversation_id`, response includes it
- Added note: "The server is stateless: no database, no file storage"
- Model updated: `claude-sonnet-4-5` → `claude-haiku-4-5-20251001`

### `README.md`

Comprehensive rewrite reflecting new architecture:
- Updated feature list (IndexedDB, client-side processing)
- Added keyboard shortcuts table
- Added accessibility section
- Updated architecture diagram (stateless server, IndexedDB)
- Updated file upload and chat-with-files flow descriptions
- Removed all server-side file/conversation API endpoint docs
- Updated tech stack (removed server-side parsing libraries)
- Updated directory tree
- Added deployment section (`VITE_API_URL` env var)

### `SECURITY.md` (NEW — multi-provider focused)

Mostly documents the crypto/encryption system for the multi-provider feature. **Skip re-implementing this file** unless shipping the settings/provider system. Some notes about local PDF.js workers and file processing are reusable.

---

## Excluded: Multi-Provider LLM System

The following files implement a client-side multi-provider LLM system (Anthropic, Google, OpenAI) with encrypted API key storage and a settings UI. This feature was too buggy to ship and should **NOT** be re-implemented from this branch.

**Files (all new, all to be excluded):**

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/components/settings/SettingsModal.tsx` | 516 | Settings UI with mode selection, provider config, API key input |
| `client/src/components/settings/SettingsModal.module.css` | 310 | Settings modal styles |
| `client/src/components/settings/SettingsModal.module.css.d.ts` | 24 | CSS Modules type declarations |
| `client/src/components/settings/index.ts` | 2 | Barrel export |
| `client/src/hooks/useSettings.ts` | 88 | React context for settings state |
| `client/src/services/llmService.ts` | 44 | Provider factory and interface |
| `client/src/services/providers/anthropicProvider.ts` | 121 | Anthropic client-side provider |
| `client/src/services/providers/googleProvider.ts` | 195 | Google AI client-side provider |
| `client/src/services/providers/openaiProvider.ts` | 167 | OpenAI client-side provider |
| `client/src/types/settings.ts` | 104 | Settings types, model definitions |
| `client/src/utils/crypto.ts` | 145 | AES-GCM encryption for API keys |

**When re-implementing other issues, strip these references:**
- `client/src/App.tsx` — Remove `SettingsProvider` wrapper
- `client/src/hooks/useChat.ts` — Remove `useSettings` import, `settings.mode` branching, and the entire `else` (custom mode) branch. Keep only the `if` branch (default mode) code, but remove the `if (settings.mode === "default")` condition itself
- `client/src/components/chat/ChatContent/ChatContent.tsx` — Remove `SettingsModal` import/state/rendering, `useSettings` import, `SUPPORTED_MODELS` import, `.modeIndicator` div, `onSettings` handler, `onSettingsClick` prop
- `client/src/hooks/useKeyboardShortcuts.ts` — Remove `onSettings` handler and `Ctrl/⌘+S` shortcut
- `client/src/components/layout/Header/Header.tsx` — Remove settings button (keep the arrow-key navigation pattern but rewire without settings)
- `client/src/constants/errorMessages.ts` — Remove `ENCRYPTION_*`, `SETTINGS_*`, `PROVIDER_*`, `MODEL_*` constants
- `client/package.json` — Remove `@anthropic-ai/sdk` from client dependencies (keep in server)

---

## Known Bugs & Gotchas

### 1. `@ts-ignore` should be `@ts-expect-error`
**File:** `client/src/services/fileProcessor.ts`, line 9
```ts
// @ts-ignore - Vite special syntax for worker imports
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
```
Use `@ts-expect-error` instead — it will error if the suppression is no longer needed, preventing stale suppressions.

### 2. Content blocks: server expects string, client JSON.stringifys array
**File:** `client/src/hooks/useChat.ts`

When files are attached, the last message's `content` is set to `JSON.stringify(contentBlocks)`. The server passes this through to Claude as-is. Claude's API accepts both string and array content, but the server's `express.json()` middleware parses the outer JSON — the inner content blocks remain a JSON string. Verify this works end-to-end; it may need the server to `JSON.parse()` the content if it's a string that looks like an array.

### 3. ConversationItem Enter handler
**File:** `client/src/components/history/ConversationItem/ConversationItem.tsx`

If there's a `link?.click()` pattern in keyboard handlers, replace it with direct navigation via `navigate()` or callback — `click()` on programmatically created/found links is unreliable across browsers.

### 4. `alert()` calls replaced but check for remnants
The branch replaced `alert()` with `onError?.()` callbacks in `useConversations.ts`, but the `confirm()` call in `deleteConversation` was kept. Consider replacing with a proper confirm dialog component for consistency.

### 5. `useConversations` AbortController for IndexedDB
The `loadConversation` function still creates an AbortController and uses a minimum loading time (`400ms`), which made sense for network requests but may be unnecessary overhead for local IndexedDB reads. Consider simplifying.

---

## File Inventory

All 52 files changed on the branch, categorized:

### Issue 1: IndexedDB Storage (10 files)
| Status | File | Issue Notes |
|--------|------|-------------|
| NEW | `client/src/services/indexedDBService.ts` | Core storage service |
| MOD | `client/src/hooks/useConversations.ts` | Switched to IndexedDB |
| MOD | `client/src/hooks/useFileManager.ts` | Switched to IndexedDB |
| MOD | `client/src/hooks/useChat.ts` | IndexedDB + rollback (strip multi-provider) |
| MOD | `client/src/utils/api.ts` | Stripped to single endpoint |
| MOD | `server/index.js` | Stateless proxy |
| DEL | `server/fileProcessor.js` | Replaced by client-side |
| MOD | `server/package.json` | Removed dependencies |
| NEW | `server/.env.example` | Example env file |
| MOD | `pnpm-lock.yaml` | Dependency changes |

### Issue 2: Client-Side File Processing (3 files)
| Status | File | Notes |
|--------|------|-------|
| NEW | `client/src/services/fileProcessor.ts` | Core processor |
| NEW | `client/src/vite-env.d.ts` | Vite type declarations |
| MOD | `client/package.json` | New deps (also `idb` for Issue 1) |

### Issue 3: Accessibility & Keyboard Navigation (11 files)
| Status | File | Notes |
|--------|------|-------|
| MOD | `client/src/hooks/useAnnouncer.ts` | Reference counting |
| MOD | `client/src/hooks/useKeyboardShortcuts.ts` | New shortcuts (strip settings) |
| MOD | `client/src/components/ui/Modal/Modal.tsx` | Focus trap fix, escape propagation |
| MOD | `client/src/components/ui/AlertDialog/AlertDialog.tsx` | Focus trap fix |
| MOD | `client/src/components/ui/ConfirmDialog/ConfirmDialog.tsx` | Focus trap fix |
| MOD | `client/src/components/ui/Button/Button.tsx` | Configurable type prop |
| MOD | `client/src/components/layout/Header/Header.tsx` | Arrow key nav (strip settings) |
| MOD | `client/src/components/layout/Header/Header.module.css` | Settings button styles |
| MOD | `client/src/components/history/ConversationItem/ConversationItem.module.css` | Focus styles |
| MOD | `client/src/components/files/FileAttachModal/FileAttachModal.tsx` | Local files hint |
| MOD | `client/src/components/files/FileAttachModal/FileAttachModal.module.css` | Hint styles |

### Issue 4: UI Polish (8 files)
| Status | File |
|--------|------|
| MOD | `client/src/index.css` |
| MOD | `client/src/components/ui/Button/Button.module.css` |
| MOD | `client/src/components/chat/ChatMessages/ChatMessages.module.css` |
| MOD | `client/src/components/chat/ChatMessages/ChatMessages.tsx` |
| MOD | `client/src/components/chat/ChatInput/ChatInput.module.css` |
| MOD | `client/src/components/chat/MessageItem/MessageItem.tsx` |
| MOD | `client/src/components/chat/FileChipsDisplay/FileChipsDisplay.module.css` |
| MOD | `client/src/components/chat/ChatContent/ChatContent.module.css` |

### Issue 5: Error Handling (2 files)
| Status | File |
|--------|------|
| NEW | `client/src/utils/errors.ts` |
| NEW | `client/src/constants/errorMessages.ts` |

### Issue 6: Documentation & Config (5 files)
| Status | File |
|--------|------|
| MOD | `CLAUDE.md` |
| MOD | `server/CLAUDE.md` |
| MOD | `README.md` |
| NEW | `SECURITY.md` (multi-provider focused — skip or strip) |
| MOD | `.gitignore` |

Note: `server/.env.example` is listed under Issue 1.

### Cross-cutting (touches multiple issues)
| Status | File | Issues |
|--------|------|--------|
| MOD | `client/src/App.tsx` | 1 (SettingsProvider — strip), wiring |
| MOD | `client/src/components/chat/ChatContent/ChatContent.tsx` | 1, 3, 4 (strip settings) |

### Excluded: Multi-Provider (11 files)
| Status | File |
|--------|------|
| NEW | `client/src/components/settings/SettingsModal.tsx` |
| NEW | `client/src/components/settings/SettingsModal.module.css` |
| NEW | `client/src/components/settings/SettingsModal.module.css.d.ts` |
| NEW | `client/src/components/settings/index.ts` |
| NEW | `client/src/hooks/useSettings.ts` |
| NEW | `client/src/services/llmService.ts` |
| NEW | `client/src/services/providers/anthropicProvider.ts` |
| NEW | `client/src/services/providers/googleProvider.ts` |
| NEW | `client/src/services/providers/openaiProvider.ts` |
| NEW | `client/src/types/settings.ts` |
| NEW | `client/src/utils/crypto.ts` |

**Total: 52 files** (10 + 3 + 11 + 8 + 2 + 5 + 2 cross-cutting + 11 excluded = 52)
