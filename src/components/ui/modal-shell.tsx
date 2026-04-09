'use client';

import { cn } from '@/lib/cn';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Shared input field style for all sheets — underline variant on dark sidebar chrome.
export const SHEET_FIELD_CLASS =
  'w-full bg-transparent text-sidebar-foreground placeholder:text-sidebar-muted border-b border-sidebar-ring outline-none caret-sidebar-primary text-[13px] pb-1 focus:border-sidebar-primary transition-colors';

interface ModalShellProps {
  title: string;
  /** Tailwind width class — default w-96 */
  width?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard shell for all sidebar sheets — consistent header, bg, and border.
 * Renders SheetContent + SheetHeader + SheetTitle. Children fill the body.
 * Always use this instead of SheetContent directly.
 */
export function ModalShell({ title, width = 'w-96', children, className }: ModalShellProps) {
  return (
    <SheetContent
      side="right"
      className={cn('border-sidebar-border bg-sidebar border-l p-0', width, className)}
    >
      <SheetHeader className="border-sidebar-border border-b px-6 py-5">
        <SheetTitle className="text-sidebar-muted text-[13px] font-medium tracking-widest uppercase">
          {title}
        </SheetTitle>
      </SheetHeader>
      {children}
    </SheetContent>
  );
}
