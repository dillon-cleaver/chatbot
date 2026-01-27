import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './App.module.css';
import type { Message } from './types';
import { getFileIcon, formatBytes } from './utils/fileUtils';
import { MAX_FILES_PER_MESSAGE, MAX_TOTAL_FILES } from './constants';
import { useTheme } from './hooks/useTheme';
import { useFileManager } from './hooks/useFileManager';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';

function App(): React.JSX.Element {
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize hooks
  const { theme, toggleTheme } = useTheme();
  const fileManager = useFileManager();

  // Create a state to hold messages that will be shared
  const [sharedMessages, setSharedMessages] = useState<Message[]>([]);

  const conversations = useConversations({
    onMessagesLoad: setSharedMessages,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
    shouldAutoLoad: sharedMessages.length === 0,
  });

  const chat = useChat({
    conversationId: conversations.currentConversationId,
    selectedFileIds: fileManager.selectedFileIds,
    onConversationCreated: conversations.setCurrentConversationId,
    onClearSelectedFiles: fileManager.clearSelectedFiles,
  });

  // Sync chat messages with shared messages
  useEffect(() => {
    if (sharedMessages !== chat.messages) {
      chat.setMessages(sharedMessages);
    }
  }, [sharedMessages]);

  // Sync shared messages when chat messages change
  useEffect(() => {
    if (chat.messages !== sharedMessages && chat.messages.length > 0) {
      setSharedMessages(chat.messages);
    }
  }, [chat.messages]);

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

  const attachFilesAndClose = (): void => {
    fileManager.closeModal();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = useCallback(async (): Promise<void> => {
    await chat.sendMessage();
    await conversations.refreshConversations();
  }, [chat, conversations]);

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Chatbot</h1>
          {fileManager.selectedFileIds.length > 0 && (
            <span className={styles.contextIndicator}>
              Selected: {fileManager.selectedFileIds.length} {fileManager.selectedFileIds.length === 1 ? 'file' : 'files'}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <button className={styles.historyButton} onClick={conversations.openHistoryModal}>
            💬
          </button>
          <button className={styles.fileButton} onClick={fileManager.openModal}>
            📁
          </button>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className={styles.chatContainer}>
        <div className={styles.messages}>
          {chat.messages.length === 0 && (
            <div className={styles.emptyState}>
              <p>Start a conversation with the chatbot!</p>
            </div>
          )}
          {chat.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message} ${
                msg.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div className={styles.messageContent}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {chat.isLoading && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageContent}>Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputContainer}>
          {fileManager.selectedFileIds.length > 0 && (
            <div className={styles.fileChipsContainer}>
              {fileManager.selectedFileIds.map(fileId => {
                const file = fileManager.files.find(f => f.id === fileId);
                return file ? (
                  <div key={fileId} className={styles.fileChip}>
                    <span className={styles.fileChipIcon}>{getFileIcon(file.mime_type)}</span>
                    <span className={styles.fileChipName}>{file.original_name}</span>
                    <button
                      className={styles.fileChipRemove}
                      onClick={() => fileManager.removeSelectedFile(fileId)}
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
          <div className={styles.inputRow}>
            <button
              className={styles.attachButton}
              onClick={fileManager.openModal}
              title="Attach files"
            >
              📁
            </button>
            <textarea
              className={styles.input}
              value={chat.input}
              onChange={(e) => chat.setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              disabled={chat.isLoading}
            />
            <button
              className={styles.sendButton}
              onClick={handleSendMessage}
              disabled={chat.isLoading || !chat.input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {fileManager.isModalOpen && (
        <div className={styles.modalOverlay} onClick={fileManager.closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderText}>
                <h2>Attach Files</h2>
                <p className={styles.modalSubtitle}>
                  {fileManager.files.length}/{MAX_TOTAL_FILES} files · {MAX_TOTAL_FILES - fileManager.files.length} {MAX_TOTAL_FILES - fileManager.files.length === 1 ? 'slot' : 'slots'} available · Select up to {MAX_FILES_PER_MESSAGE} to attach
                </p>
              </div>
              <button className={styles.closeButton} onClick={fileManager.closeModal}>
                ×
              </button>
            </div>

            <div className={styles.uploadSection}>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              <button
                className={styles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={fileManager.isUploading}
              >
                {fileManager.isUploading ? 'Uploading...' : '+ Upload Files'}
              </button>

              {fileManager.uploadError && (
                <div className={styles.uploadError}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <span className={styles.errorMessage}>{fileManager.uploadError}</span>
                </div>
              )}

              <div className={styles.fileTypeInfo}>
                <p className={styles.fileTypeSupported}>
                  <strong>Supported:</strong> PDF, DOCX, XLSX, PPTX, PNG, JPEG, GIF, WebP, TXT, CSV
                </p>
                <p className={styles.fileTypeUnsupported}>
                  <strong>Not supported:</strong> Legacy formats (.doc, .xls, .ppt)
                </p>
              </div>
            </div>

            <div className={styles.fileListSection}>
              <div className={`${styles.selectionCounterWrapper} ${fileManager.selectedFileIds.length > 0 ? styles.visible : ''}`}>
                <div className={styles.selectionCounter}>
                  {fileManager.selectedFileIds.length} {fileManager.selectedFileIds.length === 1 ? 'file' : 'files'} selected
                </div>
              </div>
              <div className={styles.fileList}>
                {fileManager.files.length === 0 ? (
                  <p className={styles.emptyFiles}>Upload files to attach them to your messages</p>
                ) : (
                  fileManager.files.map((file) => (
                    <div key={file.id} className={styles.fileItem}>
                      <input
                        type="checkbox"
                        checked={fileManager.selectedFileIds.includes(file.id)}
                        onChange={() => fileManager.toggleFileSelection(file.id)}
                        className={styles.fileCheckbox}
                      />
                      <span className={styles.fileIcon}>{getFileIcon(file.mime_type)}</span>
                      <span className={styles.fileName}>{file.original_name}</span>
                      <span className={styles.fileSize}>{formatBytes(file.size)}</span>
                      <button className={styles.viewButton} onClick={() => fileManager.viewFile(file.id)}>
                        View
                      </button>
                      <button className={styles.deleteButton} onClick={() => fileManager.deleteFile(file.id)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {fileManager.files.length > 0 && (
              <div className={styles.modalFooter}>
                <div className={styles.footerLeft}>
                  {fileManager.selectedFileIds.length > 0 && (
                    <button className={styles.clearSelectionButton} onClick={fileManager.clearSelectedFiles}>
                      Clear Selection
                    </button>
                  )}
                </div>
                <button className={styles.attachCloseButton} onClick={attachFilesAndClose}>
                  {fileManager.selectedFileIds.length > 0 ? `Attach ${fileManager.selectedFileIds.length} & Close` : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {conversations.isHistoryModalOpen && (
        <div className={styles.modalOverlay} onClick={conversations.closeHistoryModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chat History</h2>
              <button className={styles.closeButton} onClick={conversations.closeHistoryModal}>
                ×
              </button>
            </div>

            <div className={styles.historyActions}>
              <button className={styles.newChatButton} onClick={conversations.startNewConversation}>
                + New Chat
              </button>
              {conversations.conversations.length > 0 && (
                <button
                  className={styles.deleteAllButton}
                  onClick={() => setIsDeleteAllModalOpen(true)}
                >
                  Delete All
                </button>
              )}
            </div>

            <div className={styles.conversationList}>
              {conversations.conversations.length === 0 ? (
                <p className={styles.emptyConversations}>No conversations yet</p>
              ) : (
                conversations.conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`${styles.conversationItem} ${
                      conversation.id === conversations.currentConversationId ? styles.currentConversation : ''
                    }`}
                  >
                    {conversations.editingTitleId === conversation.id ? (
                      <div className={styles.titleEditContainer}>
                        <input
                          type="text"
                          value={conversations.editingTitleValue}
                          onChange={(e) => conversations.setEditingTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              conversations.updateConversationTitle(conversation.id, conversations.editingTitleValue);
                            } else if (e.key === 'Escape') {
                              conversations.cancelEditingTitle();
                            }
                          }}
                          className={styles.titleInput}
                          autoFocus
                        />
                        <button
                          className={styles.saveButton}
                          onClick={() => conversations.updateConversationTitle(conversation.id, conversations.editingTitleValue)}
                        >
                          ✓
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={conversations.cancelEditingTitle}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.conversationInfo}>
                          <span
                            className={styles.conversationTitle}
                            onClick={() => conversations.loadConversation(conversation.id)}
                          >
                            {conversation.title}
                          </span>
                          <span className={styles.conversationMeta}>
                            {conversation.message_count} messages · {new Date(conversation.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={styles.conversationActions}>
                          <button
                            className={styles.editButton}
                            onClick={() => conversations.startEditingTitle(conversation)}
                          >
                            ✎
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => conversations.deleteConversation(conversation.id)}
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleteAllModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsDeleteAllModalOpen(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>Delete All Conversations?</h3>
            <p>This will permanently delete all your chat history. This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDeleteAllConversations}
              >
                Delete All
              </button>
              <button
                className={styles.cancelConfirmButton}
                onClick={() => setIsDeleteAllModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
