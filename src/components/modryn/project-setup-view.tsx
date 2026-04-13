'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { ChromeLabel } from '@/components/modryn/chrome-label';

interface ProjectSetupViewProps {
  onCreated: (projectId: string) => void;
}

export function ProjectSetupView({ onCreated }: ProjectSetupViewProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        setError('Could not create project. Try again.');
        return;
      }
      const data = await res.json();
      onCreated(data.project.id);
    } catch {
      setError('Could not create project. Try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="bg-panel flex flex-1 flex-col items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <div className="mb-8">
          <Image
            src="/brand/logomark.png"
            alt="Modryn Studio"
            width={24}
            height={24}
            className="rounded-sm"
          />
        </div>

        <ChromeLabel as="p" className="text-panel-muted mb-6">
          New project
        </ChromeLabel>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="project-name"
              className="text-panel-muted font-mono text-[9px] tracking-[0.18em] uppercase"
            >
              Name
            </label>
            <Input
              id="project-name"
              className="border-panel-border bg-panel-input text-panel-foreground placeholder:text-panel-faint focus-visible:border-panel-text rounded-sm focus-visible:ring-0"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="bg-panel-foreground text-panel disabled:bg-panel-chrome mt-1 rounded-sm px-4 py-2 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </div>
  );
}
