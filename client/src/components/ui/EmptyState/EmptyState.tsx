import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  children: React.ReactNode;
}

export function EmptyState({ children }: EmptyStateProps): React.JSX.Element {
  return (
    <p className={styles.emptyState} role="status">
      {children}
    </p>
  );
}
