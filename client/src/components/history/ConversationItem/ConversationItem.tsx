import {
  useState,
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, X, Pencil } from "lucide-react";
import type { Conversation } from "../../../types";
import { Button } from "../../ui/Button";
import styles from "./ConversationItem.module.css";

export interface ConversationItemProps {
  conversation: Conversation;
  isCurrent: boolean;
  onClose: () => void;
  onDelete: (conversationId: string) => void;
  onUpdateTitle: (conversationId: string, newTitle: string) => void;
  tabIndex?: number;
  onFocus?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
}

export interface ConversationItemRef {
  focus: () => void;
  resetInternalFocus: () => void;
}

// Focus positions within the conversation item: 0 = row, 1 = edit, 2 = delete
type FocusPosition = 0 | 1 | 2;

export const ConversationItem = forwardRef<
  ConversationItemRef,
  ConversationItemProps
>(function ConversationItem(
  {
    conversation,
    isCurrent,
    onClose,
    onDelete,
    onUpdateTitle,
    tabIndex = 0,
    onFocus,
    onNavigateUp,
    onNavigateDown,
  },
  ref,
): React.JSX.Element {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const [internalFocus, setInternalFocus] = useState<FocusPosition>(0);

  const rowRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      rowRef.current?.focus();
    },
    resetInternalFocus: () => {
      setInternalFocus(0);
    },
  }));

  // Focus the correct element when internal focus changes
  useEffect(() => {
    // Only apply focus if this item has tabIndex 0 (is the active item)
    if (tabIndex !== 0 || isEditing) return;

    switch (internalFocus) {
      case 0:
        rowRef.current?.focus();
        break;
      case 1:
        editButtonRef.current?.focus();
        break;
      case 2:
        deleteButtonRef.current?.focus();
        break;
    }
  }, [internalFocus, tabIndex, isEditing]);

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
    if (e.key === "Enter") {
      saveTitle();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isEditing) return;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        e.stopPropagation();
        if (internalFocus < 2) {
          setInternalFocus((prev) => (prev + 1) as FocusPosition);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        e.stopPropagation();
        if (internalFocus > 0) {
          setInternalFocus((prev) => (prev - 1) as FocusPosition);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setInternalFocus(0); // Reset to row when navigating
        onNavigateUp?.();
        break;
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setInternalFocus(0); // Reset to row when navigating
        onNavigateDown?.();
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (internalFocus === 0) {
          onClose();
          navigate(`/chat/${conversation.id}`);
        } else if (internalFocus === 1) {
          startEditing();
        } else if (internalFocus === 2) {
          onDelete(conversation.id);
        }
        break;
      case "Home":
      case "End":
        // Let parent handle Home/End for list navigation
        setInternalFocus(0);
        break;
    }
  };

  return (
    <div
      ref={rowRef}
      className={`${styles.conversationItem} ${isCurrent ? styles.currentConversation : ""}`}
      role="option"
      aria-selected={isCurrent}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onKeyDown={handleItemKeyDown}
    >
      {isEditing ? (
        <div className={styles.titleEditContainer}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.titleInput}
            aria-label="Edit conversation title"
            autoFocus
          />
          <Button
            variant="message"
            className={styles.saveButton}
            onClick={saveTitle}
            aria-label="Save title"
            tabIndex={-1}
          >
            <Check size={16} />
          </Button>
          <Button
            variant="message"
            className={styles.cancelButton}
            onClick={cancelEditing}
            aria-label="Cancel editing"
            tabIndex={-1}
          >
            <X size={16} />
          </Button>
        </div>
      ) : (
        <>
          <Link
            to={`/chat/${conversation.id}`}
            className={styles.conversationInfo}
            onClick={onClose}
            aria-label={`Open conversation: ${conversation.title}`}
            tabIndex={-1}
          >
            <span className={styles.conversationTitle}>
              {conversation.title}
            </span>
            <span className={styles.conversationMeta}>
              {conversation.message_count} messages ·{" "}
              {new Date(conversation.updated_at).toLocaleDateString()}
            </span>
          </Link>
          <div className={styles.conversationActions}>
            <Button
              ref={editButtonRef}
              variant="message"
              className={styles.editButton}
              onClick={startEditing}
              aria-label="Edit conversation title"
              tabIndex={-1}
            >
              <Pencil size={16} />
            </Button>
            <Button
              ref={deleteButtonRef}
              variant="message"
              destructive
              className={styles.deleteButton}
              onClick={() => onDelete(conversation.id)}
              aria-label="Delete conversation"
              tabIndex={-1}
            >
              <X size={16} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
});
