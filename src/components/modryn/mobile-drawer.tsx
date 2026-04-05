'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { useProfile } from '@/lib/use-profile';
import type { AIMember } from '@/hooks/use-members';

interface Member {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'analyzing' | 'away';
  isAI: boolean;
  initials: string;
  avatarDataUrl?: string;
}

const statusColors: Record<string, string> = {
  online: 'bg-status-online',
  analyzing: 'bg-status-active',
  away: 'bg-sidebar-ring',
};

interface MobileDrawerProps {
  open: boolean;
  activeChat: string;
  members: AIMember[];
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
      <div className="relative shrink-0">
        {member.avatarDataUrl ? (
          <Image
            src={member.avatarDataUrl}
            alt={member.name}
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-sm object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-sm font-mono text-xs font-semibold',
              'bg-sidebar-accent text-sidebar-foreground'
            )}
          >
            {member.initials}
          </div>
        )}
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
            <ChromeLabel className="bg-sidebar-border text-sidebar-muted rounded-sm px-1 py-0.5 leading-none tracking-[0.08em]">
              AI
            </ChromeLabel>
          )}
        </div>
        {member.role && <p className="text-sidebar-muted truncate text-xs">{member.role}</p>}
      </div>
    </button>
  );
}

export function MobileDrawer({
  open,
  activeChat,
  members,
  onClose,
  onChatSelect,
}: MobileDrawerProps) {
  const { profile } = useProfile();
  const founder: Member = {
    id: 'founder',
    name: profile.name,
    role: profile.description,
    status: 'online',
    isAI: false,
    initials: profile.initials,
    avatarDataUrl: profile.avatarDataUrl,
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="bg-background/60 fixed inset-0 z-40 md:hidden"
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
          <Image
            src="/brand/logomark.png"
            alt="Modryn Studio"
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 object-contain opacity-80"
          />
          <ChromeLabel className="text-sidebar-muted text-[10px] tracking-[0.2em]">
            Modryn Studio
          </ChromeLabel>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Team */}
          <ChromeLabel as="p" className="text-sidebar-ring px-5 pt-3 pb-2">
            Team
          </ChromeLabel>
          <MemberRow
            key={founder.id}
            member={founder}
            active={activeChat === founder.id}
            onClick={() => {
              onChatSelect(founder.id);
              onClose();
            }}
          />

          {/* AI Members */}
          <ChromeLabel as="p" className="text-sidebar-ring px-5 pt-4 pb-2">
            AI Members
          </ChromeLabel>
          {members.map((m) => {
            const member: Member = {
              id: m.id,
              name: m.name,
              role: m.role,
              initials: m.initials,
              status: m.status,
              isAI: true,
            };
            return (
              <MemberRow
                key={member.id}
                member={member}
                active={activeChat === member.id}
                onClick={() => {
                  onChatSelect(member.id);
                  onClose();
                }}
              />
            );
          })}
        </div>

        <div className="border-sidebar-border border-t px-5 py-3">
          <ChromeLabel as="p" className="text-sidebar-ring tracking-widest">
            v0.1 — prototype
          </ChromeLabel>
        </div>
      </div>
    </>
  );
}
