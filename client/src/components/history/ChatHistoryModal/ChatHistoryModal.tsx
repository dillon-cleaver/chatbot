import { useState, useCallback, useRef, useMemo } from "react";
import type { Conversation } from "../../../types";
import { Modal } from "../../ui/Modal/Modal";
import { Button } from "../../ui/Button";
import {
  ConversationItem,
  type ConversationItemRef,
} from "../ConversationItem/ConversationItem";
import { StorageIndicator } from "../../ui/StorageIndicator/StorageIndicator";
import styles from "./ChatHistoryModal.module.css";

export interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onDeleteConversation: (conversationId: string) => void;
  onStartNewChat: () => void;
  onDeleteAllClick: () => void;
  onUpdateTitle: (conversationId: string, newTitle: string) => void;
  storageUsage: number;
  storageQuota: number;
  maxConversations: number;
  dailyLimitReached: boolean;
}

// Inner component that handles focus state - will reset when key changes
function ConversationListInner({
  conversations,
  currentConversationId,
  onClose,
  onDeleteConversation,
  onUpdateTitle,
  onNavigateToButtons,
}: Pick<
  ChatHistoryModalProps,
  | "conversations"
  | "currentConversationId"
  | "onClose"
  | "onDeleteConversation"
  | "onUpdateTitle"
> & {
  onNavigateToButtons?: () => void;
}): React.JSX.Element {
  // Calculate initial index based on current conversation
  const initialIndex = useMemo(() => {
    const idx = conversations.findIndex((c) => c.id === currentConversationId);
    return idx >= 0 ? idx : 0;
  }, [conversations, currentConversationId]);

  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const itemRefs = useRef<(ConversationItemRef | null)[]>([]);

  // Clamp focused index to valid range
  const clampedFocusedIndex = Math.min(
    Math.max(0, focusedIndex),
    Math.max(0, conversations.length - 1),
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (conversations.length === 0) return;

      let newIndex = clampedFocusedIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(
            clampedFocusedIndex + 1,
            conversations.length - 1,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          if (clampedFocusedIndex === 0) {
            // At first item, navigate to buttons
            onNavigateToButtons?.();
            return;
          }
          newIndex = Math.max(clampedFocusedIndex - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = conversations.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== clampedFocusedIndex) {
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.resetInternalFocus();
        itemRefs.current[newIndex]?.focus();
      }
    },
    [conversations.length, clampedFocusedIndex, onNavigateToButtons],
  );

  const handleItemNavigateUp = useCallback(
    (index: number) => {
      if (index === 0) {
        onNavigateToButtons?.();
      } else {
        const newIndex = index - 1;
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.resetInternalFocus();
        itemRefs.current[newIndex]?.focus();
      }
    },
    [onNavigateToButtons],
  );

  const handleItemNavigateDown = useCallback(
    (index: number) => {
      if (index < conversations.length - 1) {
        const newIndex = index + 1;
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.resetInternalFocus();
        itemRefs.current[newIndex]?.focus();
      }
    },
    [conversations.length],
  );

  if (conversations.length === 0) {
    return (
      <p className={styles.emptyConversations} role="status">
        No conversations yet
      </p>
    );
  }

  return (
    <div
      className={styles.conversationList}
      role="listbox"
      aria-label="Conversations"
      onKeyDown={handleKeyDown}
    >
      {conversations.map((conversation, index) => (
        <ConversationItem
          key={conversation.id}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          conversation={conversation}
          isCurrent={conversation.id === currentConversationId}
          onClose={onClose}
          onDelete={onDeleteConversation}
          onUpdateTitle={onUpdateTitle}
          tabIndex={index === clampedFocusedIndex ? 0 : -1}
          onFocus={() => setFocusedIndex(index)}
          onNavigateUp={() => handleItemNavigateUp(index)}
          onNavigateDown={() => handleItemNavigateDown(index)}
        />
      ))}
    </div>
  );
}

export function ChatHistoryModal({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onDeleteConversation,
  onStartNewChat,
  onDeleteAllClick,
  onUpdateTitle,
  storageUsage,
  storageQuota,
  maxConversations,
  dailyLimitReached,
}: ChatHistoryModalProps): React.JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const newChatButtonRef = useRef<HTMLButtonElement>(null);
  const deleteAllButtonRef = useRef<HTMLButtonElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const focusFirstConversation = useCallback(() => {
    // Focus the first focusable item in the list
    const firstItem = listContainerRef.current?.querySelector(
      '[role="option"][tabindex="0"]',
    ) as HTMLElement | null;
    firstItem?.focus();
  }, []);

  const handleCloseButtonKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      newChatButtonRef.current?.focus();
    }
  }, []);

  const handleNewChatKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        closeButtonRef.current?.focus();
      } else if (e.key === "ArrowRight" && conversations.length > 0) {
        e.preventDefault();
        deleteAllButtonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        focusFirstConversation();
      }
    },
    [conversations.length, focusFirstConversation],
  );

  const handleDeleteAllKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        closeButtonRef.current?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        newChatButtonRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        focusFirstConversation();
      }
    },
    [focusFirstConversation],
  );

  const handleNavigateToButtons = useCallback(() => {
    // Always navigate to NEW CHAT first when coming from list
    newChatButtonRef.current?.focus();
  }, []);

  const atLimit = conversations.length >= maxConversations || dailyLimitReached;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chat History"
      closeButtonRef={closeButtonRef}
      onCloseButtonKeyDown={handleCloseButtonKeyDown}
    >
      <div className={styles.historyActions}>
        <Button
          ref={newChatButtonRef}
          variant="chunky"
          className={styles.newChatButton}
          onClick={onStartNewChat}
          onKeyDown={handleNewChatKeyDown}
          disabled={atLimit}
          title={atLimit ? (dailyLimitReached ? 'Daily chat limit reached' : `Chat limit reached (${maxConversations})`) : undefined}
        >
          + New Chat
        </Button>
        {conversations.length > 0 && (
          <Button
            ref={deleteAllButtonRef}
            variant="chunky"
            destructive
            className={styles.deleteAllButton}
            onClick={onDeleteAllClick}
            onKeyDown={handleDeleteAllKeyDown}
          >
            Delete All
          </Button>
        )}
      </div>

      {isOpen && (
        <div ref={listContainerRef}>
          <ConversationListInner
            conversations={conversations}
            currentConversationId={currentConversationId}
            onClose={onClose}
            onDeleteConversation={onDeleteConversation}
            onUpdateTitle={onUpdateTitle}
            onNavigateToButtons={handleNavigateToButtons}
          />
        </div>
      )}

      <div className={styles.storageFooter}>
        <StorageIndicator
          label={`${conversations.length} / ${maxConversations} chats`}
          storageUsage={storageUsage}
          storageQuota={storageQuota}
        />
      </div>
    </Modal>
  );
}
