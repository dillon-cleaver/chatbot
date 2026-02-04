import { useMemo } from 'react';
import type { Message } from '../../../types';
import { MessageItem } from '../MessageItem/MessageItem';
import styles from './ChatMessages.module.css';

const LOADING_MESSAGES = [
  'PROCESSING...',
  'LOADING...',
  'CALCULATING...',
  'HOLD ON...',
];

export interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatMessages({
  messages,
  isLoading,
  messagesEndRef,
}: ChatMessagesProps): React.JSX.Element {
  // Pick a random loading message when loading starts
  const loadingMessage = useMemo(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
    [isLoading] // New random message each time loading state changes
  );

  return (
    <div className={styles.messagesWrapper}>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageContent}>{loadingMessage}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
