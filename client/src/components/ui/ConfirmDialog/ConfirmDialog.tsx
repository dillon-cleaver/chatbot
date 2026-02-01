import { Button } from '../Button';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }: ConfirmDialogProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.confirmActions}>
          <Button
            variant="chunky"
            destructive
            className={styles.confirmDeleteButton}
            onClick={onConfirm}
          >
            Delete All
          </Button>
          <Button
            variant="chunky"
            className={styles.cancelConfirmButton}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
