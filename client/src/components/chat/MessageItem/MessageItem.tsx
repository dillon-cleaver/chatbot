import ReactMarkdown from 'react-markdown';
import type { Message } from '../../../types';
import styles from './MessageItem.module.css';

export interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps): React.JSX.Element {
  return (
    <div
      className={`${styles.message} ${
        message.role === 'user' ? styles.userMessage : styles.assistantMessage
      }`}
    >
      <div className={styles.messageContent}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
