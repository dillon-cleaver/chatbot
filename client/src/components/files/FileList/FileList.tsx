import {
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { UploadedFile } from "../../../types";
import { FileItem } from "../FileItem/FileItem";
import type { FileItemRef } from "../FileItem/FileItem";
import { EmptyState } from "../../ui/EmptyState/EmptyState";
import styles from "./FileList.module.css";

export interface FileListProps {
  files: UploadedFile[];
  selectedFileIds: string[];
  onToggleSelection: (fileId: string) => void;
  onViewFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onNavigateUp?: () => void;
}

export interface FileListRef {
  focusFirstItem: () => void;
}

export const FileList = forwardRef<FileListRef, FileListProps>(
  function FileList(
    {
      files,
      selectedFileIds,
      onToggleSelection,
      onViewFile,
      onDeleteFile,
      onNavigateUp,
    },
    ref,
  ): React.JSX.Element {
    const [focusedIndex, setFocusedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(FileItemRef | null)[]>([]);

    // Clamp focused index to valid range
    const clampedFocusedIndex = Math.min(
      Math.max(0, focusedIndex),
      Math.max(0, files.length - 1),
    );

    useImperativeHandle(ref, () => ({
      focusFirstItem: () => {
        setFocusedIndex(0);
        itemRefs.current[0]?.resetInternalFocus();
        itemRefs.current[0]?.focus();
      },
    }));

    // Navigate to a specific index
    const navigateToIndex = useCallback(
      (newIndex: number) => {
        if (newIndex >= 0 && newIndex < files.length) {
          setFocusedIndex(newIndex);
          itemRefs.current[newIndex]?.resetInternalFocus();
          itemRefs.current[newIndex]?.focus();
        }
      },
      [files.length],
    );

    // Handle navigation from FileItem
    const handleItemNavigateUp = useCallback(
      (index: number) => {
        if (index === 0) {
          onNavigateUp?.();
        } else {
          navigateToIndex(index - 1);
        }
      },
      [onNavigateUp, navigateToIndex],
    );

    const handleItemNavigateDown = useCallback(
      (index: number) => {
        if (index < files.length - 1) {
          navigateToIndex(index + 1);
        }
      },
      [files.length, navigateToIndex],
    );

    // Handle Home/End at list level
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (files.length === 0) return;

        switch (e.key) {
          case "Home":
            e.preventDefault();
            navigateToIndex(0);
            break;
          case "End":
            e.preventDefault();
            navigateToIndex(files.length - 1);
            break;
        }
      },
      [files.length, navigateToIndex],
    );

    if (files.length === 0) {
      return <EmptyState>Upload files to attach them to your messages</EmptyState>;
    }

    return (
      <div
        ref={listRef}
        className={styles.fileList}
        role="listbox"
        aria-label="Uploaded files. Use arrow keys to navigate, left and right to access view and delete buttons."
        aria-multiselectable="true"
        onKeyDown={handleKeyDown}
      >
        {files.map((file, index) => (
          <FileItem
            key={file.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            file={file}
            isSelected={selectedFileIds.includes(file.id)}
            onToggleSelection={() => onToggleSelection(file.id)}
            onView={() => onViewFile(file.id)}
            onDelete={() => onDeleteFile(file.id)}
            tabIndex={index === clampedFocusedIndex ? 0 : -1}
            onFocus={() => setFocusedIndex(index)}
            onNavigateUp={() => handleItemNavigateUp(index)}
            onNavigateDown={() => handleItemNavigateDown(index)}
          />
        ))}
      </div>
    );
  },
);
