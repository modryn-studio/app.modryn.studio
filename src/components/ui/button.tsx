import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

// Token contract — define these in your project's globals.css @theme:
//   --color-accent             primary action color (bg-accent)
//   --color-accent-foreground  text on accent bg (text-accent-foreground)
//   --color-card               elevated/card background (bg-card)
//   --color-foreground         body text (text-foreground)
//   --color-muted-foreground   secondary/dimmed text (text-muted-foreground)
//   --color-border             default border color (border-border)
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50',
  secondary:
    'border-border bg-card text-foreground border hover:border-accent hover:text-accent disabled:opacity-50',
  ghost: 'text-muted-foreground hover:text-foreground disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors focus-visible:ring-accent/30 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
