interface PlaceholderViewProps {
  title: string
  description: string
  label: string
}

export function PlaceholderView({ title, description, label }: PlaceholderViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-panel p-8">
      <div className="w-14 h-14 rounded-sm border border-dashed border-panel-border flex items-center justify-center">
        <span className="text-xs font-mono text-panel-faint">{label}</span>
      </div>
      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-panel-text">{title}</p>
        <p className="text-xs text-panel-muted mt-1 leading-relaxed">{description}</p>
        <span className="inline-block mt-3 text-[9px] font-mono tracking-widest uppercase text-panel-faint border border-panel-border px-2.5 py-1 rounded-sm">
          Coming in next release
        </span>
      </div>
    </div>
  )
}
