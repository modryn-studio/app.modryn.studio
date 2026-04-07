import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Modryn Studio',
  description: 'Sign in to Modryn Studio.',
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
