'use client';

import { useState } from 'react';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { useProfile } from '@/lib/use-profile';

export function SetupView() {
  const { save } = useProfile();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    await save({ name: trimmed, description: description.trim() });
    // profile.name is now truthy — parent unmounts this view
  }

  return (
    <div className="bg-panel flex flex-1 flex-col items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <div className="border-panel-border mb-8 flex h-14 w-14 items-center justify-center rounded-sm border border-dashed">
          <span className="text-panel-faint font-mono text-xs">//</span>
        </div>

        <ChromeLabel as="p" className="text-panel-muted mb-6">
          Studio Setup
        </ChromeLabel>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" htmlFor="setup-name" className="text-panel-muted">
              Your name
            </ChromeLabel>
            <input
              id="setup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-panel-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <ChromeLabel as="label" htmlFor="setup-description" className="text-panel-muted">
              What you&apos;re building
              <span className="text-panel-faint ml-1 normal-case">(optional)</span>
            </ChromeLabel>
            <input
              id="setup-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A line about your studio or focus"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-panel-text"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="bg-panel-foreground text-panel disabled:bg-panel-chrome mt-1 rounded-sm px-4 py-2 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Entering...' : 'Enter studio'}
          </button>
        </div>
      </form>
    </div>
  );
}
