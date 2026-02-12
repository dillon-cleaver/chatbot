import { useState, useCallback, useEffect, useRef } from 'react';
import type { UploadedFile } from '../types';
import * as api from '../utils/api';
import { MAX_FILES_PER_MESSAGE } from '../constants';

export interface UseFileManagerReturn {
  files: UploadedFile[];
  selectedFileIds: string[];
  isModalOpen: boolean;
  isUploading: boolean;
  uploadError: string | null;
  error: string | null;
  clearError: () => void;
  uploadFiles: (files: File[]) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  toggleFileSelection: (fileId: string) => void;
  clearSelectedFiles: () => void;
  commitPendingSelection: (fileIds: string[]) => void;
  viewFile: (fileId: string) => void;
  openModal: () => void;
  closeModal: () => void;
  removeSelectedFile: (fileId: string) => void;
  getFileObject: (fileId: string) => File | undefined;
}

// Helper to get localStorage key for a specific conversation
const getStorageKey = (conversationId: string | null): string => {
  return `chatbot_selected_files_${conversationId || 'home'}`;
};

// Helper to load selected files for a conversation from localStorage
const loadSelectedFiles = (conversationId: string | null): string[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(conversationId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save selected files for a conversation to localStorage
const saveSelectedFiles = (conversationId: string | null, fileIds: string[]): void => {
  try {
    localStorage.setItem(getStorageKey(conversationId), JSON.stringify(fileIds));
  } catch (error) {
    console.error('Failed to save selected files to localStorage:', error);
  }
};

export interface UseFileManagerOptions {
  conversationId: string | null;
  onUploadSuccess?: (count: number) => void;
  onDeleteSuccess?: () => void;
}

export function useFileManager({
  conversationId,
  onUploadSuccess,
  onDeleteSuccess,
}: UseFileManagerOptions): UseFileManagerReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(() => loadSelectedFiles(conversationId));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(conversationId);
  const [fileObjects, setFileObjects] = useState<Map<string, File>>(new Map());

  const fetchFiles = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const data = await api.fetchFiles();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError('Failed to load files. Please try again.');
    }
  }, []);

  useEffect(() => {
    const loadAndValidateFiles = async () => {
      await fetchFiles();
    };
    loadAndValidateFiles();
  }, [fetchFiles]);

  // Validate selected file IDs against actual files (remove orphaned selections)
  useEffect(() => {
    const validFileIds = new Set(files.map(f => f.id));
    const orphanedIds = selectedFileIds.filter(id => !validFileIds.has(id));

    if (orphanedIds.length > 0) {
      console.warn(`Removing ${orphanedIds.length} orphaned file selections:`, orphanedIds);
      setSelectedFileIds(prev => prev.filter(id => validFileIds.has(id)));
    }
  }, [files, selectedFileIds]);

  // Save current selections when conversation changes (before switching)
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      // Save current selections for the previous conversation
      saveSelectedFiles(prevConversationIdRef.current, selectedFileIds);

      // Load selections for the new conversation
      const newSelections = loadSelectedFiles(conversationId);
      setSelectedFileIds(newSelections);

      // Update ref for next change
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId, selectedFileIds]);

  // Persist selected file IDs to localStorage whenever they change
  useEffect(() => {
    saveSelectedFiles(conversationId, selectedFileIds);
  }, [conversationId, selectedFileIds]);

  const uploadFiles = async (filesToUpload: File[]): Promise<void> => {
    setIsUploading(true);
    setUploadError(null);
    setError(null);

    try {
      const newFiles = await api.uploadFiles(filesToUpload);
      setFiles((prev) => [...newFiles, ...prev]);

      // Store File objects mapped by their new IDs
      setFileObjects((prev) => {
        const updated = new Map(prev);
        filesToUpload.forEach((file, index) => {
          updated.set(newFiles[index].id, file);
        });
        return updated;
      });

      setUploadError(null);
      onUploadSuccess?.(newFiles.length);
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload files. Please try again.';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileId: string): Promise<void> => {
    if (!window.confirm('Delete this file?')) return;

    setError(null);
    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));

      // Remove from File objects map
      setFileObjects((prev) => {
        const updated = new Map(prev);
        updated.delete(fileId);
        return updated;
      });

      onDeleteSuccess?.();
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete file. Please try again.');
    }
  };

  const toggleFileSelection = (fileId: string): void => {
    setSelectedFileIds((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      } else {
        if (prev.length >= MAX_FILES_PER_MESSAGE) {
          setError(`Maximum ${MAX_FILES_PER_MESSAGE} files can be attached per message.`);
          return prev;
        }
        return [...prev, fileId];
      }
    });
  };

  const removeSelectedFile = useCallback((fileId: string): void => {
    setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
  }, []);

  const clearSelectedFiles = useCallback((): void => {
    setSelectedFileIds([]);
  }, []);

  const commitPendingSelection = useCallback((fileIds: string[]): void => {
    if (fileIds.length > MAX_FILES_PER_MESSAGE) {
      // Truncate to max and provide user feedback
      const truncated = fileIds.slice(0, MAX_FILES_PER_MESSAGE);
      setError(`Maximum ${MAX_FILES_PER_MESSAGE} files allowed. Keeping first ${MAX_FILES_PER_MESSAGE}.`);
      setSelectedFileIds(truncated);
      return;
    }
    setSelectedFileIds(fileIds);
  }, []);

  const viewFile = useCallback((fileId: string): void => {
    api.viewFile(fileId);
  }, []);

  const openModal = useCallback((): void => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback((): void => {
    setIsModalOpen(false);
    setUploadError(null);
  }, []);

  return {
    files,
    selectedFileIds,
    isModalOpen,
    isUploading,
    uploadError,
    error,
    clearError: () => setError(null),
    uploadFiles,
    deleteFile,
    toggleFileSelection,
    clearSelectedFiles,
    commitPendingSelection,
    viewFile,
    openModal,
    closeModal,
    removeSelectedFile,
    getFileObject: (fileId: string) => fileObjects.get(fileId),
  };
}
