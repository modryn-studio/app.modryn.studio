'use client';

import { MessageSquare, GitBranch, Inbox, CheckSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { View } from '@/components/modryn/sidebar';

const tabs: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'DMs', icon: MessageSquare },
  { id: 'threads', label: 'Threads', icon: GitBranch },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

interface MobileTabBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function MobileTabBar({ activeView, onViewChange }: MobileTabBarProps) {
  return (
    <nav
      className="bg-sidebar border-sidebar-border flex flex-shrink-0 items-stretch border-t md:hidden"
      aria-label="Main navigation"
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors',
              active ? 'text-sidebar-primary' : 'text-sidebar-ring hover:text-sidebar-muted'
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
  );
}
