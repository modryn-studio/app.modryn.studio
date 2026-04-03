'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Note {
  text: string;
}

interface Task {
  text: string;
  due?: string;
}

interface Decision {
  text: string;
}

interface ContextPanelProps {
  memberName: string;
  memberRole: string;
  memberInitials: string;
  decisions?: Decision[];
  tasks?: Task[];
  notes?: Note[];
  collapsed?: boolean;
  onToggle?: () => void;
  /** When true, renders without the aside wrapper sizing (used inside mobile sheet) */
  mobileSheet?: boolean;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-context-border border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-black/5"
      >
        <span className="text-panel-muted font-mono text-[9px] tracking-[0.2em] uppercase">
          {title}
        </span>
        {open ? (
          <ChevronDown className="text-panel-muted h-3 w-3" />
        ) : (
          <ChevronRight className="text-panel-muted h-3 w-3" />
        )}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function BulletItem({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="bg-panel-faint mt-1.5 h-1 w-1 flex-shrink-0 rounded-full" />
      <div>
        <p className="text-panel-text text-xs leading-relaxed">{text}</p>
        {sub && <p className="text-panel-muted mt-0.5 text-[10px]">{sub}</p>}
      </div>
    </div>
  );
}

export function ContextPanel({
  memberName,
  memberRole,
  memberInitials,
  decisions = [],
  tasks = [],
  notes = [],
  collapsed = false,
  onToggle,
  mobileSheet = false,
}: ContextPanelProps) {
  const Wrapper = mobileSheet ? 'div' : 'aside';
  return (
    <Wrapper
      className={cn(
        'bg-context flex flex-col transition-all duration-200',
        mobileSheet
          ? 'h-full'
          : cn('border-context-border h-full border-l', collapsed ? 'w-0 overflow-hidden' : 'w-64')
      )}
    >
      {/* Header */}
      <div className="border-context-border flex items-center justify-between border-b px-5 py-4">
        <span className="text-panel-muted font-mono text-[9px] tracking-[0.2em] uppercase">
          Context Panel
        </span>
        <button
          onClick={onToggle}
          className="text-panel-muted hover:text-panel-text p-0.5 transition-colors"
          aria-label="Toggle context panel"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Member card */}
      <div className="border-context-border border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-zinc-200">
            <span className="font-mono text-xs font-semibold text-zinc-700">{memberInitials}</span>
          </div>
          <div>
            <p className="text-panel-foreground text-sm leading-tight font-medium">{memberName}</p>
            <p className="text-panel-muted mt-0.5 text-[10px]">{memberRole}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <Section title="Recent Decisions">
          {decisions.length === 0 ? (
            <p className="text-panel-faint text-[10px] italic">No decisions recorded.</p>
          ) : (
            decisions.map((d, i) => <BulletItem key={i} text={d.text} />)
          )}
        </Section>

        <Section title="Active Tasks">
          {tasks.length === 0 ? (
            <p className="text-panel-faint text-[10px] italic">No active tasks.</p>
          ) : (
            tasks.map((t, i) => <BulletItem key={i} text={t.text} sub={t.due} />)
          )}
        </Section>

        <Section title="Conversation Notes">
          {notes.length === 0 ? (
            <p className="text-panel-faint text-[10px] italic">Notes will appear here.</p>
          ) : (
            notes.map((n, i) => <BulletItem key={i} text={n.text} />)
          )}
        </Section>
      </div>
    </Wrapper>
  );
}
