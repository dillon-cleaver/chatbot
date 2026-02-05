import { X } from 'lucide-react';
import type { UploadedFile } from '../../../types';
import { getFileIcon } from '../../../utils/fileUtils';
import { Button } from '../../ui/Button';
import styles from './FileChip.module.css';

export interface FileChipProps {
  file: UploadedFile;
  onRemove?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function FileChip({ file, onRemove, onClick, compact = false }: FileChipProps): React.JSX.Element {
  const chipClassName = `${styles.fileChip} ${compact ? styles.compact : ''} ${compact && onClick ? styles.clickable : ''}`;
  const nameClassName = `${styles.fileChipName} ${compact ? styles.compactName : ''}`;

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick when removing
    onRemove?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={chipClassName}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View ${file.original_name}` : undefined}
    >
      <span className={styles.fileChipIcon} aria-hidden="true">
        {getFileIcon(file.mime_type)}
      </span>
      <span className={nameClassName}>{file.original_name}</span>
      {onRemove && (
        <Button
          variant="message"
          destructive
          className={styles.fileChipRemove}
          onClick={handleRemoveClick}
          aria-label={`Remove ${file.original_name}`}
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
}
