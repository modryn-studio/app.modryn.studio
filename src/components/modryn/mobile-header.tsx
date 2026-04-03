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
        className="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-bold tracking-tight text-zinc-300 select-none">
          M
        </span>
        <span className="font-mono text-[11px] tracking-[0.22em] text-zinc-400 uppercase">
          Modryn Studio
        </span>
      </div>

      {/* Right avatar — founder */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-600">
        <span className="font-mono text-[10px] font-bold text-zinc-200">F</span>
      </div>
    </header>
  );
}
