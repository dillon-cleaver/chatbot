import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ChatContent.module.css';
import { useTheme } from '../../../hooks/useTheme';
import { useFileManager } from '../../../hooks/useFileManager';
import { useConversations } from '../../../hooks/useConversations';
import { useChat } from '../../../hooks/useChat';
import { Header } from '../../layout/Header/Header';
import { ChatMessages } from '../ChatMessages/ChatMessages';
import { ChatInput } from '../ChatInput/ChatInput';
import { ChatContainer } from '../ChatContainer/ChatContainer';
import { FileAttachModal } from '../../files/FileAttachModal/FileAttachModal';
import { ChatHistoryModal } from '../../history/ChatHistoryModal/ChatHistoryModal';
import { ConfirmDialog } from '../../ui/ConfirmDialog/ConfirmDialog';
import { Spinner } from '../../ui/Spinner/Spinner';

export function ChatContent(): React.JSX.Element {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const currentConversationId = conversationId ?? null;

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const justCreatedConversationRef = useRef<boolean>(false);

  // Initialize hooks
  const { theme, toggleTheme } = useTheme();
  const fileManager = useFileManager();

  // Navigate to conversation when created
  const handleConversationCreated = useCallback((id: string): void => {
    justCreatedConversationRef.current = true;
    navigate(`/chat/${id}`);
  }, [navigate]);

  // Navigate to home for new chat
  const handleNewChat = useCallback((): void => {
    navigate('/', { replace: true });
  }, [navigate]);

  const selectedFiles = useMemo(
    () => fileManager.files.filter(f => fileManager.selectedFileIds.includes(f.id)),
    [fileManager.files, fileManager.selectedFileIds]
  );

  // Initialize chat with conversation ID from App state
  const chat = useChat({
    conversationId: currentConversationId,
    selectedFileIds: fileManager.selectedFileIds,
    selectedFiles,
    onConversationCreated: handleConversationCreated,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
  });

  // Initialize conversations with navigation callback
  const conversations = useConversations({
    currentConversationId,
    onMessagesLoad: chat.setMessages,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
    onNewChat: handleNewChat,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  // Auto-scroll when modal closes to accommodate file selection UI
  useEffect(() => {
    // Only scroll when modal closes (transitions from true to false)
    if (!fileManager.isModalOpen && fileManager.selectedFileIds.length > 0) {
      // Delay to let modal close animation complete, then smooth scroll
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [fileManager.isModalOpen, fileManager.selectedFileIds.length]);

  // Load conversation when URL param changes
  // Destructure to satisfy ESLint and make dependencies clearer
  const { loadConversation } = conversations;
  const { setMessages } = chat;
  const { clearSelectedFiles } = fileManager;

  useEffect(() => {
    const loadFromUrl = async () => {
      if (conversationId) {
        // Skip loading if we just created this conversation
        if (justCreatedConversationRef.current) {
          justCreatedConversationRef.current = false;
          return;
        }
        // Load conversation from server
        await loadConversation(conversationId);
      } else {
        // At "/" route - always clear messages for new chat
        setMessages([]);
        clearSelectedFiles();
      }
    };
    loadFromUrl();
  }, [conversationId, loadConversation, setMessages, clearSelectedFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    await fileManager.uploadFiles(selectedFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAllConversations = async (): Promise<void> => {
    await conversations.deleteAllConversations();
    setIsDeleteAllModalOpen(false);
    conversations.closeHistoryModal();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    await chat.sendMessage();
    await conversations.refreshConversations();
  };

  // Show empty state only when truly at home with no conversation to load
  const isEmpty = chat.messages.length === 0 && !conversationId && !conversations.isLoadingConversation;

  return (
    <div className={styles.app}>
      <Header
        onHistoryClick={conversations.openHistoryModal}
        onTitleClick={() => navigate('/', { replace: true })}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <ChatContainer
        isEmpty={isEmpty}
        emptyContent={
          <>
            <div className={styles.emptyGreeting}>
              <h1 className={styles.emptyTitle}>CHATBOT</h1>
              <p className={styles.emptySubtitle}>type, type, type</p>
            </div>
            <ChatInput
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
            />
            <ChatInput
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
            />
          </>
        )}
      </ChatContainer>

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
        error={fileManager.error}
        onClearError={fileManager.clearError}
        onClearSelection={fileManager.clearSelectedFiles}
        onCommitSelection={fileManager.commitPendingSelection}
        fileInputRef={fileInputRef}
      />

      <ChatHistoryModal
        isOpen={conversations.isHistoryModalOpen}
        onClose={conversations.closeHistoryModal}
        conversations={conversations.conversations}
        currentConversationId={currentConversationId}
        onDeleteConversation={conversations.deleteConversation}
        onStartNewChat={conversations.startNewConversation}
        onDeleteAllClick={() => setIsDeleteAllModalOpen(true)}
        onUpdateTitle={conversations.updateConversationTitle}
      />

      <ConfirmDialog
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={handleDeleteAllConversations}
        title="Delete All Conversations?"
        message="This will permanently delete all your chat history. This action cannot be undone."
      />
    </div>
  );
}
