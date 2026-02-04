import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './CollapsibleSection.module.css';

export interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function CollapsibleSection({
  label,
  defaultOpen = false,
  className = '',
  children,
}: CollapsibleSectionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${styles.collapsibleSection} ${className}`}>
      <button
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.chevron}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  );
}
