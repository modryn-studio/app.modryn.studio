'use client';

import { useState } from 'react';
import { Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogOrgMemoryButtonProps {
  messageContent: string;
  memberId: string;
  conversationId: string | null;
}

function getInitialContent(content: string): string {
  const trimmed = content.trim();
  return trimmed.slice(0, 200).trim();
}

export function LogOrgMemoryButton({
  messageContent,
  memberId,
  conversationId,
}: LogOrgMemoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setContent(getInitialContent(messageContent));
    setError(null);
    setSaved(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSave() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/org-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          sourceConversationId: conversationId || undefined,
          sourceMemberId: memberId,
        }),
      });
      if (!res.ok) throw new Error('Failed to log');
      setSaved(true);
      setTimeout(() => setOpen(false), 800);
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100',
          'text-panel-faint hover:text-panel-muted rounded-sm p-0.5'
        )}
        aria-label="Log to team"
        title="Log to team memory"
      >
        <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleClose}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Log to team"
            className="bg-sidebar border-sidebar-border fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l shadow-2xl"
          >
            <div className="border-sidebar-border flex items-center justify-between border-b px-5 py-4">
              <span className="text-sidebar-foreground text-[13px] font-medium tracking-tight">
                Log to Team
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="text-sidebar-muted hover:text-sidebar-foreground rounded-sm transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="org-memory-content"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Key fact
                </label>
                <textarea
                  id="org-memory-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full resize-none rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                />
              </div>

              {error && <p className="text-destructive font-mono text-[11px]">{error}</p>}

              <button
                type="button"
                onClick={handleSave}
                disabled={!content.trim() || loading}
                className="bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 mt-auto rounded-sm px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saved ? 'Saved' : loading ? 'Saving...' : 'Log to team'}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
