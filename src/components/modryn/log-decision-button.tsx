'use client';

import { useState } from 'react';
import { Bookmark, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogDecisionButtonProps {
  messageContent: string;
  memberId: string;
  conversationId: string | null;
}

function getTitleFromContent(content: string): string {
  const firstLine = content.split('\n').find((l) => l.trim().length > 0) ?? '';
  return firstLine.slice(0, 120).trim();
}

export function LogDecisionButton({
  messageContent,
  memberId,
  conversationId,
}: LogDecisionButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setTitle(getTitleFromContent(messageContent));
    setDescription('');
    setError(null);
    setSaved(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          conversationId: conversationId || undefined,
          loggedBy: memberId,
        }),
      });
      if (!res.ok) throw new Error('Failed to log decision');
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
          'ml-auto opacity-0 transition-opacity group-hover:opacity-100',
          'text-panel-faint hover:text-panel-muted rounded-sm p-0.5'
        )}
        aria-label="Log as decision"
        title="Log as decision"
      >
        <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
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
            aria-label="Log as decision"
            className="bg-sidebar border-sidebar-border fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l shadow-2xl"
          >
            <div className="border-sidebar-border flex items-center justify-between border-b px-5 py-4">
              <span className="text-sidebar-foreground text-[13px] font-medium tracking-tight">
                Log as Decision
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
                  htmlFor="decision-title"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Title
                </label>
                <input
                  id="decision-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="decision-description"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Context (optional)
                </label>
                <textarea
                  id="decision-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full resize-none rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                />
              </div>

              {error && <p className="text-destructive font-mono text-[11px]">{error}</p>}

              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim() || loading}
                className="bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 mt-auto rounded-sm px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saved ? 'Saved' : loading ? 'Saving...' : 'Log decision'}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
