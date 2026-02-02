import type { UploadedFile } from '../../../types';
import { getFileIcon } from '../../../utils/fileUtils';
import { Button } from '../../ui/Button';
import styles from './FileChip.module.css';

export interface FileChipProps {
  file: UploadedFile;
  onRemove: () => void;
}

export function FileChip({ file, onRemove }: FileChipProps): React.JSX.Element {
  return (
    <div className={styles.fileChip}>
      <span className={styles.fileChipIcon}>{getFileIcon(file.mime_type)}</span>
      <span className={styles.fileChipName}>{file.original_name}</span>
      <Button variant="message" destructive className={styles.fileChipRemove} onClick={onRemove}>
        ×
      </Button>
    </div>
  );
}
