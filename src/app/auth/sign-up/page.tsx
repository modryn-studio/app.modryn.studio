import { redirect } from 'next/navigation';
import { SignUpForm } from './sign-up-form';

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
