'use client';

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberSheet({ open, onOpenChange }: props) {
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail('');
    setUrl(null);
    setCopied(false);
    setError(null);
  }

  async function generateInvite() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed to generate invite');
      const data = await res.json();
      setUrl(data.url);
    } catch {
      setError('Could not generate invite. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={handleClose} aria-hidden="true" />

      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Invite member"
        className={cn(
          'bg-sidebar border-sidebar-border fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l shadow-2xl',
          'transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="border-sidebar-border flex items-center justify-between border-b px-5 py-4">
          <span className="text-sidebar-foreground text-[13px] font-medium tracking-tight">
            Invite Member
          </span>
          <button
            onClick={handleClose}
            className="text-sidebar-muted hover:text-sidebar-foreground rounded-sm transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          {!url ? (
            <>
              <p className="text-sidebar-muted text-[12px] leading-relaxed">
                Generate a single-use invite link. Optionally lock it to a specific email.
              </p>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="invite-email"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Email (optional)
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                />
              </div>

              {error && <p className="text-destructive font-mono text-[11px]">{error}</p>}

              <button
                onClick={generateInvite}
                disabled={loading}
                className="bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent/80 mt-auto rounded-sm px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate invite link'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sidebar-muted text-[12px] leading-relaxed">
                Share this link. It expires in 7 days and can only be used once.
              </p>

              <div className="border-sidebar-border flex items-center gap-2 rounded-sm border px-3 py-2">
                <span className="text-sidebar-muted min-w-0 flex-1 truncate font-mono text-[10px]">
                  {url}
                </span>
                <button
                  onClick={copyUrl}
                  className="text-sidebar-muted hover:text-sidebar-foreground shrink-0 transition-colors"
                  aria-label="Copy invite link"
                >
                  {copied ? (
                    <Check className="text-status-online h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              <button
                onClick={reset}
                className="text-sidebar-muted hover:text-sidebar-foreground font-mono text-[11px] underline underline-offset-2 transition-colors"
              >
                Generate another
              </button>

              <button
                onClick={handleClose}
                className="bg-sidebar-accent text-sidebar-primary hover:bg-sidebar-accent/80 mt-auto rounded-sm px-4 py-2 text-[13px] font-medium transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
