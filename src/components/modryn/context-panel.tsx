'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChromeLabel } from '@/components/modryn/chrome-label';

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
  decisions?: Decision[];
  tasks?: Task[];
  notes?: Note[];
  collapsed?: boolean;
  /** When true, renders without the aside wrapper sizing (used inside mobile sheet) */
  mobileSheet?: boolean;
}

function Section({
  title,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-context-border border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="hover:bg-panel-selected/70 flex w-full items-center justify-between px-5 py-3 text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChromeLabel className="text-panel-muted">{title}</ChromeLabel>
          <ChromeLabel className="text-panel-faint tracking-normal">{count}</ChromeLabel>
        </div>
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
      <span className="bg-panel-faint mt-1.5 h-1 w-1 shrink-0 rounded-full" />
      <div>
        <p className="text-panel-text text-xs leading-relaxed">{text}</p>
        {sub && <p className="text-panel-muted mt-1 font-mono text-[9px]">{sub}</p>}
      </div>
    </div>
  );
}

export function ContextPanel({
  memberName,
  decisions = [],
  tasks = [],
  notes = [],
  collapsed = false,
  mobileSheet = false,
}: ContextPanelProps) {
  const Wrapper = mobileSheet ? 'div' : 'aside';
  const hasBriefing = decisions.length > 0 || tasks.length > 0 || notes.length > 0;

  return (
    <Wrapper
      className={cn(
        'bg-context flex flex-col transition-all duration-200',
        mobileSheet
          ? 'h-full'
          : cn('border-context-border h-full border-l', collapsed ? 'w-0 overflow-hidden' : 'w-80')
      )}
    >
      {/* Header */}
      <div className="border-context-border border-b px-5 py-4">
        <ChromeLabel className="text-panel-muted tracking-[0.2em]">
          {mobileSheet ? `${memberName} / Briefing` : 'Briefing'}
        </ChromeLabel>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto pt-2">
        {decisions.length > 0 && (
          <Section title="Decisions" count={decisions.length} defaultOpen>
            {decisions.map((d, i) => (
              <BulletItem key={i} text={d.text} />
            ))}
          </Section>
        )}

        {tasks.length > 0 && (
          <Section title="Tasks" count={tasks.length} defaultOpen>
            {tasks.map((t, i) => (
              <BulletItem key={i} text={t.text} sub={t.due} />
            ))}
          </Section>
        )}

        {notes.length > 0 && (
          <Section title="Notes" count={notes.length} defaultOpen={false}>
            {notes.map((n, i) => (
              <BulletItem key={i} text={n.text} />
            ))}
          </Section>
        )}

        {!hasBriefing && (
          <ChromeLabel as="p" className="text-panel-faint px-5 py-4 text-[10px]">
            No briefing yet
          </ChromeLabel>
        )}
      </div>
    </Wrapper>
  );
}
