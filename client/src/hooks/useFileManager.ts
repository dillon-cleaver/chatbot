import { useState, useCallback, useEffect } from 'react';
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
}

const SELECTED_FILES_KEY = 'chatbot_selected_files';

export function useFileManager(): UseFileManagerReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(() => {
    // Load selected files from localStorage on initialization
    try {
      const stored = localStorage.getItem(SELECTED_FILES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Persist selected file IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_FILES_KEY, JSON.stringify(selectedFileIds));
    } catch (error) {
      console.error('Failed to save selected files to localStorage:', error);
    }
  }, [selectedFileIds]);

  const uploadFiles = async (filesToUpload: File[]): Promise<void> => {
    setIsUploading(true);
    setUploadError(null);
    setError(null);

    try {
      const newFiles = await api.uploadFiles(filesToUpload);
      setFiles((prev) => [...newFiles, ...prev]);
      setUploadError(null);
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
  };
}
