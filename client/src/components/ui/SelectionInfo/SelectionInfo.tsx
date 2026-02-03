import styles from './SelectionInfo.module.css';

export interface SelectionInfoProps {
  count: number;
  compact?: boolean;
}

export function SelectionInfo({ count, compact = false }: SelectionInfoProps): React.JSX.Element {
  const wrapperClass = `${styles.selectionInfo} ${compact ? styles.compact : ''}`;

  return (
    <div className={wrapperClass}>
      {count} {count === 1 ? 'file' : 'files'} selected
    </div>
  );
}
