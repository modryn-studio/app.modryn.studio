'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signUpWithEmail } from './actions';

export function SignUpForm({ token }: { token?: string }) {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="bg-panel flex min-h-screen flex-col items-center justify-center p-8">
      <form action={formAction} className="w-full max-w-xs">
        {/* Pass invite token through the form — validated server-side */}
        {token && <input type="hidden" name="token" value={token} />}

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

        <p className="text-panel-muted mb-6 font-mono text-[9px] tracking-[0.18em] uppercase">
          {token ? 'Accept Invite' : 'Sign Up'}
        </p>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
            >
              Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Your name"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint focus-visible:border-panel-text h-auto rounded-sm py-2 text-[13px] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint focus-visible:border-panel-text h-auto rounded-sm py-2 text-[13px] focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
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

          {state?.error && <p className="text-destructive font-mono text-[11px]">{state.error}</p>}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-panel-foreground text-panel hover:bg-panel-foreground/90 mt-1 h-auto w-full rounded-sm py-2 text-[13px]"
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-panel-faint text-center font-mono text-[10px]">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="text-panel-muted underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
