import styles from './Header.module.css';

export interface HeaderProps {
  selectedFilesCount: number;
  onHistoryClick: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function Header({
  selectedFilesCount,
  onHistoryClick,
  theme,
  onThemeToggle,
}: HeaderProps): React.JSX.Element {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>Chatbot</h1>
        {selectedFilesCount > 0 && (
          <span className={styles.contextIndicator}>
            Selected: {selectedFilesCount} {selectedFilesCount === 1 ? 'file' : 'files'}
          </span>
        )}
      </div>
      <div className={styles.headerRight}>
        <button className={styles.historyButton} onClick={onHistoryClick}>
          💬
        </button>
        <button className={styles.themeToggle} onClick={onThemeToggle}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}
