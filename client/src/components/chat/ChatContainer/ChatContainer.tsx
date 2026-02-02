import styles from './ChatContainer.module.css';

export interface ChatContainerProps {
  isEmpty: boolean;
  emptyContent: React.ReactNode;
  children: React.ReactNode;
}

export function ChatContainer({
  isEmpty,
  emptyContent,
  children,
}: ChatContainerProps): React.JSX.Element {
  return (
    <div className={isEmpty ? styles.chatContainerEmpty : styles.chatContainer}>
      {isEmpty ? (
        <div className={styles.emptyContent}>{emptyContent}</div>
      ) : (
        children
      )}
    </div>
  );
}
