import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Spinner({ size = 'medium', className }: SpinnerProps): React.JSX.Element {
  return (
    <div
      className={`${styles.spinner} ${styles[size]} ${className || ''}`}
      role="status"
      aria-label="Loading"
    />
  );
}
