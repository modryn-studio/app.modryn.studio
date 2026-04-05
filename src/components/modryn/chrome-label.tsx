'use client';

import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChromeLabelProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function ChromeLabel({ as: Component = 'span', children, className, ...rest }: ChromeLabelProps) {
  return (
    <Component className={cn('font-mono text-[9px] tracking-[0.18em] uppercase', className)} {...rest}>
      {children}
    </Component>
  );
}
