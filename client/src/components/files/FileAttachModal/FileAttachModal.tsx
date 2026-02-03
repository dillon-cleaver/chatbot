import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { UploadedFile } from '../../../types';
import { MAX_TOTAL_FILES } from '../../../constants';
import { Modal } from '../../ui/Modal/Modal';
import { FileChipsDisplay } from '../../chat/FileChipsDisplay/FileChipsDisplay';
import { UploadSection } from '../UploadSection/UploadSection';
import { FileList } from '../FileList/FileList';
import styles from './FileAttachModal.module.css';

export interface FileAttachModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: UploadedFile[];
  selectedFileIds: string[];
  onToggleSelection: (fileId: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onViewFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  isUploading: boolean;
  uploadError: string | null;
  error: string | null;
  onClearError: () => void;
  onClearSelection: () => void;
  onCommitSelection: (fileIds: string[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function FileAttachModal({
  isOpen,
  onClose,
  files,
  selectedFileIds,
  onUpload,
  onViewFile,
  onDeleteFile,
  isUploading,
  uploadError,
  error,
  onClearError,
  onCommitSelection,
  fileInputRef,
}: FileAttachModalProps): React.JSX.Element {
  // Local pending selection state
  const [pendingFileIds, setPendingFileIds] = useState<string[]>(selectedFileIds);

  // Initialize pending state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingFileIds(selectedFileIds);
    }
  }, [isOpen, selectedFileIds]);

  // Local toggle handler for pending selections
  const handleTogglePending = (fileId: string): void => {
    setPendingFileIds(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  // Clear pending selections
  const handleClearPending = (): void => {
    setPendingFileIds([]);
  };

  // Commit pending selections and close
  const handleClose = (): void => {
    onCommitSelection(pendingFileIds);
    onClose();
  };

  // Get selected file objects for display
  const selectedFiles = useMemo(
    () => files.filter(f => pendingFileIds.includes(f.id)),
    [files, pendingFileIds]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Attach Files to Chat"
      bodyClassName={styles.noScrollBody}
    >
      <div className={styles.modalBodyContent}>
        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={18} className={styles.errorIcon} />
            <span className={styles.errorText}>{error}</span>
            <button onClick={onClearError} className={styles.errorDismiss} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}
        <UploadSection
          onUpload={onUpload}
          isUploading={isUploading}
          uploadError={uploadError}
          filesCount={files.length}
          fileInputRef={fileInputRef}
        />

        <div className={styles.fileListSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionHeading}>Local File Library</h3>
            <span className={styles.fileSlotsInfo}>
              {files.length}/{MAX_TOTAL_FILES} file slots used
            </span>
          </div>
          <div className={styles.scrollableContent}>
            <div className={`${styles.selectionCounterWrapper} ${pendingFileIds.length > 0 ? styles.visible : ''}`}>
              <FileChipsDisplay
                files={selectedFiles}
                onRemoveFile={handleTogglePending}
                onClearAll={handleClearPending}
                onAdd={handleClose}
                showFileChips={false}
                showHelperText={false}
              />
            </div>
            <FileList
              files={files}
              selectedFileIds={pendingFileIds}
              onToggleSelection={handleTogglePending}
              onViewFile={onViewFile}
              onDeleteFile={onDeleteFile}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
