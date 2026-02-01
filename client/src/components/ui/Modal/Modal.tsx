import { ReactNode } from 'react';
import { Button } from '../Button';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
}

export function Modal({ isOpen, onClose, title, subtitle, children, footer, bodyClassName }: ModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {(title || subtitle) && (
          <div className={styles.modalHeader}>
            <div className={styles.modalHeaderText}>
              {title && <h2>{title}</h2>}
              {subtitle && <div className={styles.modalSubtitle}>{subtitle}</div>}
            </div>
            <Button variant="message" className={styles.closeButton} onClick={onClose}>
              ×
            </Button>
          </div>
        )}
        <div className={`${styles.modalBody}${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
