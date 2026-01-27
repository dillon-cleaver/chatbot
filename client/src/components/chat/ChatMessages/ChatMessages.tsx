import type { Message } from '../../../types';
import { MessageItem } from '../MessageItem/MessageItem';
import styles from './ChatMessages.module.css';

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
  return (
    <div className={styles.messages}>
      {messages.length === 0 && (
        <div className={styles.emptyState}>
          <p>Start a conversation with the chatbot!</p>
        </div>
      )}
      {messages.map((msg, idx) => (
        <MessageItem key={idx} message={msg} />
      ))}
      {isLoading && (
        <div className={`${styles.message} ${styles.assistantMessage}`}>
          <div className={styles.messageContent}>Thinking...</div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
