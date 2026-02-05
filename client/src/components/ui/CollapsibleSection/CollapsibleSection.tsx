import { useState, useId, forwardRef, useRef, useImperativeHandle } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./CollapsibleSection.module.css";

export interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export interface CollapsibleSectionRef {
  focus: () => void;
}

export const CollapsibleSection = forwardRef<
  CollapsibleSectionRef,
  CollapsibleSectionProps
>(function CollapsibleSection(
  { label, defaultOpen = false, className = "", children, onKeyDown },
  ref,
): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      buttonRef.current?.focus();
    },
  }));

  return (
    <div className={`${styles.collapsibleSection} ${className}`}>
      <button
        ref={buttonRef}
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
        onKeyDown={onKeyDown}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.chevron} aria-hidden="true">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {isOpen && (
        <div id={contentId} className={styles.content} role="region">
          {children}
        </div>
      )}
    </div>
  );
});
