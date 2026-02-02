import ReactMarkdown from 'react-markdown';
import type { Message } from '../../../types';
import { FileChip } from '../FileChip/FileChip';
import * as api from '../../../utils/api';
import styles from './MessageItem.module.css';

export interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps): React.JSX.Element {
  const handleFileClick = (fileId: string) => {
    api.viewFile(fileId);
  };

  return (
    <div
      className={`${styles.message} ${
        message.role === 'user' ? styles.userMessage : styles.assistantMessage
      }`}
    >
      <div className={styles.messageContent}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {message.files && message.files.length > 0 && (
        <div className={styles.attachedFiles}>
          <div className={styles.attachedLabel}>Attached</div>
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
    </div>
  );
}
