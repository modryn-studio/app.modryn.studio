'use client';

import { useState } from 'react';
import { MessageSquare, Inbox, MessagesSquare, CheckSquare, Calendar, Globe } from 'lucide-react';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { cn } from '@/lib/utils';
import type { View } from '@/components/modryn/sidebar';

const tabs: { id: View; label: string; icon: React.ElementType; built: boolean }[] = [
  { id: 'chat', label: 'DMs', icon: MessageSquare, built: true },
  { id: 'inbox', label: 'Inbox', icon: Inbox, built: true },
  { id: 'threads', label: 'Threads', icon: MessagesSquare, built: true },
  { id: 'reddit', label: 'Reddit', icon: Globe, built: true },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, built: false },
  { id: 'calendar', label: 'Cal', icon: Calendar, built: false },
];

interface MobileTabBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  showBriefingStrip?: boolean;
  briefingOpen?: boolean;
  onOpenBriefing?: () => void;
}

export function MobileTabBar({
  activeView,
  onViewChange,
  showBriefingStrip = false,
  briefingOpen = false,
  onOpenBriefing,
}: MobileTabBarProps) {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleSwipeStart = (event: React.TouchEvent) => {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleSwipeEnd = (event: React.TouchEvent) => {
    if (touchStartY === null) return;
    const delta = touchStartY - (event.changedTouches[0]?.clientY ?? touchStartY);
    setTouchStartY(null);
    if (delta > 24 && !briefingOpen) onOpenBriefing?.();
  };

  return (
    <div className="bg-sidebar border-sidebar-border shrink-0 border-t md:hidden">
      {showBriefingStrip && !briefingOpen && (
        <button
          onClick={onOpenBriefing}
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
          className="border-sidebar-border hover:bg-sidebar-accent/35 flex h-8 w-full flex-col items-center justify-center border-b transition-colors"
          aria-label="Open briefing"
        >
          <span className="bg-sidebar-ring/80 mb-1 h-0.5 w-10 rounded-sm" />
          <ChromeLabel className="text-sidebar-muted text-[8px] tracking-[0.12em]">
            Briefing
          </ChromeLabel>
        </button>
      )}

      <nav className="flex items-stretch" aria-label="Main navigation">
        {tabs.map(({ id, label, icon: Icon, built }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors',
                active ? 'text-sidebar-primary' : 'text-sidebar-ring hover:text-sidebar-muted',
                !built && !active && 'opacity-40'
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span
                className={cn(
                  'font-mono text-[9px] tracking-widest uppercase',
                  active ? 'text-sidebar-primary' : 'text-sidebar-ring'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
