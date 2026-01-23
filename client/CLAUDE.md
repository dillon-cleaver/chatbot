# Client

React 19 chat interface built with Vite.

## Stack

- React 19
- Vite 7
- CSS Modules
- pnpm

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm lint     # Run ESLint
pnpm preview  # Preview production build
```

## Structure

- `src/App.jsx` - Main chat component with message state, theme toggle, and API calls
- `src/App.module.css` - Component styles using CSS variables for theming
- `src/index.css` - Global styles and theme variable definitions
- `src/main.jsx` - React entry point

## Notes

- Connects to backend at `http://localhost:3000/chat`
- Theme toggle sets `data-theme` attribute on `document.documentElement`
- Messages array is sent with each request to maintain conversation context
