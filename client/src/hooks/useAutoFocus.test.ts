import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoFocus } from './useAutoFocus';

describe('useAutoFocus', () => {
  let mockRef: { current: { focus: () => void } | null };

  beforeEach(() => {
    vi.useFakeTimers();
    mockRef = {
      current: {
        focus: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('mount trigger', () => {
    it('should focus on mount when enabled is true', () => {
      renderHook(() =>
        useAutoFocus({
          ref: mockRef,
          enabled: true,
          trigger: 'mount',
        }),
      );

      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);
    });

    it('should not focus on mount when enabled is false', () => {
      renderHook(() =>
        useAutoFocus({
          ref: mockRef,
          enabled: false,
          trigger: 'mount',
        }),
      );

      expect(mockRef.current?.focus).not.toHaveBeenCalled();
    });

    it('should not focus again on re-render with mount trigger', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useAutoFocus({
            ref: mockRef,
            enabled,
            trigger: 'mount',
          }),
        { initialProps: { enabled: true } },
      );

      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);

      // Re-render with same enabled value
      rerender({ enabled: true });
      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe('change trigger', () => {
    it('should focus when enabled transitions from false to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useAutoFocus({
            ref: mockRef,
            enabled,
            trigger: 'change',
          }),
        { initialProps: { enabled: false } },
      );

      expect(mockRef.current?.focus).not.toHaveBeenCalled();

      // Transition to enabled
      rerender({ enabled: true });
      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);
    });

    it('should not focus on mount even if enabled is true', () => {
      renderHook(() =>
        useAutoFocus({
          ref: mockRef,
          enabled: true,
          trigger: 'change',
        }),
      );

      expect(mockRef.current?.focus).not.toHaveBeenCalled();
    });

    it('should not focus when enabled stays true', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useAutoFocus({
            ref: mockRef,
            enabled,
            trigger: 'change',
          }),
        { initialProps: { enabled: true } },
      );

      expect(mockRef.current?.focus).not.toHaveBeenCalled();

      // Re-render with same enabled value
      rerender({ enabled: true });
      expect(mockRef.current?.focus).not.toHaveBeenCalled();
    });

    it('should focus multiple times on each false-to-true transition', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useAutoFocus({
            ref: mockRef,
            enabled,
            trigger: 'change',
          }),
        { initialProps: { enabled: false } },
      );

      // First transition
      rerender({ enabled: true });
      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);

      // Transition back to false
      rerender({ enabled: false });
      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);

      // Second transition
      rerender({ enabled: true });
      expect(mockRef.current?.focus).toHaveBeenCalledTimes(2);
    });
  });

  describe('delay option', () => {
    it('should focus immediately when delay is 0', () => {
      renderHook(() =>
        useAutoFocus({
          ref: mockRef,
          enabled: true,
          trigger: 'mount',
          delay: 0,
        }),
      );

      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);
    });

    it('should delay focus when delay is specified', () => {
      renderHook(() =>
        useAutoFocus({
          ref: mockRef,
          enabled: true,
          trigger: 'mount',
          delay: 100,
        }),
      );

      // Should not focus immediately
      expect(mockRef.current?.focus).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(100);
      expect(mockRef.current?.focus).toHaveBeenCalledTimes(1);
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = renderHook(() =>
        useAutoFocus({
          ref: mockRef,
          enabled: true,
          trigger: 'mount',
          delay: 100,
        }),
      );

      // Unmount before timer fires
      unmount();
      vi.advanceTimersByTime(100);

      // Should not focus after unmount
      expect(mockRef.current?.focus).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null ref gracefully', () => {
      const nullRef = { current: null };

      expect(() =>
        renderHook(() =>
          useAutoFocus({
            ref: nullRef,
            enabled: true,
            trigger: 'mount',
          }),
        ),
      ).not.toThrow();
    });

    it('should handle ref changing during lifetime', () => {
      const ref1 = { current: { focus: vi.fn() } };
      const ref2 = { current: { focus: vi.fn() } };

      const { rerender } = renderHook(
        ({ ref, enabled }) =>
          useAutoFocus({
            ref,
            enabled,
            trigger: 'change',
          }),
        { initialProps: { ref: ref1, enabled: false } },
      );

      // Transition with first ref
      rerender({ ref: ref1, enabled: true });
      expect(ref1.current?.focus).toHaveBeenCalledTimes(1);
      expect(ref2.current?.focus).not.toHaveBeenCalled();

      // Change ref and transition again
      rerender({ ref: ref2, enabled: false });
      rerender({ ref: ref2, enabled: true });
      expect(ref1.current?.focus).toHaveBeenCalledTimes(1);
      expect(ref2.current?.focus).toHaveBeenCalledTimes(1);
    });
  });
});
