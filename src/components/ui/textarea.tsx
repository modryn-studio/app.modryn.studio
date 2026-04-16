import * as React from 'react'

import { cn } from '@/lib/utils'

interface TextareaProps extends React.ComponentProps<'textarea'> {
  // Maximum height in pixels before the textarea scrolls internally.
  // Defaults to 240px (~10 lines at text-sm leading-relaxed).
  maxHeight?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxHeight = 240, onInput, style, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          'text-panel-foreground placeholder:text-panel-faint flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed outline-none disabled:opacity-50',
          className,
        )}
        style={{ height: 'auto', ...style }}
        onInput={(e) => {
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
          onInput?.(e)
        }}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
