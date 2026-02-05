import { forwardRef, useImperativeHandle, useRef } from "react";
import { Check } from "lucide-react";
import type { UploadedFile } from "../../../types";
import { FileChip } from "../FileChip/FileChip";
import { Button } from "../../ui/Button";
import styles from "./FileChipsDisplay.module.css";

export interface FileChipsDisplayProps {
  files: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  onClearAll?: () => void;
  onAdd?: () => void;
  showFileChips?: boolean;
  showHelperText?: boolean;
  onNavigateToList?: () => void;
}

export interface FileChipsDisplayRef {
  focusAttachButton: () => void;
}

export const FileChipsDisplay = forwardRef<
  FileChipsDisplayRef,
  FileChipsDisplayProps
>(function FileChipsDisplay(
  {
    files,
    onRemoveFile,
    onClearAll,
    onAdd,
    showFileChips = true,
    showHelperText = true,
    onNavigateToList,
  },
  ref,
): React.JSX.Element | null {
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    focusAttachButton: () => {
      attachButtonRef.current?.focus();
    },
  }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && onNavigateToList) {
      e.preventDefault();
      onNavigateToList();
    }

    // Arrow navigation between ATTACH and CLEAR buttons
    if (
      e.key === "ArrowRight" &&
      document.activeElement === attachButtonRef.current
    ) {
      e.preventDefault();
      clearButtonRef.current?.focus();
    }

    if (
      e.key === "ArrowLeft" &&
      document.activeElement === clearButtonRef.current
    ) {
      e.preventDefault();
      attachButtonRef.current?.focus();
    }
  };

  if (files.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.selectionBox}>
        <div className={styles.selectionInfo}>
          <div className={styles.count} role="status" aria-live="polite">
            <Check size={20} aria-hidden="true" />
            {files.length} {files.length === 1 ? "file" : "files"} selected
          </div>
          {showHelperText && (
            <span className={styles.helperText} role="note">
              Sent with next message only. Message history provides context for
              follow-ups.
            </span>
          )}
        </div>
        <div className={styles.buttonGroup} onKeyDown={handleKeyDown}>
          {onAdd && (
            <Button
              ref={attachButtonRef}
              variant="message"
              className={styles.addButton}
              onClick={onAdd}
              aria-label={`Attach ${files.length} selected ${files.length === 1 ? "file" : "files"}`}
            >
              Attach
            </Button>
          )}
          {onClearAll && (
            <Button
              ref={clearButtonRef}
              variant="message"
              destructive
              className={styles.clearButton}
              onClick={onClearAll}
              aria-label="Clear all selected files"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      {showFileChips && (
        <div className={styles.fileChipsContainer}>
          {files.map((file) => (
            <FileChip
              key={file.id}
              file={file}
              onRemove={() => onRemoveFile(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
