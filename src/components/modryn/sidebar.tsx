'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Inbox,
  MessagesSquare,
  Plus,
  UserPlus,
  LogOut,
  GripVertical,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useProfile } from '@/lib/use-profile';
import { useRole } from '@/hooks/use-role';
import { authClient } from '@/lib/auth/client';
import { ProfileSheet } from '@/components/modryn/profile-sheet';
import { AddMemberSheet } from '@/components/modryn/add-member-sheet';
import { InviteMemberSheet } from '@/components/modryn/invite-member-sheet';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { site } from '@/config/site';
import type { AIMember } from '@/hooks/use-members';

export type View = 'chat' | 'inbox' | 'threads' | 'tasks' | 'calendar';

type MemberStatus = 'online' | 'analyzing' | 'away';

interface Member {
  id: string;
  name: string;
  role: string;
  status: MemberStatus;
  isAI: boolean;
  initials: string;
  avatarUrl: string;
}

interface SidebarProps {
  activeView: View;
  activeChat: string;
  members: AIMember[];
  onViewChange: (view: View) => void;
  onChatSelect: (memberId: string) => void;
  onMemberAdded: () => void;
  onMembersReorder: (orderedIds: string[]) => void;
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
  online: 'online',
  analyzing: 'analyzing',
  away: 'away',
};

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'DMs', icon: MessageSquare },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'threads', label: 'Threads', icon: MessagesSquare },
];

function MemberAvatar({
  member,
  isAdmin,
  isDragging,
  onEdit,
}: {
  member: Member;
  isAdmin?: boolean;
  isDragging?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="group/avatar relative shrink-0">
      {member.avatarUrl ? (
        <Image
          src={member.avatarUrl}
          alt={member.name}
          width={32}
          height={32}
          unoptimized
          className="h-8 w-8 rounded-sm object-cover"
        />
      ) : (
        <div className="bg-sidebar-accent text-sidebar-foreground flex h-8 w-8 items-center justify-center rounded-sm font-mono text-[10px] font-semibold">
          {member.initials}
        </div>
      )}
      {isAdmin && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="bg-sidebar/80 absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/avatar:opacity-100"
          aria-label={`Edit ${member.name}`}
          title={`Edit ${member.name}`}
          role="button"
        >
          <GripVertical className="text-sidebar-foreground h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

function MemberMeta({ member }: { member: Member }) {
  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {member.role && (
        <p className="text-sidebar-muted truncate text-[12px] leading-tight">{member.role}</p>
      )}
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', statusColors[member.status])} />
        <span
          className={cn(
            'font-mono text-[10px] leading-none tracking-[0.08em]',
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
  isAdmin,
  onEdit,
  onClick,
}: {
  member: Member;
  selected: boolean;
  isAdmin?: boolean;
  onEdit?: () => void;
  onClick?: () => void;
}) {
  const content = (
    <>
      <MemberAvatar member={member} isAdmin={isAdmin} onEdit={onEdit} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sidebar-primary truncate text-[14px] font-medium tracking-tight">
            {member.name}
          </p>
          {member.isAI && (
            <ChromeLabel className="bg-sidebar-border text-sidebar-muted rounded-sm px-1 py-0.5 leading-none tracking-[0.08em]">
              AI
            </ChromeLabel>
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
          ? 'bg-sidebar-accent border-white/10 shadow-sm'
          : 'hover:bg-sidebar-accent/45 border-transparent hover:border-white/5'
      )}
    >
      {content}
    </button>
  );
}

export function Sidebar({
  activeView,
  activeChat,
  members,
  onViewChange,
  onChatSelect,
  onMemberAdded,
  onMembersReorder,
}: SidebarProps) {
  const { profile, save } = useProfile();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<AIMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [orderedMembers, setOrderedMembers] = useState<AIMember[]>(members);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIdRef = useRef<string | null>(null);

  // Keep orderedMembers in sync when members prop changes (e.g. after refetch)
  useEffect(() => {
    setOrderedMembers(members);
  }, [members]);

  const handleDragStart = useCallback((id: string, e: React.DragEvent) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    setDropIndex(insertBefore ? index : index + 1);
  }, []);

  const handleDrop = useCallback(() => {
    const srcId = dragIdRef.current;
    dragIdRef.current = null;
    setDropIndex((insertAt) => {
      if (srcId === null || insertAt === null) return null;
      setOrderedMembers((prev) => {
        const srcIdx = prev.findIndex((m) => m.id === srcId);
        if (srcIdx === -1) return prev;
        const next = [...prev];
        const [item] = next.splice(srcIdx, 1);
        // Adjust insertion point since we removed the source item first
        const adjusted = insertAt > srcIdx ? insertAt - 1 : insertAt;
        next.splice(adjusted, 0, item);
        // Persist asynchronously — fire and forget
        fetch('/api/members/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: next.map((m) => m.id) }),
        })
          .then((res) => {
            if (res.ok) onMembersReorder(next.map((m) => m.id));
          })
          .catch(() => {
            /* silent — UI already reflects new order */
          });
        return next;
      });
      return null;
    });
  }, [onMembersReorder]);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDropIndex(null);
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/auth/sign-in');
  }

  return (
    <>
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        save={save}
      />
      <AddMemberSheet
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        onMemberAdded={() => {
          onMemberAdded();
          setAddMemberOpen(false);
        }}
      />
      <AddMemberSheet
        open={!!editingMember}
        onOpenChange={(v) => {
          if (!v) setEditingMember(null);
        }}
        onMemberAdded={() => {
          onMemberAdded();
          setEditingMember(null);
        }}
        member={editingMember ?? undefined}
      />
      <InviteMemberSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      <aside className="bg-sidebar border-sidebar-border flex h-full border-r">
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
                      ? 'bg-sidebar-accent text-sidebar-primary border border-white/10 shadow-sm'
                      : 'text-sidebar-muted hover:bg-sidebar-accent/45 hover:text-sidebar-foreground border border-transparent hover:border-white/5'
                  )}
                  title={label}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <ChromeLabel className="leading-none tracking-[0.08em] normal-case">
                    {label}
                  </ChromeLabel>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-auto flex w-full flex-col items-center px-2 pb-4">
            <button
              onClick={handleSignOut}
              className="rounded-card text-sidebar-muted hover:bg-sidebar-accent/45 hover:text-sidebar-foreground flex w-full flex-col items-center justify-center gap-1 border border-transparent py-1.5 transition-colors hover:border-white/5"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.5} />
              <ChromeLabel className="leading-none tracking-[0.08em] normal-case">Out</ChromeLabel>
            </button>
          </div>
        </nav>

        {/* Team roster */}
        <div className="flex w-60 flex-col overflow-y-auto">
          <div className="flex h-18 items-center px-4">
            <span className="text-sidebar-primary truncate text-[14px] font-medium tracking-[0.05em] uppercase">
              {site.name}
            </span>
          </div>

          <div className="mb-6 px-2 pt-2">
            <ChromeLabel as="p" className="text-sidebar-muted mb-2 px-2">
              Team
            </ChromeLabel>
            {/* Founder row — avatar click opens profile sheet */}
            <button
              onClick={() => {
                onViewChange('chat');
                onChatSelect('founder');
              }}
              className={cn(
                'rounded-card flex w-full items-center gap-2.5 border px-2 py-1.5 text-left transition-colors',
                activeChat === 'founder' && activeView === 'chat'
                  ? 'bg-sidebar-accent border-white/10 shadow-sm'
                  : 'hover:bg-sidebar-accent/45 border-transparent hover:border-white/5'
              )}
            >
              <div className="group/avatar relative shrink-0">
                {profile.avatarDataUrl ? (
                  <Image
                    src={profile.avatarDataUrl}
                    alt={profile.name}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-sm object-cover"
                  />
                ) : (
                  <div className="bg-sidebar-accent text-sidebar-foreground flex h-8 w-8 items-center justify-center rounded-sm font-mono text-[10px] font-semibold">
                    {profile.initials}
                  </div>
                )}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen(true);
                  }}
                  className="bg-sidebar/80 absolute inset-0 flex cursor-pointer items-center justify-center rounded-sm opacity-0 transition-opacity group-hover/avatar:opacity-100"
                  aria-label="Edit profile"
                  role="button"
                >
                  <GripVertical className="text-sidebar-foreground h-3.5 w-3.5" strokeWidth={1.5} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sidebar-primary truncate text-[14px] font-medium tracking-tight">
                  {profile.name}
                </p>
                {profile.role && (
                  <p className="text-sidebar-muted truncate text-[12px] leading-tight">
                    {profile.role}
                  </p>
                )}
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="bg-status-online h-1.5 w-1.5 rounded-full" />
                  <ChromeLabel className="text-status-online leading-none tracking-[0.08em] normal-case">
                    online
                  </ChromeLabel>
                </div>
              </div>
            </button>
          </div>

          <div className="flex-1 px-2">
            <ChromeLabel as="p" className="text-sidebar-muted mb-2 px-2">
              AI Members
            </ChromeLabel>
            {members.length === 0 ? (
              <p className="text-sidebar-muted px-2 py-1 font-mono text-[12px]">
                No members — add one
              </p>
            ) : (
              <>
                {orderedMembers.map((m, index) => {
                  const member: Member = {
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    initials: m.initials,
                    status: m.status,
                    isAI: true,
                    avatarUrl: m.avatarUrl,
                  };
                  return (
                    <div key={member.id}>
                      {dropIndex === index && (
                        <div className="bg-sidebar-foreground/50 mx-2 my-0.5 h-0.5 rounded-full" />
                      )}
                      <div
                        draggable={isAdmin && !roleLoading}
                        onDragStart={(e) => handleDragStart(member.id, e)}
                        onDragOver={(e) => handleDragOver(index, e)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                      >
                        <MemberRow
                          member={member}
                          selected={activeChat === member.id && activeView === 'chat'}
                          isAdmin={!roleLoading && isAdmin}
                          onEdit={() => setEditingMember(m)}
                          onClick={() => {
                            onViewChange('chat');
                            onChatSelect(member.id);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {dropIndex === orderedMembers.length && (
                  <div className="bg-sidebar-foreground/50 mx-2 my-0.5 h-0.5 rounded-full" />
                )}
              </>
            )}
            {!roleLoading && isAdmin && (
              <button
                onClick={() => setAddMemberOpen(true)}
                className="rounded-card hover:bg-sidebar-accent/45 border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground mt-2 flex w-full items-center gap-2 border border-dashed px-2 py-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <ChromeLabel className="tracking-[0.05em] normal-case">Add AI member</ChromeLabel>
              </button>
            )}
            {!roleLoading && isAdmin && (
              <button
                onClick={() => setInviteOpen(true)}
                className="rounded-card hover:bg-sidebar-accent/45 border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground mt-1 flex w-full items-center gap-2 border border-dashed px-2 py-1.5 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <ChromeLabel className="tracking-[0.05em] normal-case">Invite person</ChromeLabel>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
