'use client';

import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeLabelProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

export function ChromeLabel({ as: Component = 'span', children, className }: ChromeLabelProps) {
  return (
    <Component className={cn('font-mono text-[9px] tracking-[0.18em] uppercase', className)}>
      {children}
    </Component>
  );
}
