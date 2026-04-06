'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { useProfile } from '@/lib/use-profile';

interface ActiveMember {
  name: string;
  initials: string;
  role: string;
  avatarUrl?: string;
}

interface MobileHeaderProps {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  activeMember?: ActiveMember;
}

export function MobileHeader({ drawerOpen, onToggleDrawer, activeMember }: MobileHeaderProps) {
  const { profile } = useProfile();

  return (
    <header className="bg-sidebar border-sidebar-border flex shrink-0 items-center justify-between border-b px-4 py-3 md:hidden">
      <button
        onClick={onToggleDrawer}
        className="text-sidebar-muted hover:text-sidebar-foreground flex h-9 w-9 items-center justify-center rounded-sm transition-colors"
        aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {activeMember ? (
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <span className="text-sidebar-foreground truncate text-sm font-semibold">
            {activeMember.name}
          </span>
          {activeMember.role && (
            <span className="text-sidebar-muted truncate text-[11px]">{activeMember.role}</span>
          )}
        </div>
      ) : (
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
      )}

      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-sm">
        {activeMember ? (
          activeMember.avatarUrl ? (
            <Image
              src={activeMember.avatarUrl}
              alt={activeMember.name}
              width={32}
              height={32}
              unoptimized
              className="h-8 w-8 rounded-sm object-cover"
            />
          ) : (
            <div className="bg-sidebar-accent flex h-8 w-8 items-center justify-center rounded-sm">
              <span className="text-sidebar-foreground font-mono text-[10px] font-bold">
                {activeMember.initials}
              </span>
            </div>
          )
        ) : profile.avatarDataUrl ? (
          <Image
            src={profile.avatarDataUrl}
            alt={profile.name}
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 object-cover"
          />
        ) : (
          <div className="bg-sidebar-accent flex h-8 w-8 items-center justify-center rounded-sm">
            <span className="text-sidebar-foreground font-mono text-[10px] font-bold">
              {profile.initials}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
