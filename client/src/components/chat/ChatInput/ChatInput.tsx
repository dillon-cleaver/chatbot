import { Paperclip } from 'lucide-react';
import type { UploadedFile } from '../../../types';
import { useAutoResizeTextarea } from '../../../hooks/useAutoResizeTextarea';
import { FileChipsDisplay } from '../FileChipsDisplay/FileChipsDisplay';
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
  onClearAllFiles?: () => void;
  showTopBorder?: boolean;
  isModalOpen?: boolean;
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
  onClearAllFiles,
  showTopBorder = true,
  isModalOpen = false,
}: ChatInputProps): React.JSX.Element {
  const { textareaRef } = useAutoResizeTextarea({ value });

  return (
    <div className={`${styles.inputContainer} ${showTopBorder ? styles.withBorder : ''}`}>
      {!isModalOpen && <FileChipsDisplay files={selectedFiles} onRemoveFile={onRemoveFile} onClearAll={onClearAllFiles} />}
      <div className={styles.inputRow}>
        <button
          className={styles.attachButton}
          onClick={onAttachClick}
          title="Attach files"
        >
          <Paperclip size={20} />
          {selectedFiles.length > 0 && (
            <span className={styles.badge}>{selectedFiles.length}</span>
          )}
        </button>
        <textarea
          ref={textareaRef}
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
