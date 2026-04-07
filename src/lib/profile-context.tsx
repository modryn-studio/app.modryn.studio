'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

interface ProfileContextValue {
  profile: Profile;
  save: (updates: Partial<Omit<Profile, 'initials'>>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);

  // Hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setProfile(readCache());
  }, []);

  // Single fetch on mount — shared across all consumers
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

  // Cross-tab and same-tab update events
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

  const save = useCallback(async (updates: Partial<Omit<Profile, 'initials'>>) => {
    // Functional update to avoid stale closure capturing previous profile snapshot
    setProfile((prev) => {
      const name = (updates.name ?? prev.name).trim();
      const next: Profile = { ...prev, ...updates, name, initials: deriveInitials(name) };
      writeCache(next);
      return next;
    });
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
  }, []); // stable — no profile dep needed with functional update pattern

  return <ProfileContext.Provider value={{ profile, save }}>{children}</ProfileContext.Provider>;
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider');
  return ctx;
}
