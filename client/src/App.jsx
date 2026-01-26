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
  const [selectedFiles, setSelectedFiles] = useState([]);
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

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const newFiles = await response.json();
      setFiles((prev) => [...newFiles, ...prev]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload files. Please try again.');
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
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const removeSelectedFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
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
          fileIds: selectedFiles.length > 0 ? selectedFiles : undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.content }]);

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
          <button className={styles.fileButton} onClick={() => setIsModalOpen(true)}>
            📎 {files.length > 0 && <span className={styles.fileBadge}>{files.length}</span>}
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
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Files</h2>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
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
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>

            <div className={styles.fileList}>
              {files.length === 0 ? (
                <p className={styles.emptyFiles}>No files uploaded yet</p>
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
        </div>
      )}
    </div>
  );
}

export default App;
