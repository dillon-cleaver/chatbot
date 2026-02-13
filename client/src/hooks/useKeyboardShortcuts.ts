import { useEffect, useCallback } from "react";

export interface KeyboardShortcutHandlers {
  onSend?: () => void;
  onAttach?: () => void;
  onHistory?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
  onNewChat?: () => void;
}

export interface UseKeyboardShortcutsOptions {
  handlers: KeyboardShortcutHandlers;
  enabled?: boolean;
}

/**
 * Global keyboard shortcuts hook for the chat application.
 *
 * Shortcuts:
 * - Ctrl/Cmd + Enter: Send message (alternative to Enter in textarea)
 * - Shift + Ctrl/Cmd + U: Open file attach modal
 * - Shift + Ctrl/Cmd + Y: Open chat history
 * - Shift + Ctrl/Cmd + O: Start new chat
 * - Escape: Close modals / return focus to input
 * - ?: Show keyboard shortcuts help (when not typing)
 */
export function useKeyboardShortcuts({
  handlers,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl/Cmd + Enter: Send message
      if (isMod && e.key === "Enter") {
        e.preventDefault();
        handlers.onSend?.();
        return;
      }

      // Shift + Ctrl/Cmd + U: Open attach modal
      if (isMod && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        handlers.onAttach?.();
        return;
      }

      // Shift + Ctrl/Cmd + Y: Open history modal
      if (isMod && e.shiftKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handlers.onHistory?.();
        return;
      }

      // Shift + Ctrl/Cmd + O: Start new chat
      // Note: Normalize to lowercase since e.key casing varies across platforms when Shift is held
      if (isMod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handlers.onNewChat?.();
        return;
      }

      // Escape: Close modals / return focus (skip if already handled by a modal)
      if (e.key === "Escape" && !e.defaultPrevented) {
        handlers.onEscape?.();
        return;
      }

      // ?: Show help (only when not typing in an input)
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        handlers.onHelp?.();
        return;
      }
    },
    [enabled, handlers],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * List of all keyboard shortcuts for display in help modal
 */
export const KEYBOARD_SHORTCUTS = [
  {
    keys: ["Enter"],
    description: "Send message (when in input)",
  },
  {
    keys: ["Shift", "Enter"],
    description: "New line in message",
  },
  {
    keys: ["Ctrl/⌘", "Enter"],
    description: "Send message (even without input focus)",
  },
  {
    keys: ["Shift", "Ctrl/⌘", "U"],
    description: "Open file attach modal",
  },
  {
    keys: ["Shift", "Ctrl/⌘", "Y"],
    description: "Open chat history",
  },
  {
    keys: ["Shift", "Ctrl/⌘", "O"],
    description: "Start new chat",
  },
  {
    keys: ["Escape"],
    description: "Close modal / toggle input focus",
  },
  {
    keys: ["?"],
    description: "Show keyboard shortcuts",
  },
  {
    keys: ["↑", "↓"],
    description: "Navigate lists and modal sections",
  },
  {
    keys: ["←", "→"],
    description: "Navigate to View/Delete buttons in file rows",
  },
  {
    keys: ["Home", "End"],
    description: "Jump to first/last list item",
  },
  {
    keys: ["Space/Enter"],
    description: "Toggle selection or activate button",
  },
] as const;
