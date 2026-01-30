import type { UploadedFile } from '../../../types';
import { FileChip } from '../FileChip/FileChip';
import styles from './FileChipsDisplay.module.css';

export interface FileChipsDisplayProps {
  files: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
}

export function FileChipsDisplay({
  files,
  onRemoveFile,
}: FileChipsDisplayProps): React.JSX.Element | null {
  if (files.length === 0) return null;

  return (
    <div className={styles.fileChipsContainer}>
      {files.map(file => (
        <FileChip
          key={file.id}
          file={file}
          onRemove={() => onRemoveFile(file.id)}
        />
      ))}
    </div>
  );
}
