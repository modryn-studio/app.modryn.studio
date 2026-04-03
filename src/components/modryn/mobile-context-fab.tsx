"use client"

import { SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContextPanel } from "@/components/modryn/context-panel"

interface MobileContextFabProps {
  open: boolean
  onToggle: () => void
  memberName: string
  memberRole: string
  memberInitials: string
  decisions: { text: string }[]
  tasks: { text: string; due?: string }[]
  notes: { text: string }[]
}

export function MobileContextFab({
  open,
  onToggle,
  memberName,
  memberRole,
  memberInitials,
  decisions,
  tasks,
  notes,
}: MobileContextFabProps) {
  return (
    <>
      {/* FAB */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors md:hidden",
          open
            ? "bg-zinc-700 text-zinc-200"
            : "bg-[oklch(0.28_0_0)] text-zinc-300 hover:bg-[oklch(0.32_0_0)]"
        )}
        aria-label={open ? "Close context panel" : "Open context panel"}
      >
        {open ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
      </button>

      {/* Slide-up context sheet */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-lg bg-[var(--context-bg)] md:hidden transition-transform duration-250 ease-in-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Context panel"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-[oklch(0.75_0_0)]" />
        </div>
        {/* Reuse the existing context panel content (without the aside wrapper's width/border logic) */}
        <ContextPanel
          memberName={memberName}
          memberRole={memberRole}
          memberInitials={memberInitials}
          decisions={decisions}
          tasks={tasks}
          notes={notes}
          collapsed={false}
          onToggle={onToggle}
          mobileSheet
        />
      </div>
    </>
  )
}
