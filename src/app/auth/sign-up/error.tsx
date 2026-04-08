'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function SignUpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[sign-up error]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="bg-panel flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-panel-foreground font-mono text-[13px]">Something went wrong.</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={reset}
        className="text-panel-muted hover:text-panel-foreground font-mono text-[11px] underline underline-offset-2"
      >
        Try again
      </Button>
    </div>
  );
}
