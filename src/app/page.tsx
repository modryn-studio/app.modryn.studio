'use client';

import { useState } from 'react';
import { Sidebar, type View } from '@/components/modryn/sidebar';
import { ChatView } from '@/components/modryn/chat-view';
import { ContextPanel } from '@/components/modryn/context-panel';
import { InboxView } from '@/components/modryn/inbox-view';
import { PlaceholderView } from '@/components/modryn/placeholder-view';
import { MobileHeader } from '@/components/modryn/mobile-header';
import { MobileDrawer } from '@/components/modryn/mobile-drawer';
import { MobileTabBar } from '@/components/modryn/mobile-tab-bar';
import { MobileContextFab } from '@/components/modryn/mobile-context-fab';

const AI_MEMBERS: Record<
  string,
  {
    name: string;
    role: string;
    initials: string;
    decisions: { text: string }[];
    tasks: { text: string; due?: string }[];
    notes: { text: string }[];
  }
> = {
  'peter-thiel': {
    name: 'Peter Thiel',
    role: 'AI Strategist',
    initials: 'PT',
    decisions: [
      { text: 'Focus on B2B enterprise segment first' },
      { text: 'Avoid Series A until product-market fit is certain' },
      { text: 'Do not compete on price — compete on indispensability' },
    ],
    tasks: [
      { text: 'Refine the monopoly thesis', due: 'Due today' },
      { text: 'Review go-to-market assumptions', due: 'Due Fri' },
    ],
    notes: [
      { text: 'Discussed the difference between 0 → 1 and 1 → N' },
      { text: 'Challenged the assumption that competition validates the market' },
    ],
  },
};

export default function ModrynStudio() {
  const [activeView, setActiveView] = useState<View>('chat');
  const [activeChat, setActiveChat] = useState('peter-thiel');
  const [contextCollapsed, setContextCollapsed] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  const activeMember = AI_MEMBERS[activeChat] ?? AI_MEMBERS['peter-thiel'];

  const mainContent = (
    <>
      {activeView === 'chat' && (
        <ChatView
          memberId={activeChat}
          memberName={activeMember.name}
          memberRole={activeMember.role}
          memberInitials={activeMember.initials}
          contextCollapsed={contextCollapsed}
          onToggleContext={() => setContextCollapsed((v) => !v)}
        />
      )}
      {activeView === 'inbox' && <InboxView />}
      {activeView === 'threads' && (
        <PlaceholderView
          label="///"
          title="Group Threads"
          description="Async conversation threads across the entire team — coming in the next release."
        />
      )}
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

  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* —— Desktop layout —— */}
      {/* Left sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          activeChat={activeChat}
          onViewChange={setActiveView}
          onChatSelect={setActiveChat}
        />
      </div>

      {/* Center + Right panels — desktop */}
      <div className="hidden min-w-0 flex-1 overflow-hidden md:flex">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{mainContent}</main>
        {activeView === 'chat' && (
          <ContextPanel
            memberName={activeMember.name}
            decisions={activeMember.decisions}
            tasks={activeMember.tasks}
            notes={activeMember.notes}
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
        />

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{mainContent}</main>

        {/* Bottom tab bar */}
        <MobileTabBar
          activeView={activeView}
          showBriefingStrip={activeView === 'chat'}
          briefingOpen={mobileContextOpen}
          onOpenBriefing={() => setMobileContextOpen(true)}
          onViewChange={(v) => {
            setActiveView(v);
            setMobileDrawerOpen(false);
            setMobileContextOpen(false);
          }}
        />
      </div>

      {/* Mobile drawer (team roster) */}
      <MobileDrawer
        open={mobileDrawerOpen}
        activeChat={activeChat}
        onClose={() => setMobileDrawerOpen(false)}
        onChatSelect={(id) => {
          setActiveChat(id);
          setActiveView('chat');
          setMobileContextOpen(false);
        }}
      />

      {/* Mobile briefing pull-tab + sheet — only in chat view */}
      {activeView === 'chat' && (
        <MobileContextFab
          open={mobileContextOpen}
          onToggle={() => setMobileContextOpen((v) => !v)}
          memberName={activeMember.name}
          decisions={activeMember.decisions}
          tasks={activeMember.tasks}
          notes={activeMember.notes}
        />
      )}
    </div>
  );
}
