import type { Message } from '../../../types';
import { MessageItem } from '../MessageItem/MessageItem';
import { useScrollTrack } from '../../../hooks/useScrollTrack';
import { ScrollBar } from '../../ui/ScrollBar/ScrollBar';
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
  const { containerRef, isScrolling, scrollThumbStyle } = useScrollTrack({
    dependencies: [messages],
  });

  return (
    <div className={styles.messagesWrapper}>
      <div
        ref={containerRef}
        className={styles.messages}
      >
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
      <ScrollBar isVisible={isScrolling} thumbStyle={scrollThumbStyle} />
    </div>
  );
}
