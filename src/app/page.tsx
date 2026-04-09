'use client';

import { useEffect, useState } from 'react';
import { Sidebar, type View } from '@/components/modryn/sidebar';
import { ChatView } from '@/components/modryn/chat-view';
import { ContextPanel } from '@/components/modryn/context-panel';
import { InboxView } from '@/components/modryn/inbox-view';
import { ThreadsView } from '@/components/modryn/threads-view';
import { PlaceholderView } from '@/components/modryn/placeholder-view';
import { SetupView } from '@/components/modryn/setup-view';
import { MobileHeader } from '@/components/modryn/mobile-header';
import { MobileDrawer } from '@/components/modryn/mobile-drawer';
import { MobileTabBar } from '@/components/modryn/mobile-tab-bar';
import { MobileContextFab } from '@/components/modryn/mobile-context-fab';
import { useMembers } from '@/hooks/use-members';
import { useProfile } from '@/lib/use-profile';

export default function ModrynStudio() {
  // Start with server-safe defaults — avoids hydration mismatch.
  // Apply persisted values after mount so server and client HTML agree.
  const [activeView, setActiveView] = useState<View>('chat');
  const [activeChat, setActiveChat] = useState<string>('');
  useEffect(() => {
    const view = localStorage.getItem('modryn:activeView') as View | null;
    const chat = localStorage.getItem('modryn:activeChat');
    if (view) setActiveView(view);
    if (chat) setActiveChat(chat);
  }, []);
  const [contextCollapsed, setContextCollapsed] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const { members, refetch } = useMembers();
  const { profile } = useProfile();

  const handleViewChange = (view: View) => {
    setActiveView(view);
    localStorage.setItem('modryn:activeView', view);
  };

  const handleChatSelect = (memberId: string) => {
    setActiveChat(memberId);
    localStorage.setItem('modryn:activeChat', memberId);
  };

  // activeMember falls back to first member only when nothing is stored yet
  const activeMember =
    members.find((m) => m.id === activeChat) ??
    (activeChat === '' ? members[0] : undefined) ??
    members[0];

  const mainContent = (
    <>
      {activeView === 'chat' && activeMember && (
        <ChatView
          key={activeMember.id}
          memberId={activeMember.id}
          memberName={activeMember.name}
          memberRole={activeMember.role}
          memberInitials={activeMember.initials}
          memberAvatarUrl={activeMember.avatarUrl}
          surface="dm"
          contextCollapsed={contextCollapsed}
          onToggleContext={() => setContextCollapsed((v) => !v)}
        />
      )}
      {activeView === 'chat' && !activeMember && (
        <div className="bg-panel flex flex-1 flex-col items-center justify-center p-8">
          <p className="text-panel-muted text-[13px]">Add a team member to start a conversation.</p>
        </div>
      )}
      {activeView === 'inbox' && <InboxView />}
      {activeView === 'threads' && <ThreadsView />}
      {activeView === 'tasks' && (
        <PlaceholderView
          label="[ ]"
          title="Task Board"
          description="Shared task management with AI assignment and tracking — coming in the next release."
        />
      )}
      {activeView === 'calendar' && (
        <PlaceholderView
          label="##"
          title="Team Calendar"
          description="Scheduling, milestones, and AI-coordinated meeting prep — coming in the next release."
        />
      )}
    </>
  );

  const centreContent = profile.name === '' ? <SetupView /> : mainContent;

  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* —— Desktop layout —— */}
      {/* Left sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          activeChat={activeChat}
          members={members}
          onViewChange={handleViewChange}
          onChatSelect={handleChatSelect}
          onMemberAdded={refetch}
          onMembersReorder={refetch}
        />
      </div>

      {/* Center + Right panels — desktop */}
      <div className="hidden min-w-0 flex-1 overflow-hidden md:flex">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{centreContent}</main>
        {activeView === 'chat' && activeMember && (
          <ContextPanel
            memberName={activeMember.name}
            decisions={[]}
            tasks={[]}
            notes={[]}
            collapsed={contextCollapsed}
          />
        )}
      </div>

      {/* â”€â”€ Mobile layout â”€â”€ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:hidden">
        {/* Top header bar */}
        <MobileHeader
          drawerOpen={mobileDrawerOpen}
          onToggleDrawer={() => {
            setMobileDrawerOpen((v) => !v);
            setMobileContextOpen(false);
          }}
          activeMember={
            activeView === 'chat' && activeMember
              ? {
                  name: activeMember.name,
                  initials: activeMember.initials,
                  role: activeMember.role,
                  avatarUrl: activeMember.avatarUrl,
                }
              : undefined
          }
        />

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{centreContent}</main>

        {/* Bottom tab bar */}
        <MobileTabBar
          activeView={activeView}
          showBriefingStrip={activeView === 'chat'}
          briefingOpen={mobileContextOpen}
          onOpenBriefing={() => setMobileContextOpen(true)}
          onViewChange={(v) => {
            handleViewChange(v);
            setMobileDrawerOpen(false);
            setMobileContextOpen(false);
          }}
        />
      </div>

      {/* Mobile drawer (team roster) */}
      <MobileDrawer
        open={mobileDrawerOpen}
        activeChat={activeChat}
        members={members}
        onClose={() => setMobileDrawerOpen(false)}
        onChatSelect={(id) => {
          handleChatSelect(id);
          handleViewChange('chat');
          setMobileContextOpen(false);
        }}
      />

      {/* Mobile briefing pull-tab + sheet — only in chat view */}
      {activeView === 'chat' && activeMember && (
        <MobileContextFab
          open={mobileContextOpen}
          onToggle={() => setMobileContextOpen((v) => !v)}
          memberName={activeMember.name}
          decisions={[]}
          tasks={[]}
          notes={[]}
        />
      )}
    </div>
  );
}
