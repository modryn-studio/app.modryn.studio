'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar, type View } from '@/components/modryn/sidebar';
import { ChatView } from '@/components/modryn/chat-view';
import { ContextPanel } from '@/components/modryn/context-panel';
import { InboxView } from '@/components/modryn/inbox-view';
import { ThreadsView } from '@/components/modryn/threads-view';
import { PlaceholderView } from '@/components/modryn/placeholder-view';
import { TaskBoard } from '@/components/modryn/task-board';
import { RedditView } from '@/components/modryn/reddit-view';
import { SetupView } from '@/components/modryn/setup-view';
import { ProjectSetupView } from '@/components/modryn/project-setup-view';
import { MobileHeader } from '@/components/modryn/mobile-header';
import { MobileDrawer } from '@/components/modryn/mobile-drawer';
import { MobileTabBar } from '@/components/modryn/mobile-tab-bar';
import { MobileContextFab } from '@/components/modryn/mobile-context-fab';
import { useMembers } from '@/hooks/use-members';
import { useProfile } from '@/lib/use-profile';

interface Project {
  id: string;
  name: string;
  context: string | null;
  created_at: string;
  updated_at: string;
}

export default function ModrynStudio() {
  // Start with server-safe defaults — avoids hydration mismatch.
  // Apply persisted values after mount so server and client HTML agree.
  const [activeView, setActiveView] = useState<View>('chat');
  const [activeChat, setActiveChat] = useState<string>('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);

  // Boot sequence: fetch projects, resolve active project from localStorage
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      const list: Project[] = data.projects ?? [];
      setProjects(list);

      if (list.length === 0) {
        setActiveProjectId(null);
        setProjectsLoaded(true);
        return;
      }

      const stored = localStorage.getItem('modryn_active_project');
      const valid = list.find((p) => p.id === stored);
      const resolved = valid ? valid.id : list[0].id;
      setActiveProjectId(resolved);
      localStorage.setItem('modryn_active_project', resolved);
      setProjectsLoaded(true);
    } catch {
      setProjectsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const view = localStorage.getItem('modryn:activeView') as View | null;
    const chat = localStorage.getItem('modryn:activeChat');
    if (view) setActiveView(view);
    if (chat) setActiveChat(chat);
    fetchProjects();
  }, [fetchProjects]);
  const [contextCollapsed, setContextCollapsed] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const { members, refetch } = useMembers();
  const { profile, profileLoaded } = useProfile();

  // Briefing data — re-fetched when the active member or project changes.
  // Tasks are filtered to the member's assignments within the project; decisions are project-scoped.
  const [contextTasks, setContextTasks] = useState<{ text: string; due?: string }[]>([]);
  const [contextDecisions, setContextDecisions] = useState<{ text: string }[]>([]);
  useEffect(() => {
    // Derive the active member ID here — activeMember is declared below this hook.
    const activeMemberId =
      members.find((m) => m.id === activeChat)?.id ??
      (activeChat === '' ? members[0]?.id : undefined) ??
      members[0]?.id;
    if (!activeMemberId) return;
    const taskParams = new URLSearchParams({ assignedTo: activeMemberId });
    if (activeProjectId) taskParams.set('projectId', activeProjectId);
    const decisionParams = activeProjectId
      ? `?projectId=${encodeURIComponent(activeProjectId)}`
      : '';
    Promise.all([
      fetch(`/api/tasks?${taskParams}`).then((r) => r.json()),
      fetch(`/api/decisions${decisionParams}`).then((r) => r.json()),
    ])
      .then(([tasksData, decisionsData]) => {
        const taskRows: { title: string; due_at?: string | null; status?: string }[] =
          tasksData.tasks ?? [];
        setContextTasks(
          taskRows
            .filter((t) => t.status !== 'done')
            .map((t) => ({ text: t.title, due: t.due_at ?? undefined }))
        );
        const decisionRows: { title: string }[] = decisionsData.decisions ?? [];
        setContextDecisions(decisionRows.map((d) => ({ text: d.title })));
      })
      .catch(() => {});
  }, [activeChat, activeProjectId, members]);

  const handleViewChange = (view: View) => {
    setActiveView(view);
    localStorage.setItem('modryn:activeView', view);
  };

  const handleChatSelect = (memberId: string) => {
    setActiveChat(memberId);
    localStorage.setItem('modryn:activeChat', memberId);
  };

  const handleProjectChange = (projectId: string) => {
    setActiveProjectId(projectId);
    setShowNewProject(false);
    localStorage.setItem('modryn_active_project', projectId);
  };

  const handleProjectCreated = (projectId: string) => {
    handleProjectChange(projectId);
    setShowNewProject(false);
    fetchProjects();
  };

  const handleProjectNameChanged = (id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  // activeMember falls back to first member only when nothing is stored yet.
  // 'founder' is not in the members table — treat it the same as empty (no prior selection).
  const activeMember =
    members.find((m) => m.id === activeChat) ??
    (activeChat === '' || activeChat === 'founder' ? members[0] : undefined) ??
    members[0];

  const mainContent = activeProjectId ? (
    <>
      {activeView === 'chat' && activeMember && (
        <ChatView
          key={`${activeMember.id}-${activeProjectId}`}
          memberId={activeMember.id}
          memberName={activeMember.name}
          memberRole={activeMember.role}
          memberInitials={activeMember.initials}
          memberAvatarUrl={activeMember.avatarUrl}
          projectId={activeProjectId}
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
      {activeView === 'threads' && (
        <ThreadsView key={activeProjectId} projectId={activeProjectId} />
      )}
      {activeView === 'tasks' && <TaskBoard key={activeProjectId} projectId={activeProjectId} />}
      {activeView === 'calendar' && (
        <PlaceholderView
          label="##"
          title="Team Calendar"
          description="Scheduling, milestones, and AI-coordinated meeting prep — coming in the next release."
        />
      )}
      {activeView === 'reddit' && <RedditView />}
    </>
  ) : null;

  const centreContent = !profileLoaded ? (
    // Waiting for /api/profile — show blank panel to avoid false setup screen on new device
    <div className="bg-panel flex flex-1 flex-col" />
  ) : profile.name === '' ? (
    <SetupView />
  ) : showNewProject ? (
    <ProjectSetupView onCreated={handleProjectCreated} />
  ) : projectsLoaded && !activeProjectId ? (
    <ProjectSetupView onCreated={handleProjectCreated} />
  ) : (
    mainContent
  );

  return (
    <div className="bg-background flex h-dvh w-dvw overflow-hidden">
      {/* —— Desktop layout —— */}
      {/* Left sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          activeChat={activeChat}
          members={members}
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectChange={handleProjectChange}
          onNewProject={() => setShowNewProject(true)}
          onProjectNameChanged={handleProjectNameChanged}
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
            decisions={contextDecisions}
            tasks={contextTasks}
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
            activeView === 'chat' && activeMember && !showNewProject
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
        projects={projects}
        activeProjectId={activeProjectId}
        onProjectChange={handleProjectChange}
        onNewProject={() => {
          setShowNewProject(true);
          setMobileDrawerOpen(false);
        }}
        onProjectNameChanged={handleProjectNameChanged}
        onClose={() => setMobileDrawerOpen(false)}
        onChatSelect={(id) => {
          handleChatSelect(id);
          handleViewChange('chat');
          setMobileContextOpen(false);
        }}
      />

      {/* Mobile briefing pull-tab + sheet — only in chat view, not during project creation */}
      {activeView === 'chat' && activeMember && !showNewProject && (
        <MobileContextFab
          open={mobileContextOpen}
          onToggle={() => setMobileContextOpen((v) => !v)}
          memberName={activeMember.name}
          decisions={contextDecisions}
          tasks={contextTasks}
          notes={[]}
        />
      )}
    </div>
  );
}
