'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Send, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { useProfile } from '@/lib/use-profile';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  memberId: string;
  memberName: string;
  memberRole: string;
  memberInitials: string;
  memberAvatarUrl?: string;
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
}: {
  text: string;
  timestamp: string;
  founderName: string;
  founderInitials: string;
  founderAvatarDataUrl: string;
}) {
  return (
    <div className="group border-panel-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0">
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
      </div>
      <p className="text-panel-foreground pl-8.5 text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
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
}: {
  text: string;
  memberName: string;
  memberInitials: string;
  memberAvatarUrl?: string;
  timestamp: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="group bg-ai-surface border-ai-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0">
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
            — generating
          </ChromeLabel>
        )}
      </div>
      <div className="pl-8.5">
        {text ? (
          <p className="text-panel-text text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        ) : (
          <ThinkingDots />
        )}
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
  contextCollapsed,
  onToggleContext,
}: ChatViewProps) {
  const { profile } = useProfile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [messageTimestamps, setMessageTimestamps] = useState<Record<string, string>>({});
  const [pendingTimestamp, setPendingTimestamp] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const conversationIdRef = useRef<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          memberId,
          conversationId: conversationIdRef.current,
        },
      }),
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (status !== 'submitted' && pendingTimestamp) {
      setPendingTimestamp(null);
    }
  }, [status, pendingTimestamp]);

  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return;
    setPendingTimestamp(formatTime(new Date()));
    sendMessage({ text: inputValue });
    setInputValue('');
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
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        {messages.length === 0 ? (
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
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="border-panel-border bg-panel border-t px-4 py-3 transition-[padding]"
        style={{ paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message {memberName}
        </label>
        <div className="group bg-panel-input border-panel-border focus-within:border-sidebar-accent focus-within:ring-sidebar-accent/10 flex items-end gap-3 rounded-sm border px-4 py-2.5 transition-colors focus-within:ring-4">
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
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming || !historyLoaded}
              className="bg-panel-foreground hover:bg-panel-foreground-hover flex h-8 w-8 items-center justify-center rounded-sm transition-colors disabled:opacity-30"
              aria-label="Send message"
            >
              <Send className="text-panel-inverse h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
