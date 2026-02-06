import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "../Button";
import styles from "./Modal.module.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  closeButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onCloseButtonKeyDown?: (e: React.KeyboardEvent) => void;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  bodyClassName,
  closeButtonRef,
  onCloseButtonKeyDown,
}: ModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previous focus and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the close button if ref provided, otherwise focus first focusable element
      if (closeButtonRef?.current) {
        closeButtonRef.current.focus();
      } else {
        // Fallback: focus first focusable element in the dialog
        const firstFocusable = dialogRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) as HTMLElement | null;
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          dialogRef.current?.focus();
        }
      }
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [closeButtonRef, isOpen]);

  // Handle Escape key (stopPropagation prevents duplicate handling by global shortcuts)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Simple focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [isOpen]);

  if (!isOpen) return null;

  const titleId = title ? "modal-title" : undefined;
  const subtitleId = subtitle ? "modal-subtitle" : undefined;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
      >
        {(title || subtitle) && (
          <div className={styles.modalHeader}>
            <div className={styles.modalHeaderText}>
              {title && <h2 id={titleId}>{title}</h2>}
              {subtitle && (
                <div id={subtitleId} className={styles.modalSubtitle}>
                  {subtitle}
                </div>
              )}
            </div>
            <Button
              ref={closeButtonRef}
              variant="message"
              className={styles.closeButton}
              onClick={onClose}
              onKeyDown={onCloseButtonKeyDown}
              aria-label="Close modal"
            >
              <X size={20} />
            </Button>
          </div>
        )}
        <div
          className={`${styles.modalBody}${bodyClassName ? ` ${bodyClassName}` : ""}`}
        >
          {children}
        </div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
