'use client';

import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ActionSheetItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
}

/**
 * Mobile-only bottom slide-up action sheet.
 * Hidden at md+ breakpoint — use for touch contexts only.
 * Renders a fixed overlay; DOM placement doesn't affect visual layout.
 */
export function ActionSheet({ open, onClose, items }: ActionSheetProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="bg-sidebar border-sidebar-border absolute inset-x-0 bottom-0 rounded-t-sm border-t"
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={cn(
              'border-sidebar-border hover:bg-sidebar-accent',
              'flex h-13 w-full items-center gap-3 border-b px-5 text-sm transition-colors last:border-b-0',
              item.destructive ? 'text-red-400' : 'text-sidebar-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
