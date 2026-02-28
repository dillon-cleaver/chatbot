import { Upload } from 'lucide-react';
import styles from './DropZoneOverlay.module.css';

interface DropZoneOverlayProps {
  isDragging: boolean;
}

export function DropZoneOverlay({ isDragging }: DropZoneOverlayProps): React.JSX.Element | null {
  if (!isDragging) return null;

  return (
    <div className={styles.overlay} aria-hidden="true">
      <div className={styles.content}>
        <Upload size={48} strokeWidth={1.5} />
        <span className={styles.label}>Drop files here</span>
      </div>
    </div>
  );
}
