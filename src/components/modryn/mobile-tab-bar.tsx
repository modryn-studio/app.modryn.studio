"use client"

import { MessageSquare, GitBranch, Inbox, CheckSquare, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { View } from "@/components/modryn/sidebar"

const tabs: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "DMs", icon: MessageSquare },
  { id: "threads", label: "Threads", icon: GitBranch },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
]

interface MobileTabBarProps {
  activeView: View
  onViewChange: (view: View) => void
}

export function MobileTabBar({ activeView, onViewChange }: MobileTabBarProps) {
  return (
    <nav
      className="flex items-stretch bg-sidebar border-t border-sidebar-border md:hidden flex-shrink-0"
      aria-label="Main navigation"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeView === id
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors",
              active ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-400"
            )}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-5 h-5" />
            <span
              className={cn(
                "text-[9px] font-mono uppercase tracking-widest",
                active ? "text-zinc-100" : "text-zinc-600"
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
