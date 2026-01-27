import { useState } from 'react';
import type { Conversation } from '../../../types';
import styles from './ConversationItem.module.css';

export interface ConversationItemProps {
  conversation: Conversation;
  isCurrent: boolean;
  onLoad: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onUpdateTitle: (conversationId: string, newTitle: string) => void;
}

export function ConversationItem({
  conversation,
  isCurrent,
  onLoad,
  onDelete,
  onUpdateTitle,
}: ConversationItemProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);

  const startEditing = (): void => {
    setIsEditing(true);
    setEditValue(conversation.title);
  };

  const cancelEditing = (): void => {
    setIsEditing(false);
    setEditValue(conversation.title);
  };

  const saveTitle = (): void => {
    if (editValue.trim()) {
      onUpdateTitle(conversation.id, editValue.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div className={`${styles.conversationItem} ${isCurrent ? styles.currentConversation : ''}`}>
      {isEditing ? (
        <div className={styles.titleEditContainer}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.titleInput}
            autoFocus
          />
          <button className={styles.saveButton} onClick={saveTitle}>
            ✓
          </button>
          <button className={styles.cancelButton} onClick={cancelEditing}>
            ×
          </button>
        </div>
      ) : (
        <>
          <div className={styles.conversationInfo}>
            <span className={styles.conversationTitle} onClick={() => onLoad(conversation.id)}>
              {conversation.title}
            </span>
            <span className={styles.conversationMeta}>
              {conversation.message_count} messages · {new Date(conversation.updated_at).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.conversationActions}>
            <button className={styles.editButton} onClick={startEditing}>
              ✎
            </button>
            <button className={styles.deleteButton} onClick={() => onDelete(conversation.id)}>
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
}
