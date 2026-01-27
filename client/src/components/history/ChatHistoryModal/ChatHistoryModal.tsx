import type { Conversation } from '../../../types';
import { Modal } from '../../ui/Modal/Modal';
import { ConversationItem } from '../ConversationItem/ConversationItem';
import styles from './ChatHistoryModal.module.css';

export interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onLoadConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onStartNewChat: () => void;
  onDeleteAllClick: () => void;
  onUpdateTitle: (conversationId: string, newTitle: string) => void;
}

export function ChatHistoryModal({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  onStartNewChat,
  onDeleteAllClick,
  onUpdateTitle,
}: ChatHistoryModalProps): React.JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chat History">
      <div className={styles.historyActions}>
        <button className={styles.newChatButton} onClick={onStartNewChat}>
          + New Chat
        </button>
        {conversations.length > 0 && (
          <button className={styles.deleteAllButton} onClick={onDeleteAllClick}>
            Delete All
          </button>
        )}
      </div>

      <div className={styles.conversationList}>
        {conversations.length === 0 ? (
          <p className={styles.emptyConversations}>No conversations yet</p>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isCurrent={conversation.id === currentConversationId}
              onLoad={onLoadConversation}
              onDelete={onDeleteConversation}
              onUpdateTitle={onUpdateTitle}
            />
          ))
        )}
      </div>
    </Modal>
  );
}
