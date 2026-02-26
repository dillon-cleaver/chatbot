import { useState } from "react";
import type { Message } from "../../../types";
import { MessageItem } from "../MessageItem/MessageItem";
import styles from "./ChatMessages.module.css";

const LOADING_MESSAGES = [
  "PROCESSING...",
  "LOADING...",
  "CALCULATING...",
  "HOLD ON...",
];

const TOOL_LOADING_MESSAGES: Record<string, string> = {
  web_search: "SURFING THE WEB...",
  fetch_url: "DOWNLOADING PAGE...",
};

export interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  activeToolUse?: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onViewFile?: (fileId: string) => void | Promise<void>;
}

export function ChatMessages({
  messages,
  isLoading,
  activeToolUse,
  messagesEndRef,
  onViewFile,
}: ChatMessagesProps): React.JSX.Element {
  // Pick a random loading message when loading starts
  const [loadingMessage] = useState(() => {
    return LOADING_MESSAGES[
      Math.floor(Math.random() * LOADING_MESSAGES.length)
    ];
  });

  const displayMessage = activeToolUse
    ? (TOOL_LOADING_MESSAGES[activeToolUse] ?? "USING TOOLS...")
    : loadingMessage;

  return (
    <div className={styles.messagesWrapper}>
      <div
        className={styles.messages}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} onViewFile={onViewFile} />
        ))}
        {isLoading && (
          <div
            className={`${styles.message} ${styles.assistantMessage}`}
            role="status"
            aria-live="polite"
          >
            <div className={styles.messageContent}>{displayMessage}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
