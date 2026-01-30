import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from '../../../types';
import { MessageItem } from '../MessageItem/MessageItem';
import styles from './ChatMessages.module.css';

export interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatMessages({
  messages,
  isLoading,
  messagesEndRef,
}: ChatMessagesProps): React.JSX.Element {
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

  // Update thumb when messages change
  useEffect(() => {
    updateScrollThumb();
  }, [messages, updateScrollThumb]);

  return (
    <div className={styles.messagesWrapper}>
      <div
        ref={containerRef}
        className={styles.messages}
      >
        {messages.map((msg, idx) => (
          <MessageItem key={idx} message={msg} />
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.messageContent}>Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className={`${styles.scrollTrack} ${isScrolling ? styles.visible : ''}`}>
        <div
          className={styles.scrollThumb}
          style={{
            top: `${scrollThumbStyle.top}px`,
            height: `${scrollThumbStyle.height}px`,
          }}
        />
      </div>
    </div>
  );
}
