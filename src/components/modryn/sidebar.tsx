"use client"

import { MessageSquare, GitBranch, Inbox, CheckSquare, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export type View = "chat" | "inbox" | "threads" | "tasks" | "calendar"

interface Member {
  id: string
  name: string
  role: string
  status: "online" | "analyzing" | "away"
  isAI: boolean
  initials: string
}

const TEAM_MEMBERS: Member[] = [
  {
    id: "founder",
    name: "Founder",
    role: "CEO",
    status: "online",
    isAI: false,
    initials: "F",
  },
]

const AI_MEMBERS: Member[] = [
  {
    id: "peter-thiel",
    name: "Peter Thiel",
    role: "AI Strategist",
    status: "online",
    isAI: true,
    initials: "PT",
  },
  // Placeholder slots for future AI members
]

const FUTURE_AI: { name: string; role: string }[] = [
  { name: "AI Member 2", role: "Coming soon" },
  { name: "AI Member 3", role: "Coming soon" },
]

interface SidebarProps {
  activeView: View
  activeChat: string
  onViewChange: (view: View) => void
  onChatSelect: (memberId: string) => void
}

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  analyzing: "bg-[var(--status-active)]",
  away: "bg-zinc-500",
}

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "DMs", icon: MessageSquare },
  { id: "threads", label: "Threads", icon: GitBranch },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
]

function MemberAvatar({ member }: { member: Member }) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={cn(
          "w-8 h-8 rounded-sm flex items-center justify-center text-xs font-mono font-semibold",
          member.isAI
            ? "bg-zinc-700 text-zinc-200"
            : "bg-zinc-600 text-zinc-100"
        )}
      >
        {member.initials}
      </div>
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--sidebar)]",
          statusColors[member.status]
        )}
      />
    </div>
  )
}

export function Sidebar({ activeView, activeChat, onViewChange, onChatSelect }: SidebarProps) {
  return (
    <aside className="flex h-full bg-[var(--sidebar)]">
      {/* Icon rail */}
      <nav className="flex flex-col items-center pt-4 pb-4 gap-1 w-14 border-r border-[var(--sidebar-border)]">
        {/* Logo mark */}
        <div className="mb-4 w-8 h-8 flex items-center justify-center">
          <span className="font-mono text-sm font-bold text-zinc-200 tracking-tight select-none">M</span>
        </div>

        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 w-full py-2 px-1 rounded-sm transition-colors",
              activeView === id
                ? "text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-mono uppercase tracking-widest">{label}</span>
          </button>
        ))}
      </nav>

      {/* Team roster */}
      <div className="flex flex-col w-48 pt-4 overflow-y-auto">
        {/* Wordmark */}
        <div className="px-4 mb-5">
          <span className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">
            Modryn Studio
          </span>
        </div>

        {/* Team section */}
        <div className="px-3 mb-4">
          <p className="text-[9px] font-mono tracking-[0.18em] text-zinc-600 uppercase mb-2 px-1">
            Team
          </p>
          {TEAM_MEMBERS.map((member) => (
            <button
              key={member.id}
              onClick={() => { onViewChange("chat"); onChatSelect(member.id) }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm transition-colors text-left",
                activeChat === member.id && activeView === "chat"
                  ? "bg-[var(--sidebar-accent)]"
                  : "hover:bg-[var(--sidebar-accent)]/50"
              )}
            >
              <MemberAvatar member={member} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{member.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">{member.role}</p>
              </div>
            </button>
          ))}
        </div>

        {/* AI Members section */}
        <div className="px-3 flex-1">
          <p className="text-[9px] font-mono tracking-[0.18em] text-zinc-600 uppercase mb-2 px-1">
            AI Members
          </p>
          {AI_MEMBERS.map((member) => (
            <button
              key={member.id}
              onClick={() => { onViewChange("chat"); onChatSelect(member.id) }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm transition-colors text-left",
                activeChat === member.id && activeView === "chat"
                  ? "bg-[var(--sidebar-accent)]"
                  : "hover:bg-[var(--sidebar-accent)]/50"
              )}
            >
              <MemberAvatar member={member} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-zinc-200 truncate">{member.name}</p>
                  <span className="text-[8px] font-mono bg-zinc-700 text-zinc-400 px-1 py-0.5 rounded-sm">AI</span>
                </div>
                <p className="text-[10px] text-zinc-500 truncate">{member.role}</p>
              </div>
            </button>
          ))}

          {/* Future slots */}
          {FUTURE_AI.map((item, i) => (
            <div
              key={i}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm opacity-30 cursor-default select-none"
            >
              <div className="w-8 h-8 rounded-sm border border-dashed border-zinc-700 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-zinc-600">+</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 truncate">{item.name}</p>
                <p className="text-[10px] text-zinc-600 truncate">{item.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--sidebar-border)] mt-auto">
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">v0.1 — prototype</p>
        </div>
      </div>
    </aside>
  )
}
