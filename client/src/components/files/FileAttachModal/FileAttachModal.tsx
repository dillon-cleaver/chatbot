import type { UploadedFile } from '../../../types';
import { MAX_FILES_PER_MESSAGE, MAX_TOTAL_FILES } from '../../../constants';
import { Modal } from '../../ui/Modal/Modal';
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
  onClearSelection: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function FileAttachModal({
  isOpen,
  onClose,
  files,
  selectedFileIds,
  onToggleSelection,
  onUpload,
  onViewFile,
  onDeleteFile,
  isUploading,
  uploadError,
  onClearSelection,
  fileInputRef,
}: FileAttachModalProps): React.JSX.Element {
  const subtitle = `${files.length}/${MAX_TOTAL_FILES} files · ${MAX_TOTAL_FILES - files.length} ${MAX_TOTAL_FILES - files.length === 1 ? 'slot' : 'slots'} available · Select up to ${MAX_FILES_PER_MESSAGE} to attach`;

  const footer = files.length > 0 ? (
    <div className={styles.modalFooter}>
      <div className={styles.footerLeft}>
        {selectedFileIds.length > 0 && (
          <button className={styles.clearSelectionButton} onClick={onClearSelection}>
            Clear Selection
          </button>
        )}
      </div>
      <button className={styles.attachCloseButton} onClick={onClose}>
        {selectedFileIds.length > 0 ? `Attach ${selectedFileIds.length} & Close` : 'Close'}
      </button>
    </div>
  ) : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attach Files" subtitle={subtitle} footer={footer}>
      <UploadSection
        onUpload={onUpload}
        isUploading={isUploading}
        uploadError={uploadError}
        filesCount={files.length}
        fileInputRef={fileInputRef}
      />

      <div className={styles.fileListSection}>
        {selectedFileIds.length > 0 && (
          <div className={styles.selectionCounterWrapper}>
            <div className={styles.selectionCounter}>
              {selectedFileIds.length} {selectedFileIds.length === 1 ? 'file' : 'files'} selected
            </div>
          </div>
        )}
        <FileList
          files={files}
          selectedFileIds={selectedFileIds}
          onToggleSelection={onToggleSelection}
          onViewFile={onViewFile}
          onDeleteFile={onDeleteFile}
        />
      </div>
    </Modal>
  );
}
