import { forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { Paperclip } from "lucide-react";
import type { UploadedFile } from "../../../types";
import { useAutoResizeTextarea } from "../../../hooks/useAutoResizeTextarea";
import { FileChipsDisplay } from "../FileChipsDisplay/FileChipsDisplay";
import styles from "./ChatInput.module.css";

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onAttachClick: () => void;
  isLoading: boolean;
  selectedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  onClearAllFiles?: () => void;
  showTopBorder?: boolean;
  isModalOpen?: boolean;
  autoFocus?: boolean;
  onNavigateUp?: () => void;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(
    {
      value,
      onChange,
      onSend,
      onKeyDown,
      onAttachClick,
      isLoading,
      selectedFiles,
      onRemoveFile,
      onClearAllFiles,
      showTopBorder = true,
      isModalOpen = false,
      autoFocus = false,
      onNavigateUp,
    },
    ref,
  ): React.JSX.Element {
    const { textareaRef } = useAutoResizeTextarea({ value });
    const attachButtonRef = useRef<HTMLButtonElement>(null);
    const sendButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
      }),
      [textareaRef],
    );

    // Arrow key navigation for attach button
    const handleAttachKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          textareaRef.current?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onNavigateUp?.();
        }
      },
      [textareaRef, onNavigateUp],
    );

    // Arrow key navigation for send button
    const handleSendKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          textareaRef.current?.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onNavigateUp?.();
        }
      },
      [textareaRef, onNavigateUp],
    );

    // Arrow key navigation within textarea (at boundaries)
    const handleTextareaKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd } = textarea;
        const isAtStart = selectionStart === 0 && selectionEnd === 0;
        const isAtEnd =
          selectionStart === value.length && selectionEnd === value.length;

        if (e.key === "ArrowLeft" && isAtStart) {
          e.preventDefault();
          attachButtonRef.current?.focus();
          return;
        }

        if (e.key === "ArrowRight" && isAtEnd) {
          e.preventDefault();
          sendButtonRef.current?.focus();
          return;
        }

        // ArrowUp at start of text navigates to header
        if (e.key === "ArrowUp" && isAtStart) {
          e.preventDefault();
          onNavigateUp?.();
          return;
        }

        // Pass through to parent handler for Enter key handling
        onKeyDown(e);
      },
      [value.length, onKeyDown, onNavigateUp],
    );

    return (
      <div
        className={`${styles.inputContainer} ${showTopBorder ? styles.withBorder : ""}`}
      >
        {!isModalOpen && (
          <FileChipsDisplay
            files={selectedFiles}
            onRemoveFile={onRemoveFile}
            onClearAll={onClearAllFiles}
          />
        )}
        <div className={styles.inputRow}>
          <button
            ref={attachButtonRef}
            className={styles.attachButton}
            onClick={onAttachClick}
            onKeyDown={handleAttachKeyDown}
            aria-label={
              selectedFiles.length > 0
                ? `Attach files (${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} selected)`
                : "Attach files"
            }
          >
            <Paperclip size={20} />
            {selectedFiles.length > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {selectedFiles.length}
              </span>
            )}
          </button>
          <textarea
            ref={textareaRef}
            className={styles.input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type your message..."
            aria-label="Message input. Press Enter to send, Shift+Enter for new line"
            rows={1}
            disabled={isLoading}
            autoFocus={autoFocus}
          />
          <button
            ref={sendButtonRef}
            className={styles.sendButton}
            onClick={onSend}
            onKeyDown={handleSendKeyDown}
            disabled={isLoading || !value.trim()}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    );
  },
);
