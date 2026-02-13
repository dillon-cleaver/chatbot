import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { MessageSquare, Sun, Moon, HelpCircle } from "lucide-react";
import styles from "./Header.module.css";

export interface HeaderProps {
  onHistoryClick: () => void;
  onTitleClick: () => void;
  onHelpClick: () => void;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  onNavigateDown?: () => void;
}

export interface HeaderRef {
  focusNav: () => void;
}

export const Header = forwardRef<HeaderRef, HeaderProps>(function Header(
  {
    onHistoryClick,
    onTitleClick,
    onHelpClick,
    theme,
    onThemeToggle,
    onNavigateDown,
  },
  ref,
): React.JSX.Element {
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    focusNav: () => {
      helpButtonRef.current?.focus();
    },
  }));

  const handleHelpKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        historyButtonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onNavigateDown?.();
      }
    },
    [onNavigateDown],
  );

  const handleHistoryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        helpButtonRef.current?.focus();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        themeButtonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onNavigateDown?.();
      }
    },
    [onNavigateDown],
  );

  const handleThemeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        historyButtonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onNavigateDown?.();
      }
    },
    [onNavigateDown],
  );

  return (
    <header className={styles.header} role="banner">
      <div className={styles.headerLeft}>
        <a href="#message-input" className="skip-link visually-hidden">
          Skip to message input
        </a>
        <button
          className={styles.titleButton}
          onClick={onTitleClick}
          aria-label="Return to home"
        >
          <h1 className={styles.title}>Chatbot</h1>
        </button>
      </div>
      <nav className={styles.headerRight} aria-label="Main navigation">
        <button
          ref={helpButtonRef}
          className={styles.helpButton}
          onClick={onHelpClick}
          onKeyDown={handleHelpKeyDown}
          aria-label="Keyboard shortcuts"
        >
          <HelpCircle size={20} />
        </button>
        <button
          ref={historyButtonRef}
          className={styles.historyButton}
          onClick={onHistoryClick}
          onKeyDown={handleHistoryKeyDown}
          aria-label="View conversation history"
        >
          <MessageSquare size={20} />
        </button>
        <button
          ref={themeButtonRef}
          className={styles.themeToggle}
          onClick={onThemeToggle}
          onKeyDown={handleThemeKeyDown}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>
    </header>
  );
});
