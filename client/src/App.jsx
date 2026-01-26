import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './App.module.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [files, setFiles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchFiles();
    fetchConversations();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:3000/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:3000/conversations');
      const data = await response.json();
      setConversations(data);

      // Auto-load the most recent conversation
      if (data.length > 0 && messages.length === 0) {
        loadConversation(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const response = await fetch(`http://localhost:3000/conversations/${conversationId}`);
      const data = await response.json();

      // Set messages from conversation
      setMessages(data.messages.map(msg => {
        // Parse content if it's JSON (from messages with file attachments)
        let content = msg.content;
        try {
          const parsed = JSON.parse(msg.content);
          // If it's an array of content blocks, extract the text from the first block
          if (Array.isArray(parsed) && parsed[0]?.type === 'text') {
            content = parsed[0].text;
          }
        } catch {
          // Content is already a plain string, use as-is
        }

        return {
          role: msg.role,
          content: content
        };
      }));

      setCurrentConversationId(conversationId);
      setIsHistoryModalOpen(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      alert('Failed to load conversation. Please try again.');
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    clearSelectedFiles();
    setIsHistoryModalOpen(false);
  };

  const deleteConversation = async (conversationId) => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;

    try {
      const response = await fetch(`http://localhost:3000/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Remove from list
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If it's the current conversation, clear it
      if (conversationId === currentConversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const deleteAllConversations = async () => {
    try {
      const response = await fetch('http://localhost:3000/conversations', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setConversations([]);
      startNewConversation();
      setIsDeleteAllModalOpen(false);
      setIsHistoryModalOpen(false);
    } catch (error) {
      console.error('Failed to delete all conversations:', error);
      alert('Failed to delete conversations. Please try again.');
    }
  };

  const updateConversationTitle = async (conversationId, newTitle) => {
    if (!newTitle.trim()) return;

    try {
      const response = await fetch(`http://localhost:3000/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      // Update in local state
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, title: newTitle } : c
      ));

      setEditingTitleId(null);
      setEditingTitleValue('');
    } catch (error) {
      console.error('Failed to update title:', error);
      alert('Failed to update title. Please try again.');
    }
  };

  const startEditingTitle = (conversation) => {
    setEditingTitleId(conversation.id);
    setEditingTitleValue(conversation.title);
  };

  const cancelEditingTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null); // Clear previous errors

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to get the error message from the server response
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || errorData?.details || 'Upload failed';
        throw new Error(errorMessage);
      }

      const newFiles = await response.json();
      setFiles((prev) => [...newFiles, ...prev]);
      setUploadError(null); // Clear error on success
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewFile = (fileId) => {
    window.open(`http://localhost:3000/files/${fileId}`, '_blank');
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return;

    try {
      const response = await fetch(`http://localhost:3000/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      // Remove from selected files if it was selected
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
    return '📎';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        // Deselect file
        return prev.filter(id => id !== fileId);
      } else {
        // Check if already at limit
        if (prev.length >= 5) {
          alert('Maximum 5 files can be attached per message');
          return prev;
        }
        // Select file
        return [...prev, fileId];
      }
    });
  };

  const removeSelectedFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  const attachFilesAndClose = () => {
    setIsModalOpen(false);
    setUploadError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUploadError(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          fileIds: selectedFiles.length > 0 ? selectedFiles : undefined,
          conversation_id: currentConversationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.content }]);

      // Set conversation ID if it's a new conversation
      if (!currentConversationId) {
        setCurrentConversationId(data.conversation_id);
      }

      // Refresh conversation list to update timestamps/counts
      fetchConversations();

      // Clear selected files after successful send
      clearSelectedFiles();
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Chatbot</h1>
          {selectedFiles.length > 0 && (
            <span className={styles.contextIndicator}>
              Selected: {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <button className={styles.historyButton} onClick={() => setIsHistoryModalOpen(true)}>
            💬
          </button>
          <button className={styles.fileButton} onClick={() => setIsModalOpen(true)}>
            📁
          </button>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className={styles.chatContainer}>
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <p>Start a conversation with the chatbot!</p>
            </div>
          )}
          {messages.map((msg, idx) => (
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
          {isLoading && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageContent}>Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={styles.inputContainer}>
          {selectedFiles.length > 0 && (
            <div className={styles.fileChipsContainer}>
              {selectedFiles.map(fileId => {
                const file = files.find(f => f.id === fileId);
                return file ? (
                  <div key={fileId} className={styles.fileChip}>
                    <span className={styles.fileChipIcon}>{getFileIcon(file.mime_type)}</span>
                    <span className={styles.fileChipName}>{file.original_name}</span>
                    <button
                      className={styles.fileChipRemove}
                      onClick={() => removeSelectedFile(fileId)}
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
              onClick={() => setIsModalOpen(true)}
              title="Attach files"
            >
              📁
            </button>
            <textarea
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className={styles.sendButton}
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderText}>
                <h2>Attach Files</h2>
                <p className={styles.modalSubtitle}>
                  {files.length}/20 files · {20 - files.length} {20 - files.length === 1 ? 'slot' : 'slots'} available · Select up to 5 to attach
                </p>
              </div>
              <button className={styles.closeButton} onClick={closeModal}>
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
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : '+ Upload Files'}
              </button>

              {uploadError && (
                <div className={styles.uploadError}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <span className={styles.errorMessage}>{uploadError}</span>
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
              <div className={`${styles.selectionCounterWrapper} ${selectedFiles.length > 0 ? styles.visible : ''}`}>
                <div className={styles.selectionCounter}>
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                </div>
              </div>
              <div className={styles.fileList}>
                {files.length === 0 ? (
                  <p className={styles.emptyFiles}>Upload files to attach them to your messages</p>
                ) : (
                  files.map((file) => (
                    <div key={file.id} className={styles.fileItem}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className={styles.fileCheckbox}
                      />
                      <span className={styles.fileIcon}>{getFileIcon(file.mime_type)}</span>
                      <span className={styles.fileName}>{file.original_name}</span>
                      <span className={styles.fileSize}>{formatBytes(file.size)}</span>
                      <button className={styles.viewButton} onClick={() => handleViewFile(file.id)}>
                        View
                      </button>
                      <button className={styles.deleteButton} onClick={() => handleDeleteFile(file.id)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {files.length > 0 && (
              <div className={styles.modalFooter}>
                <div className={styles.footerLeft}>
                  {selectedFiles.length > 0 && (
                    <button className={styles.clearSelectionButton} onClick={clearSelectedFiles}>
                      Clear Selection
                    </button>
                  )}
                </div>
                <button className={styles.attachCloseButton} onClick={attachFilesAndClose}>
                  {selectedFiles.length > 0 ? `Attach ${selectedFiles.length} & Close` : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsHistoryModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chat History</h2>
              <button className={styles.closeButton} onClick={() => setIsHistoryModalOpen(false)}>
                ×
              </button>
            </div>

            <div className={styles.historyActions}>
              <button className={styles.newChatButton} onClick={startNewConversation}>
                + New Chat
              </button>
              {conversations.length > 0 && (
                <button
                  className={styles.deleteAllButton}
                  onClick={() => setIsDeleteAllModalOpen(true)}
                >
                  Delete All
                </button>
              )}
            </div>

            <div className={styles.conversationList}>
              {conversations.length === 0 ? (
                <p className={styles.emptyConversations}>No conversations yet</p>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`${styles.conversationItem} ${
                      conversation.id === currentConversationId ? styles.currentConversation : ''
                    }`}
                  >
                    {editingTitleId === conversation.id ? (
                      <div className={styles.titleEditContainer}>
                        <input
                          type="text"
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateConversationTitle(conversation.id, editingTitleValue);
                            } else if (e.key === 'Escape') {
                              cancelEditingTitle();
                            }
                          }}
                          className={styles.titleInput}
                          autoFocus
                        />
                        <button
                          className={styles.saveButton}
                          onClick={() => updateConversationTitle(conversation.id, editingTitleValue)}
                        >
                          ✓
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={cancelEditingTitle}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.conversationInfo}>
                          <span
                            className={styles.conversationTitle}
                            onClick={() => loadConversation(conversation.id)}
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
                            onClick={() => startEditingTitle(conversation)}
                          >
                            ✎
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => deleteConversation(conversation.id)}
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
                onClick={deleteAllConversations}
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
