'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const { error: signInError } = await authClient.signIn.email({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });
      if (signInError) {
        setError(signInError.message || 'Failed to sign in. Try again.');
      } else {
        // Full page reload so ProfileProvider remounts and refetches with the new session cookie.
        window.location.href = '/';
      }
    });
  }

  return (
    <div className="bg-panel flex min-h-screen flex-col items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <div className="mb-8 flex items-center gap-2.5">
          <Image
            src="/brand/logomark.png"
            alt="Modryn Studio"
            width={28}
            height={28}
            className="rounded-sm"
          />
          <span className="text-panel-foreground text-[15px] font-medium tracking-tight">
            Modryn Studio
          </span>
        </div>

        <p className="text-panel-muted mb-6 font-mono text-[10px] tracking-[0.15em] uppercase">
          Studio Access
        </p>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-panel-muted font-mono text-[10px] tracking-[0.15em] uppercase"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint focus-visible:border-panel-text h-auto rounded-sm py-2 text-[13px] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-panel-muted font-mono text-[10px] tracking-[0.15em] uppercase"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint focus-visible:border-panel-text h-auto rounded-sm py-2 text-[13px] focus-visible:ring-0"
            />
          </div>

          {error && <p className="text-destructive font-mono text-[11px]">{error}</p>}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-panel-foreground text-panel hover:bg-panel-foreground/90 mt-1 h-auto w-full rounded-sm py-2 text-[13px]"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  );
}
