'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextPanel } from '@/components/modryn/context-panel';

interface MobileContextFabProps {
  open: boolean;
  onToggle: () => void;
  memberName: string;
  memberRole: string;
  memberInitials: string;
  decisions: { text: string }[];
  tasks: { text: string; due?: string }[];
  notes: { text: string }[];
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
          'fixed right-4 bottom-20 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors md:hidden',
          open
            ? 'bg-sidebar-accent text-sidebar-foreground'
            : 'bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent'
        )}
        aria-label={open ? 'Close context panel' : 'Open context panel'}
      >
        {open ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
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
          'bg-context fixed right-0 bottom-0 left-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-lg transition-transform duration-250 ease-in-out md:hidden',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Context panel"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="bg-panel-faint h-1 w-8 rounded-full" />
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
  );
}
