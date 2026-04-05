'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error boundary]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="bg-background flex h-screen w-screen flex-col items-center justify-center gap-4">
      <p className="text-foreground font-mono text-sm">Something went wrong.</p>
      <button
        onClick={reset}
        className="font-mono text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
      >
        Try again
      </button>
    </div>
  );
}
