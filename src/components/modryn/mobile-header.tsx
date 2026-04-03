"use client"

import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileHeaderProps {
  drawerOpen: boolean
  onToggleDrawer: () => void
  activeViewLabel: string
}

export function MobileHeader({ drawerOpen, onToggleDrawer, activeViewLabel }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border flex-shrink-0 md:hidden">
      <button
        onClick={onToggleDrawer}
        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        aria-label={drawerOpen ? "Close menu" : "Open menu"}
      >
        {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-bold text-zinc-300 tracking-tight select-none">M</span>
        <span className="text-[11px] font-mono tracking-[0.22em] text-zinc-400 uppercase">
          Modryn Studio
        </span>
      </div>

      {/* Right avatar — founder */}
      <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-mono font-bold text-zinc-200">F</span>
      </div>
    </header>
  )
}
