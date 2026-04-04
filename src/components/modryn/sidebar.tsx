'use client';

import { useState } from 'react';
import { MessageSquare, MessagesSquare, Inbox, CheckSquare, Calendar } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useProfile } from '@/lib/use-profile';
import { ProfileSheet } from '@/components/modryn/profile-sheet';

export type View = 'chat' | 'inbox' | 'threads' | 'tasks' | 'calendar';

type MemberStatus = 'online' | 'analyzing' | 'away';

interface Member {
  id: string;
  name: string;
  role: string;
  status: MemberStatus;
  isAI: boolean;
  initials: string;
}

const TEAM_MEMBERS: Member[] = [
  {
    id: 'founder',
    name: 'Founder',
    role: '',
    status: 'online',
    isAI: false,
    initials: 'LH',
  },
];

const AI_MEMBERS: Member[] = [
  {
    id: 'peter-thiel',
    name: 'Peter Thiel',
    role: 'AI Strategist',
    status: 'analyzing',
    isAI: true,
    initials: 'PT',
  },
];

const FUTURE_AI: Member[] = [
  {
    id: 'ai-member-2',
    name: 'AI Member 2',
    role: 'AI Strategist',
    status: 'analyzing',
    isAI: true,
    initials: 'A2',
  },
  {
    id: 'ai-member-3',
    name: 'AI Member 3',
    role: 'AI Strategist',
    status: 'analyzing',
    isAI: true,
    initials: 'A3',
  },
];

interface SidebarProps {
  activeView: View;
  activeChat: string;
  onViewChange: (view: View) => void;
  onChatSelect: (memberId: string) => void;
}

const statusColors: Record<MemberStatus, string> = {
  online: 'bg-status-online',
  analyzing: 'bg-status-active',
  away: 'bg-sidebar-ring',
};

const statusTextColors: Record<MemberStatus, string> = {
  online: 'text-status-online',
  analyzing: 'text-status-active',
  away: 'text-sidebar-ring',
};

const statusLabels: Record<MemberStatus, string> = {
  online: 'Online',
  analyzing: 'Analyzing',
  away: 'Away',
};

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'DMs', icon: MessageSquare },
  { id: 'threads', label: 'Threads', icon: MessagesSquare },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

function FounderAvatar({
  name,
  avatarDataUrl,
  initials,
}: {
  name: string;
  avatarDataUrl: string;
  initials: string;
}) {
  return (
    <div className="relative shrink-0">
      {avatarDataUrl ? (
        <img src={avatarDataUrl} alt={name} className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <div className="bg-sidebar-accent text-sidebar-foreground flex h-8 w-8 items-center justify-center rounded-full font-mono text-[10px] font-semibold">
          {initials}
        </div>
      )}
    </div>
  );
}

function MemberAvatar({ member }: { member: Member }) {
  if (member.id === 'founder') {
    // Rendered separately via FounderRow — this branch is never reached
    return null;
  }

  if (member.id === 'peter-thiel') {
    return (
      <div className="relative shrink-0">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Peter_Thiel_2018.jpg"
          alt={member.name}
          className="h-8 w-8 rounded-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full font-mono text-[10px] font-semibold',
          member.isAI
            ? 'bg-sidebar-accent text-sidebar-foreground'
            : 'bg-sidebar-accent text-sidebar-foreground'
        )}
      >
        {member.initials}
      </div>
    </div>
  );
}

function MemberMeta({ member }: { member: Member }) {
  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {member.role && (
        <p className="text-sidebar-muted truncate text-[11px] leading-tight">{member.role}</p>
      )}
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', statusColors[member.status])} />
        <span
          className={cn(
            'text-[10px] leading-none font-medium tracking-wide',
            statusTextColors[member.status]
          )}
        >
          {statusLabels[member.status]}
        </span>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  selected,
  onClick,
}: {
  member: Member;
  selected: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <MemberAvatar member={member} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sidebar-primary truncate text-[13px] font-medium tracking-tight">
            {member.name}
          </p>
          {member.isAI && (
            <span className="bg-sidebar-accent text-sidebar-muted rounded px-1 py-0.5 font-mono text-[9px] font-medium">
              AI
            </span>
          )}
        </div>
        <MemberMeta member={member} />
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-card flex w-full cursor-default items-center gap-2.5 border border-transparent px-2 py-1.5 text-left opacity-60 select-none">
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-card flex w-full items-center gap-2.5 border px-2 py-1.5 text-left transition-colors',
        selected
          ? 'bg-sidebar-accent border-white/5 shadow-sm'
          : 'hover:bg-sidebar-accent/60 border-transparent'
      )}
    >
      {content}
    </button>
  );
}

export function Sidebar({ activeView, activeChat, onViewChange, onChatSelect }: SidebarProps) {
  const { profile, save } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        save={save}
      />
      <aside className="bg-sidebar flex h-full">
        {/* Icon rail */}
        <nav className="border-sidebar-border bg-sidebar-rail flex w-18 flex-col items-center border-r">
          <div className="flex h-18 w-full items-center justify-center">
            <Image
              src="/brand/logomark.png"
              alt="Modryn Studio"
              width={24}
              height={24}
              className="object-contain opacity-80"
            />
          </div>

          <div className="flex w-full flex-col items-center gap-1.5 px-2 pt-4">
            {navItems.map(({ id, label, icon: Icon }) => (
              <div key={id} className="relative w-full">
                {activeView === id && (
                  <span className="bg-sidebar-primary absolute inset-y-0 -left-2 w-0.75 rounded-r-full" />
                )}
                <button
                  onClick={() => onViewChange(id)}
                  className={cn(
                    'rounded-card flex w-full flex-col items-center justify-center gap-1 py-1.5 transition-colors',
                    activeView === id
                      ? 'bg-sidebar-accent text-sidebar-primary border border-white/5 shadow-sm'
                      : 'text-sidebar-muted hover:text-sidebar-foreground border border-transparent'
                  )}
                  title={label}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] leading-none font-normal tracking-wide">
                    {label}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </nav>

        {/* Team roster */}
        <div className="flex w-60 flex-col overflow-y-auto">
          <div className="flex h-18 items-center px-4">
            <span className="text-sidebar-foreground text-[13px] font-medium tracking-[0.05em] uppercase">
              Modryn Studio
            </span>
          </div>

          <div className="mb-6 px-2 pt-2">
            <p className="text-sidebar-muted mb-2 px-2 text-[10px] font-medium tracking-widest uppercase">
              Team
            </p>
            {/* Founder row — uses live profile data, avatar click opens ProfileSheet */}
            <button
              onClick={() => {
                onViewChange('chat');
                onChatSelect('founder');
              }}
              className={cn(
                'rounded-card flex w-full items-center gap-2.5 border px-2 py-1.5 text-left transition-colors',
                activeChat === 'founder' && activeView === 'chat'
                  ? 'bg-sidebar-accent border-white/5 shadow-sm'
                  : 'hover:bg-sidebar-accent/60 border-transparent'
              )}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setProfileOpen(true);
                  }
                }}
                className="group relative shrink-0 cursor-pointer"
                aria-label="Edit profile"
              >
                <FounderAvatar
                  name={profile.name}
                  avatarDataUrl={profile.avatarDataUrl}
                  initials={profile.initials}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-[8px] font-medium text-white">Edit</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sidebar-primary truncate text-[13px] font-medium tracking-tight">
                  {profile.name}
                </p>
                {profile.description && (
                  <p className="text-sidebar-muted truncate text-[11px] leading-tight">
                    {profile.description}
                  </p>
                )}
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="bg-status-online h-1.5 w-1.5 rounded-full" />
                  <span className="text-status-online text-[10px] leading-none font-medium tracking-wide">
                    Online
                  </span>
                </div>
              </div>
            </button>
          </div>

          <div className="flex-1 px-2">
            <p className="text-sidebar-muted mb-2 px-2 text-[10px] font-medium tracking-widest uppercase">
              AI Members
            </p>
            {AI_MEMBERS.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                selected={activeChat === member.id && activeView === 'chat'}
                onClick={() => {
                  onViewChange('chat');
                  onChatSelect(member.id);
                }}
              />
            ))}

            {FUTURE_AI.map((member) => (
              <MemberRow key={member.id} member={member} selected={false} />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
