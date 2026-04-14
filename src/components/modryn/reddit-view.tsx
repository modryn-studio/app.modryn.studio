'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, Check, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'fetching' | 'done' | 'error';
type Mode = 'fetch' | 'saved';

interface SavedRow {
  id: string;
  url: string;
  label: string;
  depth: number;
  created_at: string;
}

// Extract a clean label from the raw `POST: {title}` first line of the formatted text
function extractLabel(text: string): string {
  const firstLine = text.split('\n').find((l) => l.trim().length > 0) ?? '';
  return firstLine
    .replace(/^POST:\s*/i, '')
    .slice(0, 120)
    .trim();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RedditView({ projectId }: { projectId: string }) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState<number>(4);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mode toggle
  const [mode, setMode] = useState<Mode>('fetch');

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);

  // Saved list state
  const [savedList, setSavedList] = useState<SavedRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSavedList = useCallback(async () => {
    if (!projectId) return;
    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/reddit/saved?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = (await res.json()) as { saved: SavedRow[] };
        setSavedList(data.saved ?? []);
      }
    } finally {
      setLoadingSaved(false);
    }
  }, [projectId]);

  // Load saved list when switching to saved mode
  useEffect(() => {
    if (mode === 'saved') fetchSavedList();
  }, [mode, fetchSavedList]);

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed || status === 'fetching') return;

    setStatus('fetching');
    setResult('');
    setErrorMsg('');
    setCopied(false);
    setSavedConfirmed(false);

    try {
      const res = await fetch('/api/reddit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, depth }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Could not fetch thread.');
        setStatus('error');
        return;
      }
      setResult(data.text ?? '');
      setStatus('done');
    } catch {
      setErrorMsg('Network error — check your connection and try again.');
      setStatus('error');
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleFetch();
  }

  async function handleSave() {
    if (!projectId || !result || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reddit/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          url: url.trim(),
          label: extractLabel(result),
          text: result,
          depth,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedConfirmed(true);
    } catch {
      // Silent — button returns to Save state so user can retry
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadSaved(id: string) {
    try {
      const res = await fetch(`/api/reddit/saved/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { saved: { url: string; text: string; depth: number } };
      setUrl(data.saved.url);
      setDepth(data.saved.depth);
      setResult(data.saved.text);
      setStatus('done');
      setCopied(false);
      setSavedConfirmed(false);
      setMode('fetch');
    } catch {
      // Silent — list stays open
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/reddit/saved/${id}`, { method: 'DELETE' });
      setSavedList((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-panel flex flex-1 flex-col overflow-hidden">
      {/* Header bar */}
      <div className="border-panel-border border-b px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('fetch')}
              className={cn(
                'text-[11px] font-semibold transition-colors',
                mode === 'fetch'
                  ? 'text-panel-foreground'
                  : 'text-panel-faint hover:text-panel-muted'
              )}
            >
              Fetch
            </button>
            <button
              type="button"
              onClick={() => setMode('saved')}
              className={cn(
                'text-[11px] font-semibold transition-colors',
                mode === 'saved'
                  ? 'text-panel-foreground'
                  : 'text-panel-faint hover:text-panel-muted'
              )}
            >
              Saved
            </button>
          </div>

          {/* Header actions — fetch mode only */}
          {mode === 'fetch' && (
            <div className="flex items-center gap-3">
              {status === 'done' && result && !savedConfirmed && projectId && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="text-panel-muted hover:text-panel-foreground flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-40"
                >
                  <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              {savedConfirmed && (
                <span className="text-status-online flex items-center gap-1.5 text-[11px] font-medium">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Saved
                </span>
              )}
              {status === 'done' && result && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] font-medium transition-colors',
                    copied
                      ? 'text-panel-text-secondary'
                      : 'text-panel-muted hover:text-panel-foreground'
                  )}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fetch mode */}
      {mode === 'fetch' && (
        <>
          {/* Input row */}
          <div className="border-panel-border flex items-center gap-2 border-b px-4 py-3">
            {/* Depth selector */}
            <div className="flex shrink-0 items-center gap-2.5">
              {([2, 3, 4, 99] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={cn(
                    'font-mono text-[11px] transition-colors',
                    depth === d
                      ? 'text-panel-foreground font-semibold'
                      : 'text-panel-faint hover:text-panel-muted'
                  )}
                >
                  {d === 99 ? '\u221e' : d}
                </button>
              ))}
              <span className="border-panel-border self-stretch border-r" />
            </div>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                // Only reset stale output — don't interrupt an in-flight fetch
                if (status !== 'idle' && status !== 'fetching') {
                  setStatus('idle');
                  setResult('');
                  setErrorMsg('');
                  setSavedConfirmed(false);
                  setSaving(false);
                }
              }}
              onFocus={(e) => e.target.select()}
              onKeyDown={handleKeyDown}
              placeholder="https://www.reddit.com/r/..."
              className={cn(
                'text-panel-text placeholder:text-panel-faint min-w-0 flex-1 bg-transparent',
                'border-panel-border border-b pb-0.5 text-[13px] transition-colors outline-none',
                'focus:border-panel-foreground caret-panel-text'
              )}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={!url.trim() || status === 'fetching'}
              className="bg-panel-foreground hover:bg-panel-foreground/80 text-panel-inverse flex h-8 shrink-0 items-center justify-center rounded-sm px-3 text-[12px] font-medium transition-colors disabled:opacity-30"
            >
              {status === 'fetching' ? 'Fetching…' : 'Fetch'}
            </button>
          </div>

          {/* Output area */}
          <div className="flex min-h-0 flex-1 flex-col">
            {status === 'idle' && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-panel-muted text-sm">Paste a Reddit thread URL above.</p>
              </div>
            )}
            {status === 'fetching' && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-panel-muted text-sm">Fetching thread…</p>
              </div>
            )}
            {status === 'error' && (
              <div className="flex flex-1 items-center justify-center px-6">
                <p className="text-panel-muted text-center text-sm">{errorMsg}</p>
              </div>
            )}
            {status === 'done' && result && (
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-panel-text font-mono text-[12px] leading-relaxed wrap-break-word whitespace-pre-wrap">
                  {result}
                </pre>
              </div>
            )}
          </div>
        </>
      )}

      {/* Saved mode */}
      {mode === 'saved' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {loadingSaved && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-panel-muted text-sm">Loading…</p>
            </div>
          )}
          {!loadingSaved && savedList.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-panel-muted text-sm">No saved threads for this project.</p>
            </div>
          )}
          {!loadingSaved && savedList.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              {savedList.map((row) => (
                // div avoids nested-button hydration error (delete button is inside)
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleLoadSaved(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleLoadSaved(row.id);
                  }}
                  className="border-panel-border group hover:bg-panel-selected flex w-full cursor-pointer items-start gap-3 border-b px-5 py-4 text-left transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-panel-foreground truncate text-[13px] font-medium">
                      {row.label}
                    </p>
                    <p className="text-panel-faint mt-0.5 truncate font-mono text-[11px]">
                      {row.url}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <span className="text-panel-faint font-mono text-[11px]">
                      {formatDate(row.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id);
                      }}
                      disabled={deletingId === row.id}
                      className="text-panel-faint rounded-sm p-0.5 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
