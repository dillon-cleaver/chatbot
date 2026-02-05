import {
  forwardRef,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
} from "react";
import { X } from "lucide-react";
import type { UploadedFile } from "../../../types";
import {
  getFileIcon,
  formatBytes,
  getFileTypeLabel,
} from "../../../utils/fileUtils";
import { Button } from "../../ui/Button";
import styles from "./FileItem.module.css";

export interface FileItemProps {
  file: UploadedFile;
  isSelected: boolean;
  onToggleSelection: () => void;
  onView: () => void;
  onDelete: () => void;
  tabIndex?: number;
  onFocus?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
}

export interface FileItemRef {
  focus: () => void;
  resetInternalFocus: () => void;
}

// Focus positions within the file item: 0 = row, 1 = view, 2 = delete
type FocusPosition = 0 | 1 | 2;

export const FileItem = forwardRef<FileItemRef, FileItemProps>(
  function FileItem(
    {
      file,
      isSelected,
      onToggleSelection,
      onView,
      onDelete,
      tabIndex = 0,
      onFocus,
      onNavigateUp,
      onNavigateDown,
    },
    ref,
  ): React.JSX.Element {
    const rowRef = useRef<HTMLDivElement>(null);
    const viewButtonRef = useRef<HTMLButtonElement>(null);
    const deleteButtonRef = useRef<HTMLButtonElement>(null);
    const [internalFocus, setInternalFocus] = useState<FocusPosition>(0);

    const fileTypeAndSize = `${getFileTypeLabel(file.mime_type)} • ${formatBytes(file.size)}`;

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        rowRef.current?.focus();
      },
      resetInternalFocus: () => {
        setInternalFocus(0);
      },
    }));

    // Focus the correct element when internal focus changes
    useEffect(() => {
      // Only apply focus if this item has tabIndex 0 (is the active item)
      if (tabIndex !== 0) return;

      switch (internalFocus) {
        case 0:
          rowRef.current?.focus();
          break;
        case 1:
          viewButtonRef.current?.focus();
          break;
        case 2:
          deleteButtonRef.current?.focus();
          break;
      }
    }, [internalFocus, tabIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          e.stopPropagation();
          if (internalFocus < 2) {
            setInternalFocus((prev) => (prev + 1) as FocusPosition);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.stopPropagation();
          if (internalFocus > 0) {
            setInternalFocus((prev) => (prev - 1) as FocusPosition);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          setInternalFocus(0); // Reset to row when navigating
          onNavigateUp?.();
          break;
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          setInternalFocus(0); // Reset to row when navigating
          onNavigateDown?.();
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          if (internalFocus === 0) {
            onToggleSelection();
          } else if (internalFocus === 1) {
            onView();
          } else if (internalFocus === 2) {
            onDelete();
          }
          break;
        case "Home":
        case "End":
          // Let parent handle Home/End for list navigation
          setInternalFocus(0);
          break;
      }
    };

    return (
      <div
        ref={rowRef}
        className={`${styles.fileItem} ${isSelected ? styles.selected : ""}`}
        role="option"
        aria-selected={isSelected}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className={styles.fileCheckbox}
          aria-label={`Select ${file.original_name}`}
          tabIndex={-1}
        />
        <span className={styles.fileIcon} aria-hidden="true">
          {getFileIcon(file.mime_type)}
        </span>
        <span className={styles.fileName}>{file.original_name}</span>
        <span className={styles.fileSize}>{fileTypeAndSize}</span>
        <Button
          ref={viewButtonRef}
          variant="message"
          className={styles.viewButton}
          onClick={onView}
          aria-label={`View ${file.original_name}`}
          tabIndex={-1}
        >
          View
        </Button>
        <Button
          ref={deleteButtonRef}
          variant="message"
          destructive
          className={styles.deleteButton}
          onClick={onDelete}
          aria-label={`Delete ${file.original_name}`}
          tabIndex={-1}
        >
          <X size={16} />
        </Button>
      </div>
    );
  },
);
