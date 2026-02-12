import ReactMarkdown from 'react-markdown';
import type { Message } from '../../../types';
import { FileChip } from '../FileChip/FileChip';
import styles from './MessageItem.module.css';

export interface MessageItemProps {
  message: Message;
  onViewFile?: (fileId: string) => void | Promise<void>;
}

export function MessageItem({ message, onViewFile }: MessageItemProps): React.JSX.Element {
  const handleFileClick = (fileId: string) => {
    onViewFile?.(fileId);
  };

  const messageLabel = message.role === 'user' ? 'User message' : 'Assistant message';

  return (
    <article
      className={`${styles.message} ${
        message.role === 'user' ? styles.userMessage : styles.assistantMessage
      }`}
      role="article"
      aria-label={messageLabel}
    >
      <div className={styles.messageContent}>
        <ReactMarkdown>
          {typeof message.content === 'string'
            ? message.content
            : message.content.find(b => b.type === 'text')?.text ?? ''}
        </ReactMarkdown>
      </div>

      {message.files && message.files.length > 0 && (
        <div className={styles.attachedFiles} role="region" aria-label="Attached files">
          <div className={styles.attachedLabel} aria-hidden="true">
            Attached
          </div>
          <div className={styles.fileChips}>
            {message.files.map((file) => (
              <FileChip
                key={file.id}
                file={file}
                onClick={() => handleFileClick(file.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
