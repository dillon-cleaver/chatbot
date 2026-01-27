import type { UploadedFile } from '../../../types';
import { FileItem } from '../FileItem/FileItem';
import styles from './FileList.module.css';

export interface FileListProps {
  files: UploadedFile[];
  selectedFileIds: string[];
  onToggleSelection: (fileId: string) => void;
  onViewFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
}

export function FileList({
  files,
  selectedFileIds,
  onToggleSelection,
  onViewFile,
  onDeleteFile,
}: FileListProps): React.JSX.Element {
  if (files.length === 0) {
    return (
      <div className={styles.fileList}>
        <p className={styles.emptyFiles}>Upload files to attach them to your messages</p>
      </div>
    );
  }

  return (
    <div className={styles.fileList}>
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          isSelected={selectedFileIds.includes(file.id)}
          onToggleSelection={() => onToggleSelection(file.id)}
          onView={() => onViewFile(file.id)}
          onDelete={() => onDeleteFile(file.id)}
        />
      ))}
    </div>
  );
}
