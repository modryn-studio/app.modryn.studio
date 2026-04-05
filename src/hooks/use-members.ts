'use client';

import { useCallback, useEffect, useState } from 'react';

export interface AIMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: 'online' | 'analyzing' | 'away';
  avatarUrl: string;
  systemPrompt: string;
  personalityNotes: string;
}

export function useMembers() {
  const [members, setMembers] = useState<AIMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/members');
        if (!res.ok) throw new Error('Failed to load members');
        const data = await res.json();
        if (!cancelled) setMembers(data);
      } catch {
        // silently fail — roster will be empty
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { members, isLoading, refetch };
}
