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
  online: 'bg-status-online',
  analyzing: 'bg-status-active',
  away: 'bg-sidebar-ring',
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
            member.isAI
              ? 'bg-sidebar-accent text-sidebar-foreground'
              : 'bg-sidebar-accent text-sidebar-foreground'
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
          <p className="text-sidebar-foreground truncate text-sm font-medium">{member.name}</p>
          {member.isAI && (
            <span className="bg-sidebar-accent text-sidebar-muted flex-shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[8px]">
              AI
            </span>
          )}
        </div>
        <p className="text-sidebar-muted truncate text-xs">{member.role}</p>
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
          <span className="text-sidebar-foreground font-mono text-sm font-bold tracking-tight">
            M
          </span>
          <span className="text-sidebar-muted font-mono text-[10px] tracking-[0.2em] uppercase">
            Modryn Studio
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Team */}
          <p className="text-sidebar-ring px-5 pt-3 pb-2 font-mono text-[9px] tracking-[0.18em] uppercase">
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
          <p className="text-sidebar-ring px-5 pt-4 pb-2 font-mono text-[9px] tracking-[0.18em] uppercase">
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
              <div className="border-sidebar-ring flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border border-dashed">
                <span className="text-sidebar-ring text-xs">+</span>
              </div>
              <div>
                <p className="text-sidebar-muted truncate text-sm">{item.name}</p>
                <p className="text-sidebar-ring truncate text-xs">{item.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-sidebar-border border-t px-5 py-3">
          <p className="text-sidebar-ring font-mono text-[9px] tracking-widest uppercase">
            v0.1 — prototype
          </p>
        </div>
      </div>
    </>
  );
}
