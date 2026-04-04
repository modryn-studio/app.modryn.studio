'use client';

import { useEffect, useState } from 'react';

export interface Profile {
  name: string;
  description: string;
  avatarDataUrl: string;
  initials: string;
}

const STORAGE_KEY = 'modryn:profile';

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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw) as Profile);
    } catch {}
  }, []);

  function save(updates: Partial<Omit<Profile, 'initials'>>) {
    const name = (updates.name ?? profile.name).trim() || 'Founder';
    const next: Profile = { ...profile, ...updates, name, initials: getInitials(name) };
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  return { profile, save };
}