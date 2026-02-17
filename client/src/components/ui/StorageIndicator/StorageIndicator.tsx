import { formatBytes } from "../../../utils/fileUtils";
import styles from "./StorageIndicator.module.css";

export interface StorageIndicatorProps {
  label: string;
  storageUsage: number;
  storageQuota: number;
}

export function StorageIndicator({
  label,
  storageUsage,
  storageQuota,
}: StorageIndicatorProps): React.JSX.Element {
  const storagePercent =
    storageQuota > 0
      ? Math.min(100, Math.round((storageUsage / storageQuota) * 100))
      : 0;
  const showBar = storageQuota > 0;

  return (
    <div className={styles.storageIndicator}>
      <p className={styles.label}>{label}</p>
      {showBar && (
        <>
          <div
            className={styles.bar}
            role="progressbar"
            aria-valuenow={storagePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} usage`}
          >
            <div
              className={`${styles.barFill}${storagePercent > 80 ? ` ${styles.warning}` : ""}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          <p className={styles.text}>
            {formatBytes(storageUsage)} used of {formatBytes(storageQuota)} (shared across chats and files)
          </p>
        </>
      )}
    </div>
  );
}
