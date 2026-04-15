import type { Metadata } from 'next';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = {
  title: 'Sign In — Modryn Studio | AI Company Operating System',
  description:
    'Sign in to access Modryn Studio, your AI company operating system for chat, tasks, decisions, and async threads.',
};

export default function SignInPage() {
  return <SignInForm />;
}
