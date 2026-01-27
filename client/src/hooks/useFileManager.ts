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
  uploadFiles: (files: File[]) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  toggleFileSelection: (fileId: string) => void;
  clearSelectedFiles: () => void;
  viewFile: (fileId: string) => void;
  openModal: () => void;
  closeModal: () => void;
  removeSelectedFile: (fileId: string) => void;
}

export function useFileManager(): UseFileManagerReturn {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchFiles = useCallback(async (): Promise<void> => {
    try {
      const data = await api.fetchFiles();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFiles = async (filesToUpload: File[]): Promise<void> => {
    setIsUploading(true);
    setUploadError(null);

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
    if (!confirm('Delete this file?')) return;

    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const toggleFileSelection = (fileId: string): void => {
    setSelectedFileIds((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      } else {
        if (prev.length >= MAX_FILES_PER_MESSAGE) {
          alert(`Maximum ${MAX_FILES_PER_MESSAGE} files can be attached per message`);
          return prev;
        }
        return [...prev, fileId];
      }
    });
  };

  const removeSelectedFile = (fileId: string): void => {
    setSelectedFileIds((prev) => prev.filter((id) => id !== fileId));
  };

  const clearSelectedFiles = (): void => {
    setSelectedFileIds([]);
  };

  const viewFile = (fileId: string): void => {
    api.viewFile(fileId);
  };

  const openModal = (): void => {
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setUploadError(null);
  };

  return {
    files,
    selectedFileIds,
    isModalOpen,
    isUploading,
    uploadError,
    uploadFiles,
    deleteFile,
    toggleFileSelection,
    clearSelectedFiles,
    viewFile,
    openModal,
    closeModal,
    removeSelectedFile,
  };
}
