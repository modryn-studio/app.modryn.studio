"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Note {
  text: string
}

interface Task {
  text: string
  due?: string
}

interface Decision {
  text: string
}

interface ContextPanelProps {
  memberName: string
  memberRole: string
  memberInitials: string
  decisions?: Decision[]
  tasks?: Task[]
  notes?: Note[]
  collapsed?: boolean
  onToggle?: () => void
  /** When true, renders without the aside wrapper sizing (used inside mobile sheet) */
  mobileSheet?: boolean
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[var(--context-border)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-black/5 transition-colors"
      >
        <span className="text-[9px] font-mono tracking-[0.2em] text-[oklch(0.45_0_0)] uppercase">
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-3 h-3 text-[oklch(0.55_0_0)]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[oklch(0.55_0_0)]" />
        )}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

function BulletItem({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-[oklch(0.6_0_0)] flex-shrink-0" />
      <div>
        <p className="text-xs text-[oklch(0.25_0_0)] leading-relaxed">{text}</p>
        {sub && <p className="text-[10px] text-[oklch(0.5_0_0)] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function ContextPanel({
  memberName,
  memberRole,
  memberInitials,
  decisions = [],
  tasks = [],
  notes = [],
  collapsed = false,
  onToggle,
  mobileSheet = false,
}: ContextPanelProps) {
  const Wrapper = mobileSheet ? "div" : "aside"
  return (
    <Wrapper
      className={cn(
        "flex flex-col bg-[var(--context-bg)] transition-all duration-200",
        mobileSheet
          ? "h-full"
          : cn(
              "h-full border-l border-[var(--context-border)]",
              collapsed ? "w-0 overflow-hidden" : "w-64"
            )
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--context-border)]">
        <span className="text-[9px] font-mono tracking-[0.2em] text-[oklch(0.45_0_0)] uppercase">
          Context Panel
        </span>
        <button
          onClick={onToggle}
          className="p-0.5 text-[oklch(0.5_0_0)] hover:text-[oklch(0.3_0_0)] transition-colors"
          aria-label="Toggle context panel"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Member card */}
      <div className="px-5 py-4 border-b border-[var(--context-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-zinc-200 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-mono font-semibold text-zinc-700">{memberInitials}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-[oklch(0.15_0_0)] leading-tight">{memberName}</p>
            <p className="text-[10px] text-[oklch(0.5_0_0)] mt-0.5">{memberRole}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <Section title="Recent Decisions">
          {decisions.length === 0 ? (
            <p className="text-[10px] text-[oklch(0.6_0_0)] italic">No decisions recorded.</p>
          ) : (
            decisions.map((d, i) => <BulletItem key={i} text={d.text} />)
          )}
        </Section>

        <Section title="Active Tasks">
          {tasks.length === 0 ? (
            <p className="text-[10px] text-[oklch(0.6_0_0)] italic">No active tasks.</p>
          ) : (
            tasks.map((t, i) => <BulletItem key={i} text={t.text} sub={t.due} />)
          )}
        </Section>

        <Section title="Conversation Notes">
          {notes.length === 0 ? (
            <p className="text-[10px] text-[oklch(0.6_0_0)] italic">Notes will appear here.</p>
          ) : (
            notes.map((n, i) => <BulletItem key={i} text={n.text} />)
          )}
        </Section>
      </div>
    </Wrapper>
  )
}
