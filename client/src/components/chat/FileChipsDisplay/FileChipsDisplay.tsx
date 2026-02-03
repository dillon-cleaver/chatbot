import type { UploadedFile } from '../../../types';
import { FileChip } from '../FileChip/FileChip';
import { Button } from '../../ui/Button';
import styles from './FileChipsDisplay.module.css';

export interface FileChipsDisplayProps {
  files: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  onClearAll?: () => void;
}

export function FileChipsDisplay({
  files,
  onRemoveFile,
  onClearAll,
}: FileChipsDisplayProps): React.JSX.Element | null {
  if (files.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.selectionBox}>
        <div className={styles.selectionInfo}>
          <span className={styles.count}>
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </span>
          <span className={styles.helperText}>
            Sent with next message only. Message history provides context for follow-ups.
          </span>
        </div>
        {onClearAll && (
          <Button variant="message" destructive className={styles.clearButton} onClick={onClearAll}>
            Clear
          </Button>
        )}
      </div>
      <div className={styles.fileChipsContainer}>
        {files.map(file => (
          <FileChip
            key={file.id}
            file={file}
            onRemove={() => onRemoveFile(file.id)}
          />
        ))}
      </div>
    </div>
  );
}
