'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChromeLabel } from '@/components/modryn/chrome-label';

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
}

const FIELD_CLASS =
  'w-full bg-transparent text-sidebar-foreground placeholder:text-sidebar-muted border-b border-sidebar-ring outline-none caret-sidebar-primary text-[13px] pb-1 focus:border-sidebar-primary transition-colors';

export function AddMemberSheet({ open, onOpenChange, onMemberAdded }: AddMemberSheetProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [personalityNotes, setPersonalityNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName('');
    setRole('');
    setSystemPrompt('');
    setPersonalityNotes('');
    setError('');
    setSaving(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !systemPrompt.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          system_prompt: systemPrompt.trim(),
          personality_notes: personalityNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to create member');
      }
      onMemberAdded();
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent side="right" className="border-sidebar-border bg-sidebar w-96 border-l p-0">
        <SheetHeader className="border-sidebar-border border-b px-6 py-5">
          <SheetTitle className="text-sidebar-muted text-[13px] font-medium tracking-widest uppercase">
            Add Member
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 overflow-y-auto px-6 pt-8 pb-6">
          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" className="text-sidebar-muted">
              Name
            </ChromeLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Peter Thiel"
              autoFocus
              required
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" className="text-sidebar-muted">
              Role
            </ChromeLabel>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="AI Strategist"
              required
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" className="text-sidebar-muted">
              System prompt
            </ChromeLabel>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are… Define this member's thinking style, tone, and context."
              required
              rows={7}
              className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full rounded-sm border p-3 text-[12px] leading-relaxed outline-none focus:border-sidebar-ring resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" className="text-sidebar-muted">
              Personality notes
              <span className="text-sidebar-ring ml-1 normal-case">(optional)</span>
            </ChromeLabel>
            <textarea
              value={personalityNotes}
              onChange={(e) => setPersonalityNotes(e.target.value)}
              placeholder="Human-readable notes about strengths, blind spots, use cases."
              rows={3}
              className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full rounded-sm border p-3 text-[12px] leading-relaxed outline-none focus:border-sidebar-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-destructive font-mono text-[11px]">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !role.trim() || !systemPrompt.trim() || saving}
            className="bg-sidebar-primary text-sidebar-primary-foreground rounded-sm px-4 py-2 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Adding...' : 'Add member'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
