import styles from './ScrollBar.module.css';

export interface ScrollBarProps {
  isVisible: boolean;
  thumbStyle: {
    top: number;
    height: number;
  };
}

export function ScrollBar({
  isVisible,
  thumbStyle,
}: ScrollBarProps): React.JSX.Element {
  return (
    <div className={`${styles.scrollTrack} ${isVisible ? styles.visible : ''}`}>
      <div
        className={styles.scrollThumb}
        style={{
          top: `${thumbStyle.top}px`,
          height: `${thumbStyle.height}px`,
        }}
      />
    </div>
  );
}
