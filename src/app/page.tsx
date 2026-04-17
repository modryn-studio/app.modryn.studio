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
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Hide the mobile tab bar when the on-screen keyboard is open so it doesn't
  // sit between the keyboard and the input area. Guard to mobile only — skip on
  // tablet/desktop (md breakpoint and above) where the tab bar is already hidden.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    if (window.innerWidth >= 768) return;
    const vp = window.visualViewport;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vp.height - vp.offsetTop);
      setKeyboardOpen(offset > 120);
    };
    update();
    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);
    return () => {
      vp.removeEventListener('resize', update);
      vp.removeEventListener('scroll', update);
    };
  }, []);

  const { members, refetch } = useMembers();
  const { profile, profileLoaded } = useProfile();

  // Incremented whenever a decision is logged anywhere in the app, triggering a briefing re-fetch.
  const [decisionsVersion, setDecisionsVersion] = useState(0);
  useEffect(() => {
    const handler = () => setDecisionsVersion((v) => v + 1);
    window.addEventListener('modryn:decision-logged', handler);
    return () => window.removeEventListener('modryn:decision-logged', handler);
  }, []);

  // Briefing data — re-fetched when the active member, project, or decisionsVersion changes.
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
    const controller = new AbortController();
    const { signal } = controller;
    const taskParams = new URLSearchParams({ assignedTo: activeMemberId });
    if (activeProjectId) taskParams.set('projectId', activeProjectId);
    const decisionParams = activeProjectId
      ? `?projectId=${encodeURIComponent(activeProjectId)}`
      : '';
    Promise.all([
      fetch(`/api/tasks?${taskParams}`, { signal }).then((r) => r.json()),
      fetch(`/api/decisions${decisionParams}`, { signal }).then((r) => r.json()),
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
    return () => controller.abort();
  }, [activeChat, activeProjectId, members, decisionsVersion]);

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

  const handleProjectDeleted = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const fallback = next[0]?.id ?? null;

      setActiveProjectId((current) => {
        const currentStillExists = current ? next.some((p) => p.id === current) : false;
        const resolved = current === id || !currentStillExists ? fallback : current;

        if (resolved) {
          localStorage.setItem('modryn_active_project', resolved);
        } else {
          localStorage.removeItem('modryn_active_project');
        }

        return resolved;
      });

      setShowNewProject(false);
      return next;
    });
  }, []);

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
      {activeView === 'reddit' && <RedditView projectId={activeProjectId ?? ''} />}
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
          onProjectDeleted={handleProjectDeleted}
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
          keyboardOpen={keyboardOpen}
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
        onProjectDeleted={handleProjectDeleted}
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
