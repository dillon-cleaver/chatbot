import { Check } from 'lucide-react';
import type { UploadedFile } from '../../../types';
import { FileChip } from '../FileChip/FileChip';
import { Button } from '../../ui/Button';
import styles from './FileChipsDisplay.module.css';

export interface FileChipsDisplayProps {
  files: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  onClearAll?: () => void;
  onAdd?: () => void;
  showFileChips?: boolean;
  showHelperText?: boolean;
}

export function FileChipsDisplay({
  files,
  onRemoveFile,
  onClearAll,
  onAdd,
  showFileChips = true,
  showHelperText = true,
}: FileChipsDisplayProps): React.JSX.Element | null {
  if (files.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.selectionBox}>
        <div className={styles.selectionInfo}>
          <div className={styles.count}>
            <Check size={20} />
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </div>
          {showHelperText && (
            <span className={styles.helperText}>
              Sent with next message only. Message history provides context for follow-ups.
            </span>
          )}
        </div>
        <div className={styles.buttonGroup}>
          {onAdd && (
            <Button variant="message" className={styles.addButton} onClick={onAdd}>
              Attach
            </Button>
          )}
          {onClearAll && (
            <Button variant="message" destructive className={styles.clearButton} onClick={onClearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {showFileChips && (
        <div className={styles.fileChipsContainer}>
          {files.map(file => (
            <FileChip
              key={file.id}
              file={file}
              onRemove={() => onRemoveFile(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
