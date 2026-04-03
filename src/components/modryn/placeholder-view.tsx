interface PlaceholderViewProps {
  title: string
  description: string
  label: string
}

export function PlaceholderView({ title, description, label }: PlaceholderViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--panel-bg)] p-8">
      <div className="w-14 h-14 rounded-sm border border-dashed border-[var(--panel-border)] flex items-center justify-center">
        <span className="text-xs font-mono text-[oklch(0.65_0_0)]">{label}</span>
      </div>
      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-[oklch(0.25_0_0)]">{title}</p>
        <p className="text-xs text-[oklch(0.55_0_0)] mt-1 leading-relaxed">{description}</p>
        <span className="inline-block mt-3 text-[9px] font-mono tracking-widest uppercase text-[oklch(0.6_0_0)] border border-[var(--panel-border)] px-2.5 py-1 rounded-sm">
          Coming in next release
        </span>
      </div>
    </div>
  )
}
