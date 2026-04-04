'use client';

import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  activeViewLabel: string;
}

export function MobileHeader({ drawerOpen, onToggleDrawer, activeViewLabel }: MobileHeaderProps) {
  return (
    <header className="bg-sidebar border-sidebar-border flex flex-shrink-0 items-center justify-between border-b px-4 py-3 md:hidden">
      <button
        onClick={onToggleDrawer}
        className="text-sidebar-muted hover:text-sidebar-foreground flex h-8 w-8 items-center justify-center transition-colors"
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sidebar-foreground font-mono text-[11px] font-bold tracking-tight select-none">
          M
        </span>
        <span className="text-sidebar-muted font-mono text-[11px] tracking-[0.22em] uppercase">
          Modryn Studio
        </span>
      </div>

      {/* Right avatar — founder */}
      <div className="bg-sidebar-accent flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
        <span className="text-sidebar-foreground font-mono text-[10px] font-bold">F</span>
      </div>
    </header>
  );
}
