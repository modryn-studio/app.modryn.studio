"use client"

import { useState } from "react"
import { Sidebar, type View } from "@/components/modryn/sidebar"
import { ChatView } from "@/components/modryn/chat-view"
import { ContextPanel } from "@/components/modryn/context-panel"
import { InboxView } from "@/components/modryn/inbox-view"
import { PlaceholderView } from "@/components/modryn/placeholder-view"
import { MobileHeader } from "@/components/modryn/mobile-header"
import { MobileDrawer } from "@/components/modryn/mobile-drawer"
import { MobileTabBar } from "@/components/modryn/mobile-tab-bar"
import { MobileContextFab } from "@/components/modryn/mobile-context-fab"

const AI_MEMBERS: Record<
  string,
  {
    name: string
    role: string
    initials: string
    decisions: { text: string }[]
    tasks: { text: string; due?: string }[]
    notes: { text: string }[]
  }
> = {
  "peter-thiel": {
    name: "Peter Thiel",
    role: "AI Strategist",
    initials: "PT",
    decisions: [
      { text: "Focus on B2B enterprise segment first" },
      { text: "Avoid Series A until product-market fit is certain" },
      { text: "Do not compete on price â€” compete on indispensability" },
    ],
    tasks: [
      { text: "Refine the monopoly thesis", due: "Due today" },
      { text: "Review go-to-market assumptions", due: "Due Fri" },
    ],
    notes: [
      { text: "Discussed the difference between 0â†’1 and 1â†’N" },
      { text: "Challenged the assumption that competition validates the market" },
    ],
  },
}

export default function ModrynStudio() {
  const [activeView, setActiveView] = useState<View>("chat")
  const [activeChat, setActiveChat] = useState("peter-thiel")
  const [contextCollapsed, setContextCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileContextOpen, setMobileContextOpen] = useState(false)

  const activeMember = AI_MEMBERS[activeChat] ?? AI_MEMBERS["peter-thiel"]

  const mainContent = (
    <>
      {activeView === "chat" && (
        <ChatView
          memberId={activeChat}
          memberName={activeMember.name}
          memberRole={activeMember.role}
          memberInitials={activeMember.initials}
        />
      )}
      {activeView === "inbox" && <InboxView />}
      {activeView === "threads" && (
        <PlaceholderView
          label="///"
          title="Group Threads"
          description="Async conversation threads across the entire team â€” coming in the next release."
        />
      )}
      {activeView === "tasks" && (
        <PlaceholderView
          label="[ ]"
          title="Task Board"
          description="Shared task management with AI assignment and tracking â€” coming in the next release."
        />
      )}
      {activeView === "calendar" && (
        <PlaceholderView
          label="##"
          title="Team Calendar"
          description="Scheduling, milestones, and AI-coordinated meeting prep â€” coming in the next release."
        />
      )}
    </>
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* â”€â”€ Desktop layout â”€â”€ */}
      {/* Left sidebar â€” hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar
          activeView={activeView}
          activeChat={activeChat}
          onViewChange={setActiveView}
          onChatSelect={setActiveChat}
        />
      </div>

      {/* Center + Right panels â€” desktop */}
      <div className="hidden md:flex flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {mainContent}
        </main>
        {activeView === "chat" && (
          <ContextPanel
            memberName={activeMember.name}
            memberRole={activeMember.role}
            memberInitials={activeMember.initials}
            decisions={activeMember.decisions}
            tasks={activeMember.tasks}
            notes={activeMember.notes}
            collapsed={contextCollapsed}
            onToggle={() => setContextCollapsed((v) => !v)}
          />
        )}
      </div>

      {/* â”€â”€ Mobile layout â”€â”€ */}
      <div className="flex md:hidden flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header bar */}
        <MobileHeader
          drawerOpen={mobileDrawerOpen}
          onToggleDrawer={() => setMobileDrawerOpen((v) => !v)}
          activeViewLabel={activeView}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {mainContent}
        </main>

        {/* Bottom tab bar */}
        <MobileTabBar
          activeView={activeView}
          onViewChange={(v) => { setActiveView(v); setMobileDrawerOpen(false) }}
        />
      </div>

      {/* Mobile drawer (team roster) */}
      <MobileDrawer
        open={mobileDrawerOpen}
        activeChat={activeChat}
        onClose={() => setMobileDrawerOpen(false)}
        onChatSelect={(id) => { setActiveChat(id); setActiveView("chat") }}
      />

      {/* Mobile context FAB + sheet â€” only in chat view */}
      {activeView === "chat" && (
        <MobileContextFab
          open={mobileContextOpen}
          onToggle={() => setMobileContextOpen((v) => !v)}
          memberName={activeMember.name}
          memberRole={activeMember.role}
          memberInitials={activeMember.initials}
          decisions={activeMember.decisions}
          tasks={activeMember.tasks}
          notes={activeMember.notes}
        />
      )}
    </div>
  )
}
