'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { Sheet } from '@/components/ui/sheet';
import { ModalShell, SHEET_FIELD_CLASS } from '@/components/ui/modal-shell';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import type { AIMember } from '@/hooks/use-members';

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
  /** When provided, the sheet operates in edit mode for this member. */
  member?: AIMember;
}

export function AddMemberSheet({ open, onOpenChange, onMemberAdded, member }: AddMemberSheetProps) {
  const isEdit = !!member;

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [personalityNotes, setPersonalityNotes] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync fields when the sheet opens or the target member changes
  useEffect(() => {
    if (open) {
      setName(member?.name ?? '');
      setRole(member?.role ?? '');
      setSystemPrompt(member?.systemPrompt ?? '');
      setPersonalityNotes(member?.personalityNotes ?? '');
      setAvatarDataUrl(member?.avatarUrl ?? '');
      setError('');
      setSaving(false);
    }
  }, [open, member]);

  function reset() {
    setName('');
    setRole('');
    setSystemPrompt('');
    setPersonalityNotes('');
    setAvatarDataUrl('');
    setError('');
    setSaving(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
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
              avatar_data_url: avatarDataUrl || undefined,
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
              avatar_data_url: avatarDataUrl || undefined,
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
      <ModalShell title={isEdit ? 'Edit Member' : 'Add Member'} width="w-96">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 overflow-y-auto px-6 pt-8 pb-6"
        >
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative"
              aria-label="Set member photo"
            >
              {avatarDataUrl ? (
                <Image
                  src={avatarDataUrl}
                  alt={name || 'Member'}
                  width={80}
                  height={80}
                  unoptimized
                  className="ring-sidebar-border h-20 w-20 rounded-sm object-cover ring-2"
                />
              ) : (
                <div className="bg-sidebar-accent text-sidebar-foreground ring-sidebar-border flex h-20 w-20 items-center justify-center rounded-sm font-mono text-xl font-semibold ring-2">
                  {name
                    ? name
                        .trim()
                        .split(/\s+/)
                        .map((w) => w[0]?.toUpperCase() ?? '')
                        .slice(0, 2)
                        .join('')
                    : '?'}
                </div>
              )}
              <div className="bg-sidebar/72 absolute inset-0 flex items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="text-sidebar-foreground h-5 w-5" strokeWidth={1.5} />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

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
              className={SHEET_FIELD_CLASS}
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
              className={SHEET_FIELD_CLASS}
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
      </ModalShell>
    </Sheet>
  );
}
