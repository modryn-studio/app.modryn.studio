'use client';

import { MessageSquare, GitBranch, Inbox, CheckSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type View = 'chat' | 'inbox' | 'threads' | 'tasks' | 'calendar';

interface Member {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'analyzing' | 'away';
  isAI: boolean;
  initials: string;
}

const TEAM_MEMBERS: Member[] = [
  {
    id: 'founder',
    name: 'Founder',
    role: 'CEO',
    status: 'online',
    isAI: false,
    initials: 'F',
  },
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
  // Placeholder slots for future AI members
];

const FUTURE_AI: { name: string; role: string }[] = [
  { name: 'AI Member 2', role: 'Coming soon' },
  { name: 'AI Member 3', role: 'Coming soon' },
];

interface SidebarProps {
  activeView: View;
  activeChat: string;
  onViewChange: (view: View) => void;
  onChatSelect: (memberId: string) => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500',
  analyzing: 'bg-status-active',
  away: 'bg-zinc-500',
};

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'DMs', icon: MessageSquare },
  { id: 'threads', label: 'Threads', icon: GitBranch },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

function MemberAvatar({ member }: { member: Member }) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-sm font-mono text-xs font-semibold',
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
  );
}

export function Sidebar({ activeView, activeChat, onViewChange, onChatSelect }: SidebarProps) {
  return (
    <aside className="bg-sidebar flex h-full">
      {/* Icon rail */}
      <nav className="border-sidebar-border flex w-14 flex-col items-center gap-1 border-r pt-4 pb-4">
        {/* Logo mark */}
        <div className="mb-4 flex h-8 w-8 items-center justify-center">
          <span className="font-mono text-sm font-bold tracking-tight text-zinc-200 select-none">
            M
          </span>
        </div>

        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              'flex w-full flex-col items-center gap-1 rounded-sm px-1 py-2 transition-colors',
              activeView === id ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span className="font-mono text-[9px] tracking-widest uppercase">{label}</span>
          </button>
        ))}
      </nav>

      {/* Team roster */}
      <div className="flex w-48 flex-col overflow-y-auto pt-4">
        {/* Wordmark */}
        <div className="mb-5 px-4">
          <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
            Modryn Studio
          </span>
        </div>

        {/* Team section */}
        <div className="mb-4 px-3">
          <p className="mb-2 px-1 font-mono text-[9px] tracking-[0.18em] text-zinc-600 uppercase">
            Team
          </p>
          {TEAM_MEMBERS.map((member) => (
            <button
              key={member.id}
              onClick={() => {
                onViewChange('chat');
                onChatSelect(member.id);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors',
                activeChat === member.id && activeView === 'chat'
                  ? 'bg-sidebar-accent'
                  : 'hover:bg-sidebar-accent/50'
              )}
            >
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200">{member.name}</p>
                <p className="truncate text-[10px] text-zinc-500">{member.role}</p>
              </div>
            </button>
          ))}
        </div>

        {/* AI Members section */}
        <div className="flex-1 px-3">
          <p className="mb-2 px-1 font-mono text-[9px] tracking-[0.18em] text-zinc-600 uppercase">
            AI Members
          </p>
          {AI_MEMBERS.map((member) => (
            <button
              key={member.id}
              onClick={() => {
                onViewChange('chat');
                onChatSelect(member.id);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors',
                activeChat === member.id && activeView === 'chat'
                  ? 'bg-sidebar-accent'
                  : 'hover:bg-sidebar-accent/50'
              )}
            >
              <MemberAvatar member={member} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-medium text-zinc-200">{member.name}</p>
                  <span className="rounded-sm bg-zinc-700 px-1 py-0.5 font-mono text-[8px] text-zinc-400">
                    AI
                  </span>
                </div>
                <p className="truncate text-[10px] text-zinc-500">{member.role}</p>
              </div>
            </button>
          ))}

          {/* Future slots */}
          {FUTURE_AI.map((item, i) => (
            <div
              key={i}
              className="flex w-full cursor-default items-center gap-2.5 rounded-sm px-2 py-1.5 opacity-30 select-none"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-dashed border-zinc-700">
                <span className="text-[10px] text-zinc-600">+</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-zinc-500">{item.name}</p>
                <p className="truncate text-[10px] text-zinc-600">{item.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-sidebar-border mt-auto border-t px-4 py-3">
          <p className="font-mono text-[9px] tracking-widest text-zinc-600 uppercase">
            v0.1 — prototype
          </p>
        </div>
      </div>
    </aside>
  );
}
