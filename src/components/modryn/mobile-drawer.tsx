"use client"

import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  role: string
  status: "online" | "analyzing" | "away"
  isAI: boolean
  initials: string
}

const TEAM_MEMBERS: Member[] = [
  { id: "founder", name: "Founder", role: "CEO", status: "online", isAI: false, initials: "F" },
]

const AI_MEMBERS: Member[] = [
  { id: "peter-thiel", name: "Peter Thiel", role: "AI Strategist", status: "online", isAI: true, initials: "PT" },
]

const FUTURE_AI: { name: string; role: string }[] = [
  { name: "AI Member 2", role: "Coming soon" },
  { name: "AI Member 3", role: "Coming soon" },
]

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  analyzing: "bg-status-active",
  away: "bg-zinc-500",
}

interface MobileDrawerProps {
  open: boolean
  activeChat: string
  onClose: () => void
  onChatSelect: (id: string) => void
}

function MemberRow({ member, active, onClick }: { member: Member; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
        active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "w-9 h-9 rounded-sm flex items-center justify-center text-xs font-mono font-semibold",
            member.isAI ? "bg-zinc-700 text-zinc-200" : "bg-zinc-600 text-zinc-100"
          )}
        >
          {member.initials}
        </div>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar",
            statusColors[member.status]
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-200 truncate">{member.name}</p>
          {member.isAI && (
            <span className="text-[8px] font-mono bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-sm flex-shrink-0">
              AI
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">{member.role}</p>
      </div>
    </button>
  )
}

export function MobileDrawer({ open, activeChat, onClose, onChatSelect }: MobileDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-72 bg-sidebar flex flex-col md:hidden transition-transform duration-250 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Team roster"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-sidebar-border">
          <span className="font-mono text-sm font-bold text-zinc-300 tracking-tight">M</span>
          <span className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase">Modryn Studio</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Team */}
          <p className="text-[9px] font-mono tracking-[0.18em] text-zinc-600 uppercase px-5 pt-3 pb-2">
            Team
          </p>
          {TEAM_MEMBERS.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              active={activeChat === m.id}
              onClick={() => { onChatSelect(m.id); onClose() }}
            />
          ))}

          {/* AI Members */}
          <p className="text-[9px] font-mono tracking-[0.18em] text-zinc-600 uppercase px-5 pt-4 pb-2">
            AI Members
          </p>
          {AI_MEMBERS.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              active={activeChat === m.id}
              onClick={() => { onChatSelect(m.id); onClose() }}
            />
          ))}

          {/* Future slots */}
          {FUTURE_AI.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 opacity-30 cursor-default select-none"
            >
              <div className="w-9 h-9 rounded-sm border border-dashed border-zinc-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-zinc-600">+</span>
              </div>
              <div>
                <p className="text-sm text-zinc-500 truncate">{item.name}</p>
                <p className="text-xs text-zinc-600 truncate">{item.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-sidebar-border">
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">v0.1 — prototype</p>
        </div>
      </div>
    </>
  )
}
