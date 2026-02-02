import styles from './Header.module.css';

export interface HeaderProps {
  onHistoryClick: () => void;
  onTitleClick: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function Header({
  onHistoryClick,
  onTitleClick,
  theme,
  onThemeToggle,
}: HeaderProps): React.JSX.Element {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.titleButton} onClick={onTitleClick} aria-label="Return to home">
          <h1 className={styles.title}>Chatbot</h1>
        </button>
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
