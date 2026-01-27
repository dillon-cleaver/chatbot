import styles from './UploadSection.module.css';

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
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
      <button
        className={styles.uploadButton}
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : '+ Upload Files'}
      </button>

      {uploadError && (
        <div className={styles.uploadError}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorMessage}>{uploadError}</span>
        </div>
      )}

      <div className={styles.fileTypeInfo}>
        <p className={styles.fileTypeSupported}>
          <strong>Supported:</strong> PDF, DOCX, XLSX, PPTX, PNG, JPEG, GIF, WebP, TXT, CSV
        </p>
        <p className={styles.fileTypeUnsupported}>
          <strong>Not supported:</strong> Legacy formats (.doc, .xls, .ppt)
        </p>
      </div>
    </div>
  );
}
