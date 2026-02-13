import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ChatContent.module.css";
import { useTheme } from "../../../hooks/useTheme";
import { useFileManager } from "../../../hooks/useFileManager";
import { useConversations } from "../../../hooks/useConversations";
import { useChat } from "../../../hooks/useChat";
import { useKeyboardShortcuts } from "../../../hooks/useKeyboardShortcuts";
import { useAnnouncer, ANNOUNCEMENTS } from "../../../hooks/useAnnouncer";
import { useAutoFocus } from "../../../hooks/useAutoFocus";
import { Header, type HeaderRef } from "../../layout/Header/Header";
import { ChatMessages } from "../ChatMessages/ChatMessages";
import { ChatInput, type ChatInputRef } from "../ChatInput/ChatInput";
import { ChatContainer } from "../ChatContainer/ChatContainer";
import { FileAttachModal } from "../../files/FileAttachModal/FileAttachModal";
import { ChatHistoryModal } from "../../history/ChatHistoryModal/ChatHistoryModal";
import { ConfirmDialog } from "../../ui/ConfirmDialog/ConfirmDialog";
import { KeyboardShortcutsModal } from "../../ui/KeyboardShortcutsModal/KeyboardShortcutsModal";
import { Spinner } from "../../ui/Spinner/Spinner";
import { getStorageEstimate } from "../../../utils/fileUtils";
import { MAX_CONVERSATIONS, MAX_DAILY_CHATS, MAX_STORAGE_BYTES } from "../../../constants";
import { getDailyCreationCount } from "../../../utils/dailyChatLimit";

// Timing constants for animations and delays
const MODAL_CLOSE_ANIMATION_MS = 150;
const FOCUS_AFTER_NEW_CHAT_MS = 50;

export function ChatContent(): React.JSX.Element {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const currentConversationId = conversationId ?? null;

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] =
    useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [storageUsage, setStorageUsage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const headerRef = useRef<HeaderRef>(null);
  const justCreatedConversationRef = useRef<boolean>(false);

  // Initialize hooks
  const { theme, toggleTheme } = useTheme();
  const announce = useAnnouncer();

  // Memoize to keep loadConversation's identity stable (it depends on onError)
  const handleError = useCallback(
    (message: string) => announce(ANNOUNCEMENTS.ERROR(message), "assertive"),
    [announce],
  );

  const fileManager = useFileManager({
    conversationId: currentConversationId,
    onUploadSuccess: (count) => announce(ANNOUNCEMENTS.FILE_UPLOADED(count)),
    onDeleteSuccess: () => announce(ANNOUNCEMENTS.FILE_DELETED),
  });

  // Navigate to conversation when created (null = rollback, stay on current page)
  const handleConversationCreated = useCallback(
    (id: string | null): void => {
      if (!id) return;
      justCreatedConversationRef.current = true;
      navigate(`/chat/${id}`);
    },
    [navigate],
  );

  // Navigate to home for new chat
  const handleNewChat = useCallback((): void => {
    navigate("/", { replace: true });
  }, [navigate]);

  const selectedFiles = useMemo(
    () =>
      fileManager.files.filter((f) =>
        fileManager.selectedFileIds.includes(f.id),
      ),
    [fileManager.files, fileManager.selectedFileIds],
  );

  // Initialize chat with conversation ID from App state
  const chat = useChat({
    conversationId: currentConversationId,
    selectedFiles,
    onConversationCreated: handleConversationCreated,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
    getFileObject: fileManager.getFileObject,
  });

  // Initialize conversations with navigation callback
  const conversations = useConversations({
    currentConversationId,
    onMessagesLoad: chat.setMessages,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
    onNewChat: handleNewChat,
    onDeleteSuccess: () => announce(ANNOUNCEMENTS.CONVERSATION_DELETED),
    onError: handleError,
  });

  // Fetch storage estimate when either modal opens
  useEffect(() => {
    if (conversations.isHistoryModalOpen || fileManager.isModalOpen) {
      getStorageEstimate().then(({ usage }) => {
        setStorageUsage(usage);
      });
    }
  }, [conversations.isHistoryModalOpen, fileManager.isModalOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  // Auto-focus input after assistant responds
  const lastMessageIsAssistant = useMemo(
    () => chat.messages[chat.messages.length - 1]?.role === "assistant",
    [chat.messages],
  );

  useAutoFocus({
    ref: chatInputRef,
    enabled: !chat.isLoading && chat.messages.length > 0 && lastMessageIsAssistant,
    trigger: "change",
  });

  // Auto-scroll when modal closes to accommodate file selection UI
  useEffect(() => {
    // Only scroll when modal closes (transitions from true to false)
    if (!fileManager.isModalOpen && fileManager.selectedFileIds.length > 0) {
      // Delay to let modal close animation complete, then focus input and scroll
      const timer = setTimeout(() => {
        chatInputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, MODAL_CLOSE_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
  }, [fileManager.isModalOpen, fileManager.selectedFileIds.length]);

  // Load conversation when URL param changes
  // Destructure to satisfy ESLint and make dependencies clearer
  const { loadConversation } = conversations;
  const { setMessages } = chat;

  useEffect(() => {
    const loadFromUrl = async () => {
      if (conversationId) {
        // Skip loading if we just created this conversation
        if (justCreatedConversationRef.current) {
          justCreatedConversationRef.current = false;
          return;
        }
        // Announce loading start
        announce("Loading conversation...");
        // Load conversation from server
        await loadConversation(conversationId);
        announce(ANNOUNCEMENTS.CONVERSATION_LOADED);
      } else {
        // At "/" route - clear messages for new chat
        // Note: Don't clear files - let useFileManager handle per-conversation state
        setMessages([]);
      }
    };
    loadFromUrl();
  }, [conversationId, loadConversation, setMessages, announce]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    await fileManager.uploadFiles(selectedFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAllConversations = async (): Promise<void> => {
    await conversations.deleteAllConversations();
    setIsDeleteAllModalOpen(false);
    conversations.closeHistoryModal();
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!chat.input.trim()) return;
    announce(ANNOUNCEMENTS.MESSAGE_SENDING);
    await chat.sendMessage();
    await conversations.refreshConversations();
    announce(ANNOUNCEMENTS.MESSAGE_SENT);
  };

  // Handle escape key - close modals or toggle input focus
  const handleEscape = useCallback((): void => {
    if (isHelpModalOpen) {
      setIsHelpModalOpen(false);
    } else if (fileManager.isModalOpen) {
      fileManager.closeModal();
    } else if (conversations.isHistoryModalOpen) {
      conversations.closeHistoryModal();
    } else if (isDeleteAllModalOpen) {
      setIsDeleteAllModalOpen(false);
    } else {
      // Toggle input focus - blur if focused, focus if not
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "INPUT";

      if (isInputFocused) {
        (activeElement as HTMLElement).blur(); // Exit "typing mode"
      } else {
        chatInputRef.current?.focus(); // Enter "typing mode"
      }
    }
  }, [isHelpModalOpen, fileManager, conversations, isDeleteAllModalOpen]);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    handlers: {
      onSend: handleSendMessage,
      onAttach: fileManager.openModal,
      onHistory: conversations.openHistoryModal,
      onNewChat: handleNewChat,
      onEscape: handleEscape,
      onHelp: () => setIsHelpModalOpen(true),
    },
  });

  // Show empty state only when truly at home with no conversation to load
  const isEmpty =
    chat.messages.length === 0 &&
    !conversationId &&
    !conversations.isLoadingConversation;

  // Navigation between header and input
  const handleNavigateToHeader = useCallback(() => {
    headerRef.current?.focusNav();
  }, []);

  const handleNavigateToInput = useCallback(() => {
    chatInputRef.current?.focus();
  }, []);

  // Handler for starting new chat from history modal - focuses input after modal closes
  const handleStartNewChat = useCallback(() => {
    conversations.startNewConversation();
    // Focus input after modal animation completes
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, FOCUS_AFTER_NEW_CHAT_MS);
  }, [conversations]);

  return (
    <div className={styles.app}>
      <Header
        ref={headerRef}
        onHistoryClick={conversations.openHistoryModal}
        onTitleClick={() => navigate("/", { replace: true })}
        onHelpClick={() => setIsHelpModalOpen(true)}
        theme={theme}
        onThemeToggle={toggleTheme}
        onNavigateDown={handleNavigateToInput}
      />

      <main id="main-content" className={styles.mainContent} tabIndex={-1}>
        <ChatContainer
          isEmpty={isEmpty}
          emptyContent={
            <>
              <div className={styles.emptyGreeting}>
                <h1 className={styles.emptyTitle}>CHATBOT</h1>
                <p className={styles.emptySubtitle}>type, type, type</p>
              </div>
              <ChatInput
                ref={chatInputRef}
                value={chat.input}
                onChange={chat.setInput}
                onSend={handleSendMessage}
                onKeyDown={handleKeyPress}
                onAttachClick={fileManager.openModal}
                isLoading={chat.isLoading}
                selectedFiles={selectedFiles}
                onRemoveFile={fileManager.removeSelectedFile}
                onClearAllFiles={fileManager.clearSelectedFiles}
                showTopBorder={false}
                isModalOpen={fileManager.isModalOpen}
                autoFocus={true}
                onNavigateUp={handleNavigateToHeader}
              />
            </>
          }
        >
          {conversations.isLoadingConversation ? (
            <div className={styles.loadingConversation}>
              <Spinner />
              <p>Loading conversation...</p>
            </div>
          ) : (
            <>
              <ChatMessages
                messages={chat.messages}
                isLoading={chat.isLoading}
                messagesEndRef={messagesEndRef}
                onViewFile={fileManager.viewFile}
              />
              <ChatInput
                ref={chatInputRef}
                value={chat.input}
                onChange={chat.setInput}
                onSend={handleSendMessage}
                onKeyDown={handleKeyPress}
                onAttachClick={fileManager.openModal}
                isLoading={chat.isLoading}
                selectedFiles={selectedFiles}
                onRemoveFile={fileManager.removeSelectedFile}
                onClearAllFiles={fileManager.clearSelectedFiles}
                isModalOpen={fileManager.isModalOpen}
                onNavigateUp={handleNavigateToHeader}
              />
            </>
          )}
        </ChatContainer>
      </main>

      <FileAttachModal
        isOpen={fileManager.isModalOpen}
        onClose={fileManager.closeModal}
        files={fileManager.files}
        selectedFileIds={fileManager.selectedFileIds}
        onToggleSelection={fileManager.toggleFileSelection}
        onUpload={handleFileUpload}
        onViewFile={fileManager.viewFile}
        onDeleteFile={fileManager.deleteFile}
        isUploading={fileManager.isUploading}
        uploadError={fileManager.uploadError}
        onClearSelection={fileManager.clearSelectedFiles}
        onCommitSelection={fileManager.commitPendingSelection}
        fileInputRef={fileInputRef}
        storageUsage={storageUsage}
        storageQuota={MAX_STORAGE_BYTES}
      />

      <ChatHistoryModal
        isOpen={conversations.isHistoryModalOpen}
        onClose={conversations.closeHistoryModal}
        conversations={conversations.conversations}
        currentConversationId={currentConversationId}
        onDeleteConversation={conversations.deleteConversation}
        onStartNewChat={handleStartNewChat}
        onDeleteAllClick={() => setIsDeleteAllModalOpen(true)}
        onUpdateTitle={conversations.updateConversationTitle}
        storageUsage={storageUsage}
        storageQuota={MAX_STORAGE_BYTES}
        maxConversations={MAX_CONVERSATIONS}
        dailyLimitReached={getDailyCreationCount() >= MAX_DAILY_CHATS}
      />

      <ConfirmDialog
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={handleDeleteAllConversations}
        title="Delete All Conversations?"
        message="This will permanently delete all your chat history. This action cannot be undone."
      />

      <KeyboardShortcutsModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
