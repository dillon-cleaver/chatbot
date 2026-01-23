# Chatbot

A simple chatbot powered by Claude.

## Prerequisites

- Node.js 18+
- pnpm
- Anthropic API key

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create `server/.env`:
   ```
   ANTHROPIC_API_KEY=your-api-key
   ```
4. Start the app:
   ```bash
   pnpm dev
   ```

The client runs at http://localhost:5173 and the server at http://localhost:3000.

## Project Structure

- `client/` - React frontend
- `server/` - Express API server
