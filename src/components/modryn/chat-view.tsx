'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type SourceUrlUIPart } from 'ai';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useDraft } from '@/hooks/use-draft';
import { useLongPress } from '@/hooks/use-long-press';
import { ActionSheet } from '@/components/ui/action-sheet';
import {
  Check,
  ChevronDown,
  Copy,
  FileText,
  Paperclip,
  Pencil,
  RotateCcw,
  Send,
  PanelRightClose,
  PanelRightOpen,
  X,
} from 'lucide-react';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { LogDecisionButton } from '@/components/modryn/log-decision-button';
import { LogOrgMemoryButton } from '@/components/modryn/log-org-memory-button';
import { useProfile } from '@/lib/use-profile';
import { cn } from '@/lib/utils';
import { ChatContainerRoot, ChatContainerContent } from '@/components/prompt-kit/chat-container';
import { Markdown } from '@/components/prompt-kit/markdown';
import { ScrollButton } from '@/components/prompt-kit/scroll-button';

interface ChatViewProps {
  memberId: string;
  memberName: string;
  memberRole: string;
  memberInitials: string;
  memberAvatarUrl?: string;
  surface?: 'dm' | 'inbox' | 'thread' | 'task';
  contextCollapsed?: boolean;
  onToggleContext?: () => void;
}

function getMessageText(message: {
  parts?: { type: string; text?: string }[];
  content?: string;
}): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return message.content ?? '';
}

function parseMessageContent(text: string): {
  body: string;
  attachments: { name: string; content: string }[];
} {
  const re = /\n\n---\n\*\*(.+?)\*\*\n\n/g;
  const matches: { index: number; name: string; contentStart: number }[] = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    matches.push({ index: match.index, name: match[1], contentStart: re.lastIndex });
  }
  if (matches.length === 0) return { body: text, attachments: [] };
  const body = text.slice(0, matches[0].index);
  const attachments = matches.map((m, i) => ({
    name: m.name,
    content: text.slice(
      m.contentStart,
      i + 1 < matches.length ? matches[i + 1].index : text.length
    ),
  }));
  return { body, attachments };
}

// Parses the <sources> block appended to DB-stored messages for Michelle's web search results.
// Returns the clean body text and a sources array for rendering as citations.
function parseSourcesBlock(text: string): {
  body: string;
  sources: { url: string; title?: string }[];
} {
  const match = text.match(/\n\n<sources>([\s\S]+?)<\/sources>$/);
  if (!match) return { body: text, sources: [] };
  try {
    return {
      body: text.slice(0, text.length - match[0].length),
      sources: JSON.parse(match[1]) as { url: string; title?: string }[],
    };
  } catch {
    return { body: text, sources: [] };
  }
}

function AttachmentChip({ name, content }: { name: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-panel-border overflow-hidden rounded-sm border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-panel-selected/50 flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors"
      >
        <FileText className="text-panel-faint h-3 w-3 shrink-0" />
        <span className="text-panel-muted font-mono text-[10px]">{name}</span>
        <ChevronDown
          className={cn(
            'text-panel-faint ml-auto h-3 w-3 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="border-panel-border max-h-64 overflow-y-auto border-t px-3 py-2">
          <pre className="text-panel-muted font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-panel-faint h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function FounderMessage({
  text,
  timestamp,
  founderName,
  founderInitials,
  founderAvatarDataUrl,
  onConfirmEdit,
}: {
  text: string;
  timestamp: string;
  founderName: string;
  founderInitials: string;
  founderAvatarDataUrl: string;
  onConfirmEdit?: (newText: string) => void;
}) {
  const { body, attachments } = parseMessageContent(text);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const longPress = useLongPress(() => setSheetOpen(true));

  function handleCopy() {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleEditOpen() {
    setEditText(body);
    setIsEditing(true);
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.focus();
        editRef.current.style.height = editRef.current.scrollHeight + 'px';
      }
    }, 0);
  }

  function handleEditConfirm() {
    const trimmed = editText.trim();
    if (trimmed) onConfirmEdit?.(trimmed);
    setIsEditing(false);
  }

  const sheetItems = [
    ...(onConfirmEdit
      ? [{ label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: handleEditOpen }]
      : []),
    { label: 'Copy', icon: <Copy className="h-4 w-4" />, onClick: handleCopy },
  ];

  return (
    <div
      className="group border-panel-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0"
      {...(!isEditing ? longPress : {})}
    >
      <div className="mb-1.5 flex items-center gap-2.5">
        {founderAvatarDataUrl ? (
          <Image
            src={founderAvatarDataUrl}
            alt={founderName}
            width={24}
            height={24}
            unoptimized
            className="h-6 w-6 shrink-0 rounded-sm object-cover"
          />
        ) : (
          <div className="bg-panel-chrome flex h-6 w-6 shrink-0 items-center justify-center rounded-sm">
            <span className="text-panel-chrome-foreground font-mono text-[9px] font-bold">
              {founderInitials}
            </span>
          </div>
        )}
        <span className="text-panel-foreground text-xs font-semibold">{founderName}</span>
        <ChromeLabel className="text-panel-faint text-[10px] tracking-[0.08em] normal-case">
          {timestamp}
        </ChromeLabel>
        <div className="ml-auto hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy"
            className="text-panel-muted hover:text-panel-foreground rounded-sm p-1 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {onConfirmEdit && (
            <button
              type="button"
              onClick={handleEditOpen}
              title="Edit"
              className="text-panel-muted hover:text-panel-foreground rounded-sm p-1 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 pl-8.5">
        {isEditing ? (
          <>
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEditConfirm();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="border-panel-border text-panel-foreground bg-panel-input w-full resize-none rounded-sm border px-3 py-2 text-sm leading-relaxed focus:outline-none"
              rows={1}
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleEditConfirm}
                className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium transition-colors"
              >
                <Check className="h-3 w-3" />
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-panel-muted hover:text-panel-foreground flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] transition-colors"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {body && (
              <p className="text-panel-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {body}
              </p>
            )}
            {attachments.map((a, i) => (
              <AttachmentChip key={i} name={a.name} content={a.content} />
            ))}
          </>
        )}
      </div>
      <ActionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} items={sheetItems} />
    </div>
  );
}

function AIMessage({
  text,
  memberName,
  memberInitials,
  memberAvatarUrl,
  timestamp,
  isStreaming,
  isSearching,
  messageId,
  memberId,
  conversationId,
  onRetry,
  sources: sourcesProp,
}: {
  text: string;
  memberName: string;
  memberInitials: string;
  memberAvatarUrl?: string;
  timestamp: string;
  isStreaming?: boolean;
  isSearching?: boolean;
  messageId?: string;
  memberId?: string;
  conversationId?: string | null;
  onRetry?: () => void;
  sources?: { url: string; title?: string }[];
}) {
  // Parse <sources> block appended to DB-stored messages; for live stream messages the
  // sources come via the sourcesProp extracted from message parts.
  const { body, sources: dbSources } = parseSourcesBlock(text);
  const sources = sourcesProp?.length ? sourcesProp : dbSources;
  const displayText = body;

  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group bg-ai-surface border-b-ai-border border-l-status-generating flex flex-col gap-1 border-b border-l-2 px-6 py-4 last:border-b-0">
      <div className="mb-1.5 flex items-center gap-2.5">
        {memberAvatarUrl ? (
          <Image
            src={memberAvatarUrl}
            alt={memberName}
            width={24}
            height={24}
            unoptimized
            className="h-6 w-6 shrink-0 rounded-sm object-cover"
          />
        ) : (
          <div className="bg-panel-chrome-strong flex h-6 w-6 shrink-0 items-center justify-center rounded-sm">
            <span className="text-panel-inverse font-mono text-[9px] font-bold">
              {memberInitials}
            </span>
          </div>
        )}
        <span className="text-panel-foreground text-xs font-semibold">{memberName}</span>
        <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1 py-0.5 tracking-[0.08em]">
          AI
        </ChromeLabel>
        <ChromeLabel className="text-panel-faint text-[10px] tracking-[0.08em] normal-case">
          {timestamp}
        </ChromeLabel>
        {isStreaming && (
          <ChromeLabel className="text-status-generating tracking-[0.08em] normal-case">
            {isSearching ? '— searching' : '— generating'}
          </ChromeLabel>
        )}
        {!isStreaming && displayText && (
          <div className="ml-auto flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy"
              className="text-panel-muted hover:text-panel-foreground rounded-sm p-1 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                title="Retry"
                className="text-panel-muted hover:text-panel-foreground rounded-sm p-1 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {memberId !== undefined && (
              <LogDecisionButton
                messageContent={displayText}
                memberId={memberId}
                conversationId={conversationId ?? null}
              />
            )}
            {memberId !== undefined && (
              <LogOrgMemoryButton
                messageContent={displayText}
                memberId={memberId}
                conversationId={conversationId ?? null}
              />
            )}
          </div>
        )}
      </div>
      <div className="pl-8.5">
        {displayText ? (
          <div className="prose prose-sm max-w-none">
            <Markdown id={messageId}>{displayText}</Markdown>
          </div>
        ) : isSearching ? (
          <p className="text-panel-faint font-mono text-[11px]">searching the web...</p>
        ) : (
          <ThinkingDots />
        )}
        {!isStreaming && sources.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <ChromeLabel className="text-panel-faint text-[10px] tracking-widest">
              Sources
            </ChromeLabel>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s, i) => {
                let domain = s.url;
                try {
                  domain = new URL(s.url).hostname.replace(/^www\./, '');
                } catch {}
                return (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.title ?? s.url}
                    className="border-panel-border text-panel-muted hover:text-panel-foreground hover:border-panel-foreground/30 flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] transition-colors"
                  >
                    <span className="text-panel-faint">{i + 1}.</span>
                    {domain}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatHistorySkeleton() {
  return (
    <div className="flex min-h-full flex-col justify-end">
      <div className="space-y-4 px-5 py-4">
        {/* AI bubble */}
        <div className="flex items-end gap-2">
          <div className="bg-panel-chrome-strong h-6 w-6 shrink-0 animate-pulse rounded-sm" />
          <div className="max-w-[60%] space-y-1.5">
            <div className="bg-panel-border h-3 w-32 animate-pulse rounded" />
            <div className="bg-panel-border h-16 w-full animate-pulse rounded" />
          </div>
        </div>
        {/* User bubble */}
        <div className="flex items-end justify-end gap-2">
          <div className="max-w-[55%] space-y-1.5">
            <div className="bg-panel-border ml-auto h-10 w-full animate-pulse rounded" />
          </div>
          <div className="bg-panel-chrome h-6 w-6 shrink-0 animate-pulse rounded-sm" />
        </div>
        {/* AI bubble */}
        <div className="flex items-end gap-2">
          <div className="bg-panel-chrome-strong h-6 w-6 shrink-0 animate-pulse rounded-sm" />
          <div className="max-w-[70%] space-y-1.5">
            <div className="bg-panel-border h-3 w-24 animate-pulse rounded" />
            <div className="bg-panel-border h-24 w-full animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ memberName, memberRole }: { memberName: string; memberRole: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-end px-6 pt-6 pb-3 md:p-8 md:pb-4">
      <div className="w-full max-w-prose text-center">
        <p className="text-panel-foreground text-sm font-semibold">{memberName}</p>
        <p className="text-panel-muted mt-0.5 text-xs">{memberRole}</p>
        <ChromeLabel as="p" className="text-panel-faint mt-4 text-[10px] tracking-widest">
          Conversation begins here
        </ChromeLabel>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ChatView({
  memberId,
  memberName,
  memberRole,
  memberInitials,
  memberAvatarUrl,
  surface = 'dm',
  contextCollapsed,
  onToggleContext,
}: ChatViewProps) {
  const { profile } = useProfile();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useDraft(`dm-${memberId}`);
  const [messageTimestamps, setMessageTimestamps] = useState<Record<string, string>>({});
  const [pendingTimestamp, setPendingTimestamp] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const conversationIdRef = useRef<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Signals to the chat route that this is a retry — skip re-inserting the user message
  const isRetryRef = useRef(false);

  const { messages, sendMessage, regenerate, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => {
        const isRetry = isRetryRef.current;
        isRetryRef.current = false; // consume
        return {
          body: {
            id,
            message: messages[messages.length - 1],
            memberId,
            conversationId: conversationIdRef.current,
            surface,
            isRetry,
          },
        };
      },
    }),
  });

  // Load conversation history on mount
  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const res = await fetch(`/api/conversations/dm/${encodeURIComponent(memberId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        conversationIdRef.current = data.conversationId;

        if (data.messages.length > 0) {
          const loaded = data.messages.map(
            (m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role,
              parts: [{ type: 'text' as const, text: m.content }],
              createdAt: new Date(m.createdAt),
            })
          );
          setMessages(loaded);

          // Pre-populate timestamps from DB
          const ts: Record<string, string> = {};
          for (const m of data.messages) {
            ts[m.id] = formatTime(new Date(m.createdAt));
          }
          setMessageTimestamps(ts);
        }
      } catch {
        // chat works without history
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [memberId, setMessages]);

  // Mobile keyboard safety — track on-screen keyboard
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vp = window.visualViewport;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vp.height - vp.offsetTop);
      setKeyboardOffset(offset > 120 ? offset : 0);
    };
    update();
    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);
    return () => {
      vp.removeEventListener('resize', update);
      vp.removeEventListener('scroll', update);
    };
  }, []);

  const isSubmitted = status === 'submitted';
  const isStreaming = status === 'streaming' || isSubmitted;

  function deleteFromMessage(messageId: string): Promise<void> {
    return fetch(`/api/conversations/dm/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
      .then(() => {})
      .catch(() => {});
  }

  function handleEdit(idx: number, messageId: string | undefined, newText: string) {
    setMessages((prev) => prev.slice(0, idx));
    if (messageId) deleteFromMessage(messageId);
    sendMessage({ text: newText });
  }

  async function handleRetry(messageId: string | undefined) {
    // Await DELETE so the DB is clean before the chat route loads history
    if (messageId) await deleteFromMessage(messageId);
    isRetryRef.current = true;
    // Let regenerate() manage message state — calling setMessages here races with SDK internals
    regenerate();
  }

  useEffect(() => {
    setMessageTimestamps((prev) => {
      let changed = false;
      const next = { ...prev };

      messages.forEach((message, idx) => {
        const key = message.id ?? `idx-${idx}`;
        if (next[key]) return;

        const createdAt = (message as { createdAt?: Date | string }).createdAt;
        next[key] = formatTime(createdAt ? new Date(createdAt) : new Date());
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [messages]);

  useEffect(() => {
    if (status !== 'submitted' && pendingTimestamp) {
      setPendingTimestamp(null);
    }
  }, [status, pendingTimestamp]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFiles((prev) => [
          ...prev,
          { name: file.name, content: reader.result as string },
        ]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleSend = () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    if (isStreaming) return;
    const parts = [
      inputValue.trim(),
      ...attachedFiles.map((f) => `---\n**${f.name}**\n\n${f.content}`),
    ].filter(Boolean);
    const text = parts.join('\n\n');
    setPendingTimestamp(formatTime(new Date()));
    sendMessage({ text });
    setInputValue('');
    setAttachedFiles([]);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-panel flex h-full flex-col">
      {/* Header - hidden on mobile (handled by MobileHeader) */}
      <div className="border-panel-border bg-panel hidden items-center justify-between border-b px-6 py-3.5 md:flex">
        <div className="flex items-center gap-3">
          {memberAvatarUrl ? (
            <Image
              src={memberAvatarUrl}
              alt={memberName}
              width={28}
              height={28}
              unoptimized
              className="h-7 w-7 shrink-0 rounded-sm object-cover"
            />
          ) : (
            <div className="bg-panel-chrome flex h-7 w-7 shrink-0 items-center justify-center rounded-sm">
              <span className="text-panel-chrome-foreground font-mono text-[10px] font-bold">
                {memberInitials}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-panel-foreground text-sm font-semibold">{memberName}</span>
              <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1 py-0.5 tracking-[0.08em]">
                AI
              </ChromeLabel>
            </div>
            <p className="text-panel-muted text-[10px]">{memberRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isSubmitted
                ? 'bg-status-active animate-pulse'
                : status === 'streaming'
                  ? 'bg-status-generating animate-pulse'
                  : 'bg-status-online'
            )}
          />
          <ChromeLabel className="text-panel-muted mr-2 text-[10px] tracking-[0.08em] normal-case">
            {isSubmitted ? 'analyzing' : status === 'streaming' ? 'generating' : 'online'}
          </ChromeLabel>
          {onToggleContext && (
            <button
              onClick={onToggleContext}
              className="text-panel-muted hover:text-panel-text p-1 transition-colors"
              aria-label={contextCollapsed ? 'Show context' : 'Hide context'}
            >
              {contextCollapsed ? (
                <PanelRightOpen className="h-4 w-4" />
              ) : (
                <PanelRightClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ChatContainerRoot className="relative flex-1">
        <ChatContainerContent>
          {!historyLoaded ? (
            <ChatHistorySkeleton />
          ) : messages.length === 0 ? (
            <EmptyState memberName={memberName} memberRole={memberRole} />
          ) : (
            <div className="flex min-h-full flex-col justify-end">
              <div>
                {messages.map((message, idx) => {
                  const text = getMessageText(message);
                  const key = message.id ?? `idx-${idx}`;
                  const createdAt = (message as { createdAt?: Date | string }).createdAt;
                  const timestamp =
                    messageTimestamps[key] ??
                    formatTime(createdAt ? new Date(createdAt) : new Date());
                  const isLastAI = message.role === 'assistant' && idx === messages.length - 1;

                  if (message.role === 'user') {
                    return (
                      <FounderMessage
                        key={message.id ?? idx}
                        text={text}
                        timestamp={timestamp}
                        founderName={profile.name}
                        founderInitials={profile.initials}
                        founderAvatarDataUrl={profile.avatarDataUrl}
                        onConfirmEdit={
                          !isStreaming
                            ? (newText) => handleEdit(idx, message.id, newText)
                            : undefined
                        }
                      />
                    );
                  }

                  return (
                    <AIMessage
                      key={message.id ?? idx}
                      text={text}
                      memberName={memberName}
                      memberInitials={memberInitials}
                      memberAvatarUrl={memberAvatarUrl}
                      timestamp={timestamp}
                      isStreaming={isLastAI && isStreaming}
                      isSearching={isLastAI && isStreaming && memberId === 'michelle-lim' && !text}
                      onRetry={!isStreaming ? () => handleRetry(message.id) : undefined}
                      messageId={message.id ?? `idx-${idx}`}
                      memberId={memberId}
                      conversationId={conversationIdRef.current}
                      sources={message.parts
                        ?.filter((p): p is SourceUrlUIPart => p.type === 'source-url')
                        .map((p) => ({ url: p.url, title: p.title }))}
                    />
                  );
                })}

                {/* Streaming placeholder when submitted but no AI message yet */}
                {status === 'submitted' && (
                  <AIMessage
                    text=""
                    memberName={memberName}
                    memberInitials={memberInitials}
                    memberAvatarUrl={memberAvatarUrl}
                    timestamp={pendingTimestamp ?? formatTime(new Date())}
                    isStreaming
                    isSearching={memberId === 'michelle-lim'}
                  />
                )}
              </div>
            </div>
          )}
        </ChatContainerContent>
        <div className="absolute right-4 bottom-4 z-10">
          <ScrollButton className="bg-panel-input border-panel-border text-panel-muted hover:text-panel-foreground" />
        </div>
      </ChatContainerRoot>

      {/* Input */}
      <div
        className="border-panel-border bg-panel border-t px-4 py-3 transition-[padding]"
        style={{ paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message {memberName}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="group bg-panel-input border-panel-border focus-within:border-sidebar-accent focus-within:ring-sidebar-accent/10 flex flex-col rounded-sm border px-4 py-2.5 transition-colors focus-within:ring-4">
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedFiles.map((f, i) => (
                <span
                  key={i}
                  className="bg-panel border-panel-border text-panel-muted flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px]"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-panel-faint hover:text-panel-muted ml-0.5 leading-none"
                    aria-label={`Remove ${f.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-3">
            <textarea
              id="chat-input"
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${memberName}...`}
              rows={1}
              disabled={isStreaming || !historyLoaded}
              className="text-panel-foreground placeholder:text-panel-faint max-h-32 min-h-6 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed outline-none disabled:opacity-50"
              style={{
                height: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || !historyLoaded}
                className="text-panel-faint hover:text-panel-muted transition-colors disabled:opacity-30"
                aria-label="Attach file"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleSend}
                disabled={
                  (!inputValue.trim() && attachedFiles.length === 0) ||
                  isStreaming ||
                  !historyLoaded
                }
                className="bg-panel-foreground hover:bg-panel-foreground-hover flex h-8 w-8 items-center justify-center rounded-sm transition-colors disabled:opacity-30"
                aria-label="Send message"
              >
                <Send className="text-panel-inverse h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
