import { forwardRef, useRef, useImperativeHandle } from "react";
import { AlertTriangle } from "lucide-react";
import styles from "./UploadSection.module.css";

export interface UploadSectionProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  uploadError: string | null;
  filesCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onNavigateToList?: () => void;
  onNavigateUp?: () => void;
}

export interface UploadSectionRef {
  focusUploadButton: () => void;
}

export const UploadSection = forwardRef<UploadSectionRef, UploadSectionProps>(
  function UploadSection(
    {
      onUpload,
      isUploading,
      uploadError,
      fileInputRef,
      onNavigateToList,
      onNavigateUp,
    },
    ref,
  ): React.JSX.Element {
    const uploadButtonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
      focusUploadButton: () => {
        uploadButtonRef.current?.focus();
      },
    }));

    const handleUploadKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onNavigateUp?.();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onNavigateToList?.();
      }
    };

    return (
      <div className={styles.uploadSection}>
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
          onChange={onUpload}
          className="visually-hidden"
          ref={fileInputRef}
          aria-label="Upload files"
        />
        <button
          ref={uploadButtonRef}
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label={isUploading ? "Uploading files" : "Upload files"}
          onKeyDown={handleUploadKeyDown}
        >
          {isUploading ? "Uploading..." : "+ Upload Files"}
        </button>

        {uploadError && (
          <div
            className={styles.uploadError}
            role="alert"
            aria-live="assertive"
          >
            <span className={styles.errorIcon} aria-hidden="true">
              <AlertTriangle size={16} />
            </span>
            <span className={styles.errorMessage}>{uploadError}</span>
          </div>
        )}
      </div>
    );
  },
);
