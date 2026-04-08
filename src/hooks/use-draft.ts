import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persists a textarea draft to localStorage so it survives view switches.
 * Key should uniquely identify the draft context (e.g. `dm-charlie-munger`).
 * Clears localStorage when value is set to empty string.
 */
export function useDraft(key: string): [string, (value: string) => void] {
  const storageKey = `draft:${key}`;

  const [value, setValueState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(storageKey) ?? '';
  });

  // When key changes (e.g. different thread selected), load that draft from storage
  const prevKeyRef = useRef(storageKey);
  useEffect(() => {
    if (prevKeyRef.current === storageKey) return;
    prevKeyRef.current = storageKey;
    const saved = typeof window !== 'undefined' ? (localStorage.getItem(storageKey) ?? '') : '';
    setValueState(saved);
  }, [storageKey]);

  const setValue = useCallback(
    (next: string) => {
      setValueState(next);
      if (typeof window === 'undefined') return;
      if (next) {
        localStorage.setItem(storageKey, next);
      } else {
        localStorage.removeItem(storageKey);
      }
    },
    [storageKey]
  );

  return [value, setValue];
}
