export default function Home() {
  return (
    <main className="bg-bg text-text flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <span className="text-muted font-mono text-xs font-bold tracking-[0.2em] uppercase">
          Modryn Studio
        </span>
        <span className="text-muted font-mono text-[10px]">internal — v1.0</span>
      </header>

      {/* Dashboard entry */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <div className="border-border bg-surface mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-sm border">
            <span className="text-accent font-mono text-sm font-bold">M</span>
          </div>
          <h1 className="font-heading text-text mb-2 text-xl font-semibold">Company HQ</h1>
          <p className="text-muted font-mono text-xs leading-relaxed">
            AI team. Tasks. Decisions. Threads.
          </p>
        </div>
      </div>
    </main>
  );
}
