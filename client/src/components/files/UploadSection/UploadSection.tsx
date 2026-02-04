import { AlertTriangle } from "lucide-react";
import { CollapsibleSection } from "../../ui/CollapsibleSection/CollapsibleSection";
import { MAX_FILES_PER_MESSAGE } from "../../../constants";
import styles from "./UploadSection.module.css";

export interface UploadSectionProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  uploadError: string | null;
  filesCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UploadSection({
  onUpload,
  isUploading,
  uploadError,
  fileInputRef,
}: UploadSectionProps): React.JSX.Element {
  return (
    <div className={styles.uploadSection}>
      <input
        type="file"
        multiple
        onChange={onUpload}
        className={styles.visuallyHidden}
        ref={fileInputRef}
        aria-label="Upload files"
      />
      <button
        className={styles.uploadButton}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label={isUploading ? "Uploading files" : "Upload files"}
      >
        {isUploading ? "Uploading..." : "+ Upload Files"}
      </button>

      {uploadError && (
        <div className={styles.uploadError} role="alert" aria-live="assertive">
          <span className={styles.errorIcon} aria-hidden="true">
            <AlertTriangle size={16} />
          </span>
          <span className={styles.errorMessage}>{uploadError}</span>
        </div>
      )}

      <CollapsibleSection
        label="How Chatbot Works"
        defaultOpen={false}
        className={styles.infoSection}
      >
        <p>
          Attach files to analyze content across multiple documents, find
          patterns, search efficiently, and connect information.
        </p>
        <p>
          <strong>Context Window:</strong> The chatbot processes approximately
          150,000 words at once (200K tokens, roughly 500 pages of text),
          including both attached files and conversation history. You can attach
          up to <strong>{MAX_FILES_PER_MESSAGE}</strong> files per message.
        </p>
        <p>
          <strong>File Handling:</strong> Files are sent with one message only,
          then auto-removed from selection. The chatbot remembers your
          conversation history, so it can still reference previous file
          discussions.
        </p>
        <p className={styles.fileTypes}>
          <strong>Supported Files:</strong>{" "}
          <span className={styles.fileTypeSupported}>
            PDF, DOCX, XLSX, PPTX, PNG, JPEG, GIF, WebP, TXT, CSV
          </span>
          . Legacy formats{" "}
          <span className={styles.fileTypeUnsupported}>(.doc, .xls, .ppt)</span>{" "}
          are not supported.
        </p>
        <p>
          <strong>Storage & Privacy:</strong> Files are stored locally on your
          computer. Contents are only sent to Anthropic when you submit messages
          (retained 30 days for safety monitoring, then deleted). Your data is
          not used for training.
        </p>
        <p>
          <strong>Best Practices:</strong> Large files combined with long
          conversation history may exceed the 200K token limit on that message.
          Keep files relevant to your question.
        </p>
      </CollapsibleSection>
    </div>
  );
}
