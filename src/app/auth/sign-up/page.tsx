'use client';

import { useActionState } from 'react';
import { signUpWithEmail } from './actions';

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);

  return (
    <div className="bg-panel flex min-h-screen flex-col items-center justify-center p-8">
      <form action={formAction} className="w-full max-w-xs">
        <div className="border-panel-border mb-8 flex h-14 w-14 items-center justify-center rounded-sm border border-dashed">
          <span className="text-panel-faint font-mono text-xs">//</span>
        </div>

        <p className="text-panel-muted mb-6 font-mono text-[9px] tracking-[0.18em] uppercase">
          Create Account
        </p>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Your name"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-panel-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-panel-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-panel-text"
            />
          </div>

          {state?.error && (
            <p className="text-destructive font-mono text-[11px]">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="bg-panel-foreground text-panel mt-1 rounded-sm px-4 py-2 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
}
