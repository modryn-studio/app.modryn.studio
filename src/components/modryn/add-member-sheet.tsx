'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import type { AIMember } from '@/hooks/use-members';

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
  /** When provided, the sheet operates in edit mode for this member. */
  member?: AIMember;
}

const FIELD_CLASS =
  'w-full bg-transparent text-sidebar-foreground placeholder:text-sidebar-muted border-b border-sidebar-ring outline-none caret-sidebar-primary text-[13px] pb-1 focus:border-sidebar-primary transition-colors';

export function AddMemberSheet({ open, onOpenChange, onMemberAdded, member }: AddMemberSheetProps) {
  const isEdit = !!member;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [personalityNotes, setPersonalityNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync fields when the sheet opens or the target member changes
  useEffect(() => {
    if (open) {
      setName(member?.name ?? '');
      setRole(member?.role ?? '');
      setSystemPrompt(member?.systemPrompt ?? '');
      setPersonalityNotes(member?.personalityNotes ?? '');
      setError('');
      setSaving(false);
    }
  }, [open, member]);

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
      const res = isEdit
        ? await fetch(`/api/members/${member.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              role: role.trim(),
              system_prompt: systemPrompt.trim(),
              personality_notes: personalityNotes.trim() || '',
            }),
          })
        : await fetch('/api/members', {
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
        throw new Error(
          body.error ?? (isEdit ? 'Failed to update member' : 'Failed to create member')
        );
      }
      onMemberAdded();
      onOpenChange(false);
      if (!isEdit) reset();
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
        if (!v && !isEdit) reset();
      }}
    >
      <SheetContent side="right" className="border-sidebar-border bg-sidebar w-96 border-l p-0">
        <SheetHeader className="border-sidebar-border border-b px-6 py-5">
          <SheetTitle className="text-sidebar-muted text-[13px] font-medium tracking-widest uppercase">
            {isEdit ? 'Edit Member' : 'Add Member'}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 overflow-y-auto px-6 pt-8 pb-6"
        >
          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" htmlFor="member-name" className="text-sidebar-muted">
              Name
            </ChromeLabel>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoFocus
              required
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" htmlFor="member-role" className="text-sidebar-muted">
              Role
            </ChromeLabel>
            <input
              id="member-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="AI Strategist"
              required
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" htmlFor="member-system-prompt" className="text-sidebar-muted">
              System prompt
            </ChromeLabel>
            <textarea
              id="member-system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are… Define this member's thinking style, tone, and context."
              required
              rows={7}
              className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted focus:border-sidebar-ring w-full resize-none rounded-sm border p-3 text-[12px] leading-relaxed outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel
              as="label"
              htmlFor="member-personality-notes"
              className="text-sidebar-muted"
            >
              Personality notes
              <span className="text-sidebar-ring ml-1 normal-case">(optional)</span>
            </ChromeLabel>
            <textarea
              id="member-personality-notes"
              value={personalityNotes}
              onChange={(e) => setPersonalityNotes(e.target.value)}
              placeholder="Human-readable notes about strengths, blind spots, use cases."
              rows={3}
              className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted focus:border-sidebar-ring w-full resize-none rounded-sm border p-3 text-[12px] leading-relaxed outline-none"
            />
          </div>

          {error && <p className="text-destructive font-mono text-[11px]">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim() || !role.trim() || !systemPrompt.trim() || saving}
            className="bg-sidebar-primary text-sidebar-primary-foreground rounded-sm px-4 py-2 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (isEdit ? 'Saving...' : 'Adding...') : isEdit ? 'Save changes' : 'Add member'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

