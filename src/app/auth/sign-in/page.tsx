'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInWithEmail } from './actions';

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="bg-panel flex min-h-screen flex-col items-center justify-center p-8">
      <form action={formAction} className="w-full max-w-xs">
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
          Studio Access
        </p>

        <div className="flex flex-col gap-5">
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
              autoFocus
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
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </div>
      </form>
    </div>
  );
}
