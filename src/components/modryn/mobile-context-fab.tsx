'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ContextPanel } from '@/components/modryn/context-panel';

interface MobileContextFabProps {
  open: boolean;
  onToggle: () => void;
  memberName: string;
  decisions: { text: string }[];
  tasks: { text: string; due?: string }[];
  notes: { text: string }[];
}

export function MobileContextFab({
  open,
  onToggle,
  memberName,
  decisions,
  tasks,
  notes,
}: MobileContextFabProps) {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleSwipeCloseStart = (event: React.TouchEvent) => {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleSwipeCloseEnd = (event: React.TouchEvent) => {
    if (touchStartY === null) return;
    const delta = (event.changedTouches[0]?.clientY ?? touchStartY) - touchStartY;
    setTouchStartY(null);
    if (delta > 24 && open) onToggle();
  };

  return (
    <>
      {/* Slide-up context sheet */}
      {open && (
        <div
          className="bg-background/60 fixed inset-0 z-40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'bg-context border-context-border fixed right-0 bottom-0 left-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-sm border-t transition-transform duration-250 ease-in-out md:hidden',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Briefing"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1"
          onTouchStart={handleSwipeCloseStart}
          onTouchEnd={handleSwipeCloseEnd}
        >
          <div className="bg-panel-faint h-1 w-8 rounded-sm" />
        </div>
        {/* Reuse the existing context panel content (without the aside wrapper's width/border logic) */}
        <ContextPanel
          memberName={memberName}
          decisions={decisions}
          tasks={tasks}
          notes={notes}
          collapsed={false}
          mobileSheet
        />
      </div>
    </>
  );
}
