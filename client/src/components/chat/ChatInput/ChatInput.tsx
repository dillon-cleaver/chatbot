import type { UploadedFile } from '../../../types';
import { FileChip } from '../FileChip/FileChip';
import styles from './ChatInput.module.css';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAttachClick: () => void;
  isLoading: boolean;
  selectedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  onAttachClick,
  isLoading,
  selectedFiles,
  onRemoveFile,
}: ChatInputProps): React.JSX.Element {
  return (
    <div className={styles.inputContainer}>
      {selectedFiles.length > 0 && (
        <div className={styles.fileChipsContainer}>
          {selectedFiles.map(file => (
            <FileChip
              key={file.id}
              file={file}
              onRemove={() => onRemoveFile(file.id)}
            />
          ))}
        </div>
      )}
      <div className={styles.inputRow}>
        <button
          className={styles.attachButton}
          onClick={onAttachClick}
          title="Attach files"
        >
          📁
        </button>
        <textarea
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className={styles.sendButton}
          onClick={onSend}
          disabled={isLoading || !value.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
