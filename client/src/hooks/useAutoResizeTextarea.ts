import { useRef, useEffect } from 'react';

export interface UseAutoResizeTextareaOptions {
  value: string;
  maxHeight?: number;
}

export interface UseAutoResizeTextareaReturn {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useAutoResizeTextarea({
  value,
  maxHeight = 200,
}: UseAutoResizeTextareaOptions): UseAutoResizeTextareaReturn {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [value, maxHeight]);

  return { textareaRef };
}
