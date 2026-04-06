'use client';

import { useEffect, useState, useCallback } from 'react';
import { deriveInitials } from '@/lib/initials';

export interface Profile {
  name: string;
  role: string;
  description: string;
  avatarDataUrl: string;
  initials: string;
}

const CACHE_KEY = 'modryn:profile';
const PROFILE_UPDATED_EVENT = 'modryn:profile-updated';

const DEFAULT: Profile = {
  name: '',
  role: '',
  description: '',
  avatarDataUrl: '',
  initials: '',
};

function readCache(): Profile {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function writeCache(p: Profile) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(p));
  } catch {}
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT);

  // Hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setProfile(readCache());
  }, []);

  // Fetch from API on mount, update cache if different
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data: Profile = await res.json();
        if (!cancelled) {
          setProfile(data);
          writeCache(data);
        }
      } catch {
        // cache is fine as fallback
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for cross-tab and same-tab updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key !== CACHE_KEY) return;
      setProfile(readCache());
    };
    const handleUpdated = () => setProfile(readCache());

    window.addEventListener('storage', handleStorage);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleUpdated);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleUpdated);
    };
  }, []);

  const save = useCallback(
    async (updates: Partial<Omit<Profile, 'initials'>>) => {
      // Optimistic update
      const name = (updates.name ?? profile.name).trim();
      const next: Profile = { ...profile, ...updates, name, initials: deriveInitials(name) };
      setProfile(next);
      writeCache(next);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

      // Persist to API
      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const saved: Profile = await res.json();
          setProfile(saved);
          writeCache(saved);
        }
      } catch {
        // optimistic update stands — will sync on next load
      }
    },
    [profile]
  );

  return { profile, save };
}
