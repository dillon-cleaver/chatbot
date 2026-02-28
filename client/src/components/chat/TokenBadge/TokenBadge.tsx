import { useState, useId } from 'react';
import type { TokenUsage } from '../../../types';
import styles from './TokenBadge.module.css';

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  web_search: 'Web Search',
  fetch_url: 'URL Fetch',
};

function formatToolName(tool: string): string {
  return TOOL_DISPLAY_NAMES[tool] ?? tool;
}

interface TokenBadgeProps {
  usage: TokenUsage;
  toolsUsed?: string[];
}

export function TokenBadge({ usage, toolsUsed }: TokenBadgeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const total = usage.input_tokens + usage.output_tokens;

  const toolLabels = toolsUsed?.map(formatToolName);

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
        {toolLabels && toolLabels.length > 0 && (
          <>
            <span className={styles.separator} aria-hidden="true">&middot;</span>
            <span className={styles.tools}>{toolLabels.join(', ')}</span>
          </>
        )}
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
          {toolLabels && toolLabels.length > 0 && (
            <div className={styles.pair}>
              <dt>Tools:</dt>
              <dd>{toolLabels.join(', ')}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
