'use client';

// Thin wrapper — all state and fetch logic lives in ProfileProvider (profile-context.tsx).
// Import path and public API are unchanged so no consumer files need updating.

export type { Profile } from '@/lib/profile-context';
export { useProfileContext as useProfile } from '@/lib/profile-context';
