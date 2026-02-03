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
    <div className={styles.fileItem}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelection}
        className={styles.fileCheckbox}
      />
      <span className={styles.fileIcon}>{getFileIcon(file.mime_type)}</span>
      <span className={styles.fileName}>{file.original_name}</span>
      <span className={styles.fileSize}>{fileTypeAndSize}</span>
      <Button variant="message" className={styles.viewButton} onClick={onView}>
        View
      </Button>
      <Button variant="message" destructive className={styles.deleteButton} onClick={onDelete}>
        <X size={16} />
      </Button>
    </div>
  );
}
