import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns touch handlers that fire onLongPress after the user holds for `delay` ms.
 * Cancels on touch move so it doesn't conflict with scroll.
 */
export function useLongPress(onLongPress: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always call the latest version of the callback, even if it changed
  // between when the timer was started and when it fires.
  const callbackRef = useRef(onLongPress);
  useEffect(() => {
    callbackRef.current = onLongPress;
  });

  // Stable reference — never recreated between renders.
  const start = useCallback(() => {
    timerRef.current = setTimeout(() => callbackRef.current(), delay);
  }, [delay]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    // Suppress the native context menu on long-press (Android/desktop)
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
