import { useState, useRef, useEffect } from 'react';
import styles from './App.module.css';
import { useTheme } from './hooks/useTheme';
import { useFileManager } from './hooks/useFileManager';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import { Header } from './components/layout/Header/Header';
import { ChatMessages } from './components/chat/ChatMessages/ChatMessages';
import { ChatInput } from './components/chat/ChatInput/ChatInput';
import { FileAttachModal } from './components/files/FileAttachModal/FileAttachModal';
import { ChatHistoryModal } from './components/history/ChatHistoryModal/ChatHistoryModal';
import { ConfirmDialog } from './components/ui/ConfirmDialog/ConfirmDialog';

function App(): React.JSX.Element {
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize hooks
  const { theme, toggleTheme } = useTheme();
  const fileManager = useFileManager();

  // Initialize chat with conversation ID from App state
  const chat = useChat({
    conversationId: currentConversationId,
    selectedFileIds: fileManager.selectedFileIds,
    onConversationCreated: setCurrentConversationId,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
  });

  // Initialize conversations with currentConversationId from App state
  const conversations = useConversations({
    currentConversationId,
    setCurrentConversationId,
    onMessagesLoad: chat.setMessages,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
    shouldAutoLoad: chat.messages.length === 0,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

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

  const selectedFiles = fileManager.files.filter(f =>
    fileManager.selectedFileIds.includes(f.id)
  );

  return (
    <div className={styles.app}>
      <Header
        selectedFilesCount={fileManager.selectedFileIds.length}
        onHistoryClick={conversations.openHistoryModal}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <div className={styles.chatContainer}>
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
        />
      </div>

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
        fileInputRef={fileInputRef}
      />

      <ChatHistoryModal
        isOpen={conversations.isHistoryModalOpen}
        onClose={conversations.closeHistoryModal}
        conversations={conversations.conversations}
        currentConversationId={currentConversationId}
        onLoadConversation={conversations.loadConversation}
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

export default App;
