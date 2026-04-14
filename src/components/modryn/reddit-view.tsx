'use client';

import { useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'fetching' | 'done' | 'error';

export function RedditView() {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState<number>(4);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFetch() {
    const trimmed = url.trim();
    if (!trimmed || status === 'fetching') return;

    setStatus('fetching');
    setResult('');
    setErrorMsg('');
    setCopied(false);

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

  return (
    <div className="bg-panel flex flex-1 flex-col overflow-hidden">
      {/* Header bar — matches inbox/threads pattern exactly */}
      <div className="border-panel-border border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-panel-foreground text-xs font-semibold">Reddit</h2>
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
      </div>

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
        {/* Matches the send-button pattern: bg-panel-foreground, text-panel-inverse */}
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
    </div>
  );
}
