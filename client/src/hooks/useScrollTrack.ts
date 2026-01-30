import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseScrollTrackOptions {
  dependencies?: unknown[];
}

export interface UseScrollTrackReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  isScrolling: boolean;
  scrollThumbStyle: {
    top: number;
    height: number;
  };
}

export function useScrollTrack(
  options: UseScrollTrackOptions = {}
): UseScrollTrackReturn {
  const { dependencies = [] } = options;
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollThumbStyle, setScrollThumbStyle] = useState({ top: 0, height: 0 });
  const scrollTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScrollThumb = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const trackHeight = clientHeight;
      const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 30);
      const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (trackHeight - thumbHeight);

      setScrollThumbStyle({
        top: thumbTop || 0,
        height: thumbHeight,
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    updateScrollThumb();

    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  }, [updateScrollThumb]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      updateScrollThumb();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, updateScrollThumb]);

  useEffect(() => {
    updateScrollThumb();
  }, [updateScrollThumb, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, isScrolling, scrollThumbStyle };
}
