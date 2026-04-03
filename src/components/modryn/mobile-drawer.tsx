'use client';

import { cn } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'analyzing' | 'away';
  isAI: boolean;
  initials: string;
}

const TEAM_MEMBERS: Member[] = [
  { id: 'founder', name: 'Founder', role: 'CEO', status: 'online', isAI: false, initials: 'F' },
];

const AI_MEMBERS: Member[] = [
  {
    id: 'peter-thiel',
    name: 'Peter Thiel',
    role: 'AI Strategist',
    status: 'online',
    isAI: true,
    initials: 'PT',
  },
];

const FUTURE_AI: { name: string; role: string }[] = [
  { name: 'AI Member 2', role: 'Coming soon' },
  { name: 'AI Member 3', role: 'Coming soon' },
];

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500',
  analyzing: 'bg-status-active',
  away: 'bg-zinc-500',
};

interface MobileDrawerProps {
  open: boolean;
  activeChat: string;
  onClose: () => void;
  onChatSelect: (id: string) => void;
}

function MemberRow({
  member,
  active,
  onClick,
}: {
  member: Member;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
        active ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/60'
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-sm font-mono text-xs font-semibold',
            member.isAI ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-600 text-zinc-100'
          )}
        >
          {member.initials}
        </div>
        <span
          className={cn(
            'border-sidebar absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border',
            statusColors[member.status]
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-200">{member.name}</p>
          {member.isAI && (
            <span className="flex-shrink-0 rounded-sm bg-zinc-700 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
              AI
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">{member.role}</p>
      </div>
    </button>
  );
}

export function MobileDrawer({ open, activeChat, onClose, onChatSelect }: MobileDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          'bg-sidebar fixed top-0 left-0 z-50 flex h-full w-72 flex-col transition-transform duration-250 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Team roster"
      >
        {/* Header */}
        <div className="border-sidebar-border flex items-center gap-2 border-b px-5 pt-5 pb-4">
          <span className="font-mono text-sm font-bold tracking-tight text-zinc-300">M</span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
            Modryn Studio
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Team */}
          <p className="px-5 pt-3 pb-2 font-mono text-[9px] tracking-[0.18em] text-zinc-600 uppercase">
            Team
          </p>
          {TEAM_MEMBERS.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              active={activeChat === m.id}
              onClick={() => {
                onChatSelect(m.id);
                onClose();
              }}
            />
          ))}

          {/* AI Members */}
          <p className="px-5 pt-4 pb-2 font-mono text-[9px] tracking-[0.18em] text-zinc-600 uppercase">
            AI Members
          </p>
          {AI_MEMBERS.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              active={activeChat === m.id}
              onClick={() => {
                onChatSelect(m.id);
                onClose();
              }}
            />
          ))}

          {/* Future slots */}
          {FUTURE_AI.map((item, i) => (
            <div
              key={i}
              className="flex cursor-default items-center gap-3 px-5 py-3 opacity-30 select-none"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border border-dashed border-zinc-700">
                <span className="text-xs text-zinc-600">+</span>
              </div>
              <div>
                <p className="truncate text-sm text-zinc-500">{item.name}</p>
                <p className="truncate text-xs text-zinc-600">{item.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-sidebar-border border-t px-5 py-3">
          <p className="font-mono text-[9px] tracking-widest text-zinc-600 uppercase">
            v0.1 — prototype
          </p>
        </div>
      </div>
    </>
  );
}
