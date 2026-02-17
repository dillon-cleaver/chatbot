import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { UploadedFile } from "../../../types";
import { MAX_TOTAL_FILES, MAX_FILES_PER_MESSAGE } from "../../../constants";
import { Modal } from "../../ui/Modal/Modal";
import { FileChipsDisplay } from "../../chat/FileChipsDisplay/FileChipsDisplay";
import type { FileChipsDisplayRef } from "../../chat/FileChipsDisplay/FileChipsDisplay";
import { UploadSection } from "../UploadSection/UploadSection";
import type { UploadSectionRef } from "../UploadSection/UploadSection";
import { FileList } from "../FileList/FileList";
import type { FileListRef } from "../FileList/FileList";
import { AlertDialog } from "../../ui/AlertDialog/AlertDialog";
import { StorageIndicator } from "../../ui/StorageIndicator/StorageIndicator";
import styles from "./FileAttachModal.module.css";

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
  onClearSelection: () => void;
  onCommitSelection: (fileIds: string[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  storageUsage: number;
  storageQuota: number;
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
  onCommitSelection,
  fileInputRef,
  storageUsage,
  storageQuota,
}: FileAttachModalProps): React.JSX.Element {
  // Local pending selection state
  const [pendingFileIds, setPendingFileIds] =
    useState<string[]>(selectedFileIds);
  const [showLimitWarning, setShowLimitWarning] = useState<boolean>(false);

  // Refs for keyboard navigation between sections
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const uploadSectionRef = useRef<UploadSectionRef>(null);
  const fileChipsRef = useRef<FileChipsDisplayRef>(null);
  const fileListRef = useRef<FileListRef>(null);

  // Initialize pending state when modal opens
  // Note: We only sync when modal opens, not when selectedFileIds changes externally.
  // This implements the "pending state" pattern where changes are isolated until commit.
  useEffect(() => {
    if (isOpen) {
      setPendingFileIds(selectedFileIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Remove deleted files from pending selections
  useEffect(() => {
    const validIds = new Set(files.map((f) => f.id));
    setPendingFileIds((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [files]);

  // Auto-select newly uploaded files while the modal is open
  const prevFileIdsRef = useRef<Set<string>>(new Set(files.map((f) => f.id)));

  useEffect(() => {
    const prevIds = prevFileIdsRef.current;
    const newFileIds = files
      .filter((f) => !prevIds.has(f.id))
      .map((f) => f.id);

    if (isOpen && newFileIds.length > 0) {
      setPendingFileIds((prev) => {
        const remaining = MAX_FILES_PER_MESSAGE - prev.length;
        if (remaining <= 0) {
          setShowLimitWarning(true);
          return prev;
        }
        const toAdd = newFileIds.slice(0, remaining);
        if (toAdd.length < newFileIds.length) {
          setShowLimitWarning(true);
        }
        return [...prev, ...toAdd];
      });
    }

    prevFileIdsRef.current = new Set(files.map((f) => f.id));
  }, [files, isOpen]);

  // Local toggle handler for pending selections
  const handleTogglePending = (fileId: string): void => {
    setPendingFileIds((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      } else {
        // Prevent adding more than MAX_FILES_PER_MESSAGE
        if (prev.length >= MAX_FILES_PER_MESSAGE) {
          setShowLimitWarning(true);
          return prev;
        }
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

  // Keyboard navigation handlers

  // Navigate from close button down to upload section
  const handleCloseButtonKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      uploadSectionRef.current?.focusUploadButton();
    }
  }, []);

  // Navigate from upload section up to close button
  const handleNavigateToCloseButton = useCallback(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Navigate down from selection bar to file list
  const handleNavigateToList = useCallback(() => {
    fileListRef.current?.focusFirstItem();
  }, []);

  // Navigate up from file list - go to selection bar if files selected, otherwise to collapsible
  const handleNavigateUpFromList = useCallback(() => {
    if (pendingFileIds.length > 0) {
      fileChipsRef.current?.focusAttachButton();
    } else {
      uploadSectionRef.current?.focusCollapsible();
    }
  }, [pendingFileIds.length]);

  // Navigate down from upload section to file list (or selection bar if files selected)
  const handleNavigateFromUploadToList = useCallback(() => {
    if (pendingFileIds.length > 0) {
      fileChipsRef.current?.focusAttachButton();
    } else if (files.length > 0) {
      fileListRef.current?.focusFirstItem();
    }
  }, [pendingFileIds.length, files.length]);

  // Get selected file objects for display
  const selectedFiles = useMemo(
    () => files.filter((f) => pendingFileIds.includes(f.id)),
    [files, pendingFileIds],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Attach Files to Chat"
      bodyClassName={styles.noScrollBody}
      closeButtonRef={closeButtonRef}
      onCloseButtonKeyDown={handleCloseButtonKeyDown}
    >
      <div className={styles.modalBodyContent}>
        <UploadSection
          ref={uploadSectionRef}
          onUpload={onUpload}
          isUploading={isUploading}
          uploadError={uploadError}
          filesCount={files.length}
          fileInputRef={fileInputRef}
          onNavigateToList={handleNavigateFromUploadToList}
          onNavigateUp={handleNavigateToCloseButton}
        />

        <div className={styles.fileListSection}>
          <div className={styles.scrollableContent}>
            <div
              className={`${styles.selectionCounterWrapper} ${pendingFileIds.length > 0 ? styles.visible : ""}`}
            >
              <FileChipsDisplay
                ref={fileChipsRef}
                files={selectedFiles}
                onRemoveFile={handleTogglePending}
                onClearAll={handleClearPending}
                onAdd={handleClose}
                showFileChips={false}
                showHelperText={false}
                onNavigateToList={handleNavigateToList}
              />
            </div>
            <FileList
              ref={fileListRef}
              files={files}
              selectedFileIds={pendingFileIds}
              onToggleSelection={handleTogglePending}
              onViewFile={onViewFile}
              onDeleteFile={onDeleteFile}
              onNavigateUp={handleNavigateUpFromList}
            />
            <div className={styles.localFilesHint}>
              <StorageIndicator
                label={`${files.length} / ${MAX_TOTAL_FILES} files`}
                storageUsage={storageUsage}
                storageQuota={storageQuota}
              />
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={showLimitWarning}
        onClose={() => setShowLimitWarning(false)}
        title="File Limit Reached"
        message={`You can attach a maximum of ${MAX_FILES_PER_MESSAGE} files per message. Please deselect a file before adding another.`}
      />
    </Modal>
  );
}
