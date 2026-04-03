interface PlaceholderViewProps {
  title: string;
  description: string;
  label: string;
}

export function PlaceholderView({ title, description, label }: PlaceholderViewProps) {
  return (
    <div className="bg-panel flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="border-panel-border flex h-14 w-14 items-center justify-center rounded-sm border border-dashed">
        <span className="text-panel-faint font-mono text-xs">{label}</span>
      </div>
      <div className="max-w-xs text-center">
        <p className="text-panel-text text-sm font-semibold">{title}</p>
        <p className="text-panel-muted mt-1 text-xs leading-relaxed">{description}</p>
        <span className="text-panel-faint border-panel-border mt-3 inline-block rounded-sm border px-2.5 py-1 font-mono text-[9px] tracking-widest uppercase">
          Coming in next release
        </span>
      </div>
    </div>
  );
}
