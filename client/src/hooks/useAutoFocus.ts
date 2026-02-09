import { useEffect, useRef, type RefObject } from 'react';

export type AutoFocusTrigger = 'mount' | 'change';

export interface UseAutoFocusOptions {
  /**
   * Ref to the element that has a focus() method
   */
  ref: RefObject<{ focus: () => void } | null>;
  /**
   * Whether auto-focus is enabled
   */
  enabled: boolean;
  /**
   * When to trigger the focus:
   * - 'mount': Focus once when component mounts (if enabled is true)
   * - 'change': Focus when enabled transitions from false to true
   *
   * @default 'mount'
   */
  trigger?: AutoFocusTrigger;
  /**
   * Optional delay in milliseconds before focusing
   * @default 0
   */
  delay?: number;
}

/**
 * Automatically focuses an element based on conditions.
 * Useful for auto-focusing input fields on mount or after state changes.
 *
 * @example
 * // Focus on mount (empty screen)
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * useAutoFocus({
 *   ref: inputRef,
 *   enabled: isEmpty,
 *   trigger: 'mount'
 * });
 * ```
 *
 * @example
 * // Focus after loading completes
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * useAutoFocus({
 *   ref: inputRef,
 *   enabled: !isLoading && messages.length > 0,
 *   trigger: 'change'
 * });
 * ```
 *
 * @example
 * // Focus after modal closes with delay
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * useAutoFocus({
 *   ref: inputRef,
 *   enabled: !isModalOpen,
 *   trigger: 'change',
 *   delay: 50
 * });
 * ```
 */
export function useAutoFocus({
  ref,
  enabled,
  trigger = 'mount',
  delay = 0,
}: UseAutoFocusOptions): void {
  const prevEnabledRef = useRef(enabled);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const wasEnabled = prevEnabledRef.current;
    const shouldFocus =
      trigger === 'mount'
        ? !hasMountedRef.current && enabled // Focus on mount if enabled
        : wasEnabled === false && enabled; // Focus on transition to enabled

    if (shouldFocus && ref.current) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          ref.current?.focus();
        }, delay);
        return () => clearTimeout(timer);
      } else {
        ref.current.focus();
      }
    }

    prevEnabledRef.current = enabled;
    hasMountedRef.current = true;
  }, [enabled, trigger, delay, ref]);
}
