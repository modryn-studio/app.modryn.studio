'use client';

import { useRef, useState } from 'react';
import { Copy, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'fetching' | 'done' | 'error';

export function RedditView() {
  const [url, setUrl] = useState('');
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
        body: JSON.stringify({ url: trimmed }),
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
      {/* Header bar */}
      <div className="border-panel-border flex items-center gap-2.5 border-b px-5 py-3">
        <Globe className="text-panel-faint h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span className="text-panel-text-secondary font-mono text-[11px] tracking-widest uppercase">
          Reddit Thread Reader
        </span>
      </div>

      {/* Input row */}
      <div className="border-panel-border flex items-center gap-2 border-b px-4 py-3">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            // Reset output when URL changes so stale result doesn't persist
            if (status !== 'idle') {
              setStatus('idle');
              setResult('');
              setErrorMsg('');
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://www.reddit.com/r/..."
          className={cn(
            'text-panel-text placeholder:text-panel-faint min-w-0 flex-1 bg-transparent',
            'border-panel-border border-b pb-0.5 text-[13px] outline-none transition-colors',
            'focus:border-panel-text caret-panel-text',
          )}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={!url.trim() || status === 'fetching'}
          className={cn(
            'shrink-0 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors',
            'bg-panel-inverse text-panel-text hover:bg-panel-border',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {status === 'fetching' ? 'Fetching…' : 'Fetch'}
        </button>
      </div>

      {/* Output area */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Empty state */}
        {status === 'idle' && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-panel-faint text-[12px]">Paste a Reddit thread URL above.</p>
          </div>
        )}

        {/* Fetching */}
        {status === 'fetching' && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-panel-muted text-[12px]">Fetching thread…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-panel-muted text-center text-[12px]">{errorMsg}</p>
          </div>
        )}

        {/* Result */}
        {status === 'done' && result && (
          <>
            {/* Copy button — top-right corner */}
            <div className="border-panel-border absolute top-0 right-0 z-10 border-b border-l">
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors',
                  copied
                    ? 'text-panel-text-secondary'
                    : 'text-panel-muted hover:text-panel-text',
                )}
              >
                {copied ? (
                  <Check className="h-3 w-3" strokeWidth={2} />
                ) : (
                  <Copy className="h-3 w-3" strokeWidth={1.5} />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Scrollable output */}
            <div className="flex-1 overflow-y-auto p-5 pt-10">
              <pre className="text-panel-text font-mono text-[12px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                {result}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
