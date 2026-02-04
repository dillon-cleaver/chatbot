import { X } from 'lucide-react';
import type { UploadedFile } from '../../../types';
import { getFileIcon, formatBytes, getFileTypeLabel } from '../../../utils/fileUtils';
import { Button } from '../../ui/Button';
import styles from './FileItem.module.css';

export interface FileItemProps {
  file: UploadedFile;
  isSelected: boolean;
  onToggleSelection: () => void;
  onView: () => void;
  onDelete: () => void;
}

export function FileItem({ file, isSelected, onToggleSelection, onView, onDelete }: FileItemProps): React.JSX.Element {
  const fileTypeAndSize = `${getFileTypeLabel(file.mime_type)} • ${formatBytes(file.size)}`;

  return (
    <div
      className={`${styles.fileItem} ${isSelected ? styles.selected : ''}`}
      role="listitem"
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelection}
        className={styles.fileCheckbox}
        aria-label={`Select ${file.original_name}`}
      />
      <span className={styles.fileIcon} aria-hidden="true">
        {getFileIcon(file.mime_type)}
      </span>
      <span className={styles.fileName}>{file.original_name}</span>
      <span className={styles.fileSize}>{fileTypeAndSize}</span>
      <Button
        variant="message"
        className={styles.viewButton}
        onClick={onView}
        aria-label={`View ${file.original_name}`}
      >
        View
      </Button>
      <Button
        variant="message"
        destructive
        className={styles.deleteButton}
        onClick={onDelete}
        aria-label={`Delete ${file.original_name}`}
      >
        <X size={16} />
      </Button>
    </div>
  );
}
