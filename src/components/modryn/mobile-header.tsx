'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { useProfile } from '@/lib/use-profile';

interface MobileHeaderProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

export function MobileHeader({ drawerOpen, onToggleDrawer }: MobileHeaderProps) {
  const { profile } = useProfile();

  return (
    <header className="bg-sidebar border-sidebar-border flex shrink-0 items-center justify-between border-b px-4 py-3 md:hidden">
      <button
        onClick={onToggleDrawer}
        className="text-sidebar-muted hover:text-sidebar-foreground flex h-11 w-11 items-center justify-center rounded-sm transition-colors"
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="flex items-center gap-2">
        <Image
          src="/brand/logomark.png"
          alt="Modryn Studio"
          width={20}
          height={20}
          className="h-5 w-5 shrink-0 object-contain opacity-85"
        />
        <ChromeLabel className="text-sidebar-muted text-[12px] tracking-[0.08em]">
          Modryn Studio
        </ChromeLabel>
      </div>

      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-sm">
        {profile.avatarDataUrl ? (
          <Image
            src={profile.avatarDataUrl}
            alt={profile.name}
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 object-cover"
          />
        ) : (
          <div className="bg-sidebar-accent flex h-9 w-9 items-center justify-center rounded-sm">
            <span className="text-sidebar-foreground font-mono text-[10px] font-bold">
              {profile.initials}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
