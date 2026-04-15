import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignUpForm } from './sign-up-form';

export const metadata: Metadata = {
  title: 'Accept Invite — Modryn Studio | AI Company Operating System',
  description:
    'Accept your invite and create your Modryn Studio account — the AI company operating system for chat, tasks, decisions, and threads.',
};

// Server component — reads searchParams so the invite token is available in
// the client form without requiring useSearchParams() + a Suspense boundary.
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect('/auth/sign-in');
  return <SignUpForm token={token} />;
}
