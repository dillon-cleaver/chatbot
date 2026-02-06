import { useState } from "react";
import type { Message } from "../../../types";
import { MessageItem } from "../MessageItem/MessageItem";
import styles from "./ChatMessages.module.css";

const LOADING_MESSAGES = [
  "Processing...",
  "Thinking...",
  "Calculating...",
  "One moment...",
];

export interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onViewFile?: (fileId: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  messagesEndRef,
  onViewFile,
}: ChatMessagesProps): React.JSX.Element {
  // Pick a random loading message when loading starts
  const [loadingMessage] = useState(() => {
    return LOADING_MESSAGES[
      Math.floor(Math.random() * LOADING_MESSAGES.length)
    ];
  });

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
            aria-atomic="true"
          >
            <div className={styles.messageContent}>
              <span className={styles.loadingDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              {loadingMessage}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
