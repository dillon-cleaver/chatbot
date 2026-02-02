import { useState } from 'react';
import type { UploadedFile } from '../../../types';
import { MAX_FILES_PER_MESSAGE, MAX_TOTAL_FILES } from '../../../constants';
import { Modal } from '../../ui/Modal/Modal';
import { Button } from '../../ui/Button';
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
  const [showDetails, setShowDetails] = useState(false);

  const subtitle = (
    <>
      <p>
        Attach files to analyze content across multiple documents, find patterns, search efficiently, and connect
        information.
      </p>
      <button
        className={styles.detailsToggle}
        onClick={() => setShowDetails(!showDetails)}
        aria-label={showDetails ? 'Hide details' : 'Show details'}
        aria-expanded={showDetails}
      >
        <span className={`${styles.chevron} ${showDetails ? styles.chevronUp : ''}`}>▼</span>
      </button>
      {showDetails && (
        <div className={styles.detailsContent}>
          <p>
            <strong>Storage & Privacy:</strong> Files are stored on your computer by the local server. File contents
            are only sent to Anthropic's API when you submit messages. Anthropic retains requests for 30 days for
            safety monitoring, then deletes them. Your data is not used for model training.
          </p>
          <p>
            <strong>Context Window:</strong> The chatbot can process approximately 150,000 words at once (200K tokens,
            roughly 500 pages of text). This includes all attached files plus conversation history. Max{' '}
            <strong>{MAX_FILES_PER_MESSAGE}</strong> attachments per message sent.
          </p>
          <p>
            <strong>How It Works:</strong> Once attached, files remain in the chat context until you remove them. Each
            message you send includes the content of all attached files, allowing cross-file analysis and
            pattern-finding.
          </p>
          <p>
            <strong>Best Practices:</strong> Attach relevant files before asking questions. Remove files when no longer
            needed to conserve context space. Larger files consume more context, leaving less room for conversation.
          </p>
        </div>
      )}
    </>
  );

  const footer = files.length > 0 ? (
    <div className={styles.modalFooter}>
      <div className={styles.footerLeft}>
        {selectedFileIds.length > 0 && (
          <Button variant="chunky" className={styles.clearSelectionButton} onClick={onClearSelection}>
            Clear Selection
          </Button>
        )}
      </div>
      <Button variant="chunky" className={styles.attachCloseButton} onClick={onClose}>
        {selectedFileIds.length > 0 ? `Attach ${selectedFileIds.length} & Close` : 'Close'}
      </Button>
    </div>
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attach Files to Chat"
      subtitle={subtitle}
      footer={footer}
      bodyClassName={styles.noScrollBody}
    >
      <div className={styles.modalBodyContent}>
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
      </div>
    </Modal>
  );
}
