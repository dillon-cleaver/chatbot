import { useState, useId } from 'react';
import type { TokenUsage } from '../../../types';
import styles from './TokenBadge.module.css';

interface TokenBadgeProps {
  usage: TokenUsage;
}

export function TokenBadge({ usage }: TokenBadgeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const total = usage.input_tokens + usage.output_tokens;

  return (
    <div>
      <button
        className={styles.badge}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <span className={`${styles.caret} ${expanded ? styles.caretExpanded : ''}`} aria-hidden="true">
          &#9654;
        </span>
        {total.toLocaleString()} tokens
      </button>

      {expanded && (
        <dl className={styles.breakdown} id={panelId}>
          <div className={styles.pair}>
            <dt>In:</dt>
            <dd>{usage.input_tokens.toLocaleString()}</dd>
          </div>
          <div className={styles.pair}>
            <dt>Out:</dt>
            <dd>{usage.output_tokens.toLocaleString()}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
