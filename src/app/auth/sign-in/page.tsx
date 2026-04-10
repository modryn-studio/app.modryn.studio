import type { Metadata } from 'next';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = {
  title: 'Sign In — Modryn Studio',
  description: 'Sign in to Modryn Studio, your AI company operating system.',
};

export default function SignInPage() {
  return <SignInForm />;
}
