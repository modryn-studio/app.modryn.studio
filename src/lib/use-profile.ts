'use client';

import { useEffect, useState } from 'react';

export interface Profile {
  name: string;
  description: string;
  avatarDataUrl: string;
  initials: string;
}

const STORAGE_KEY = 'modryn:profile';
const PROFILE_UPDATED_EVENT = 'modryn:profile-updated';

export function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('') || 'FO'
  );
}

const DEFAULT: Profile = {
  name: 'Founder',
  description: '',
  avatarDataUrl: '',
  initials: 'FO',
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT);

  useEffect(() => {
    const readProfile = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setProfile(raw ? (JSON.parse(raw) as Profile) : DEFAULT);
      } catch {
        setProfile(DEFAULT);
      }
    };

    readProfile();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_KEY) return;
      readProfile();
    };

    const handleProfileUpdated = () => {
      readProfile();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

  function save(updates: Partial<Omit<Profile, 'initials'>>) {
    const name = (updates.name ?? profile.name).trim() || 'Founder';
    const next: Profile = { ...profile, ...updates, name, initials: getInitials(name) };
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch {}
  }

  return { profile, save };
}
