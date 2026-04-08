'use client';

import { ArrowLeft, MessageSquarePlus, Send } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { LogDecisionButton } from '@/components/modryn/log-decision-button';
import { LogOrgMemoryButton } from '@/components/modryn/log-org-memory-button';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMembers } from '@/hooks/use-members';
import { useProfile } from '@/lib/use-profile';
import { cn } from '@/lib/utils';

// ——— Types ———

interface Thread {
  id: string;
  title: string;
  last_message: string | null;
  last_sender_id: string | null;
  participant_count: number;
  updated_at: string;
}

interface ThreadMessage {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_initials: string | null;
  sender_role: string | null;
  role: string;
  content: string;
  created_at: string;
}

interface ThreadDetail {
  thread: { id: string; title: string; created_at: string; updated_at: string };
  messages: ThreadMessage[];
  memberOrder: string[];
}

// ——— Preset respond orders (matched by member name fragment) ———

const PRESET_NAME_ORDERS: Record<string, string[]> = {
  strategy: ['Munger', 'Jobs', 'Marc', 'Michelle', 'Rams'],
  technical: ['Michelle', 'Munger', 'Marc', 'Jobs', 'Rams'],
  design: ['Rams', 'Jobs', 'Michelle', 'Marc', 'Munger'],
  launch: ['Marc', 'Jobs', 'Michelle', 'Munger', 'Rams'],
};

const PRESET_LABELS: Record<string, string> = {
  strategy: 'Strategy',
  technical: 'Technical',
  design: 'Design',
  launch: 'Launch',
  custom: 'Custom',
};

const FIELD_CLASS =
  'w-full bg-transparent text-sidebar-foreground placeholder:text-sidebar-muted border-b border-sidebar-ring outline-none caret-sidebar-primary text-[13px] pb-1 focus:border-sidebar-primary transition-colors';

// ——— Helpers ———

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return sameDay
    ? formatTime(iso)
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// ——— Main component ———

export function ThreadsView() {
  const { members } = useMembers();
  const { profile } = useProfile();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondingMemberId, setRespondingMemberId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [replyValue, setReplyValue] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New thread form
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBrief, setNewBrief] = useState('');
  const [threadType, setThreadType] = useState<
    'strategy' | 'technical' | 'design' | 'launch' | 'custom'
  >('strategy');
  const [dragOrder, setDragOrder] = useState<string[]>([]);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const dragSource = useRef<number | null>(null);

  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Guard against concurrent respond sequences
  const respondingRef = useRef(false);

  // Load threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

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

  // Initialise drag order to member list order when members first load
  useEffect(() => {
    if (members.length > 0 && dragOrder.length === 0) {
      setDragOrder(members.map((m) => m.id));
    }
  }, [members, dragOrder.length]);

  // Scroll to bottom when messages append or responding member changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages.length, respondingMemberId]);

  // ——— Data fetching ———

  async function fetchThreads() {
    try {
      const res = await fetch('/api/threads');
      if (!res.ok) return;
      const data = await res.json();
      setThreads(data.threads ?? []);
    } catch {
      // silent — thread list is best-effort
    }
  }

  async function fetchThreadDetail(threadId: string): Promise<ThreadDetail | null> {
    try {
      const res = await fetch(`/api/threads/${threadId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ——— Preset order resolution ———

  const resolvePresetOrder = useCallback(
    (type: string): string[] => {
      const fragments = PRESET_NAME_ORDERS[type];
      if (!fragments) return members.map((m) => m.id);
      const ordered: string[] = [];
      for (const frag of fragments) {
        const m = members.find((mem) => mem.name.includes(frag));
        if (m && !ordered.includes(m.id)) ordered.push(m.id);
      }
      // Append any members not covered by the preset
      for (const m of members) {
        if (!ordered.includes(m.id)) ordered.push(m.id);
      }
      return ordered;
    },
    [members]
  );

  function getEffectiveOrder(): string[] {
    if (threadType === 'custom') {
      return dragOrder.length > 0 ? dragOrder : members.map((m) => m.id);
    }
    return resolvePresetOrder(threadType);
  }

  // ——— Respond sequence ———

  async function runRespondSequence(
    threadId: string,
    memberOrder: string[],
    currentMessages: ThreadMessage[]
  ) {
    // Only one sequence at a time
    if (respondingRef.current) return;
    respondingRef.current = true;
    let msgs = currentMessages;
    let lastSuccessfulResponderId: string | null = null;
    for (const memberId of memberOrder) {
      setRespondingMemberId(memberId);
      const member = members.find((m) => m.id === memberId);
      try {
        const res = await fetch(`/api/threads/${threadId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId }),
        });
        if (!res.ok) {
          // Surface failure visibly rather than silently continuing
          const name = member?.name ?? memberId;
          const failMsg: ThreadMessage = {
            id: `fail-${memberId}-${Date.now()}`,
            sender_id: 'system',
            sender_name: 'System',
            sender_initials: '!',
            sender_role: null,
            role: 'assistant',
            content: `[${name} failed to respond — server returned ${res.status}. Continuing sequence.]`,
            created_at: new Date().toISOString(),
          };
          msgs = [...msgs, failMsg];
          setSelected((prev) => (prev ? { ...prev, messages: msgs } : prev));
          continue;
        }
        const { message } = (await res.json()) as { message: ThreadMessage };
        msgs = [...msgs, message];
        lastSuccessfulResponderId = memberId;
        setSelected((prev) => (prev ? { ...prev, messages: msgs } : prev));
      } catch (err) {
        // Network-level failure — surface visibly and continue
        const name = member?.name ?? memberId;
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        const failMsg: ThreadMessage = {
          id: `fail-${memberId}-${Date.now()}`,
          sender_id: 'system',
          sender_name: 'System',
          sender_initials: '!',
          sender_role: null,
          role: 'assistant',
          content: `[${name} failed to respond — ${errMsg}. Continuing sequence.]`,
          created_at: new Date().toISOString(),
        };
        msgs = [...msgs, failMsg];
        setSelected((prev) => (prev ? { ...prev, messages: msgs } : prev));
      }
    }
    // Fire org-fact extraction once after the full sequence — regardless of
    // which members succeeded or failed. Non-critical: failures are logged, not surfaced.
    if (lastSuccessfulResponderId) {
      try {
        await fetch(`/api/threads/${threadId}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: lastSuccessfulResponderId }),
        });
      } catch {
        // Extraction failure is non-critical — sequence has already completed
      }
    }
    setRespondingMemberId(null);
    respondingRef.current = false;
    // Refresh sidebar thread list to update last-message preview
    fetchThreads();
  }

  // ——— Thread selection ———

  async function handleSelectThread(threadId: string) {
    if (respondingRef.current) return; // Don't switch mid-sequence
    setMobileShowDetail(true);
    setLoading(true);
    setSelected(null);

    const data = await fetchThreadDetail(threadId);
    if (!data) {
      setLoading(false);
      return;
    }
    setSelected(data);
    setLoading(false);

    // Auto-resume respond sequence if last message is from founder.
    // Determine which members have already responded since the last founder message
    // so re-opening mid-sequence doesn't double-fire completed members.
    const lastFounderIdx = [...data.messages]
      .reverse()
      .findIndex((m) => m.sender_id === 'founder');
    const lastMsg = data.messages[data.messages.length - 1];
    if (lastMsg && lastMsg.sender_id === 'founder') {
      // All members need to respond — fire full sequence
      await runRespondSequence(threadId, data.memberOrder, data.messages);
    } else if (lastFounderIdx !== -1) {
      // Some members may have already responded after the last founder message.
      // Resume from the first member who hasn't responded yet.
      const afterFounder = data.messages.slice(
        data.messages.length - lastFounderIdx
      );
      const respondedIds = new Set(afterFounder.map((m) => m.sender_id));
      const remaining = data.memberOrder.filter((id) => !respondedIds.has(id));
      if (remaining.length > 0) {
        await runRespondSequence(threadId, remaining, data.messages);
      }
    }
  }

  // ——— Reply ———

  async function handleSendReply() {
    if (!replyValue.trim() || respondingMemberId || !selected || sendingReply) return;
    const content = replyValue.trim();
    setReplyValue('');
    setSendingReply(true);
    try {
      const res = await fetch(`/api/threads/${selected.thread.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        setSendingReply(false);
        return;
      }
      const { message } = (await res.json()) as { message: ThreadMessage };
      const msgs = [...selected.messages, message];
      setSelected((prev) => (prev ? { ...prev, messages: msgs } : prev));
      setSendingReply(false);
      await runRespondSequence(selected.thread.id, selected.memberOrder, msgs);
    } catch {
      setSendingReply(false);
    }
  }

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // ——— New thread creation ———

  async function handleCreateThread() {
    if (!newTitle.trim() || !newBrief.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const memberOrder = getEffectiveOrder();
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          brief: newBrief.trim(),
          memberOrder,
        }),
      });
      if (!res.ok) {
        setCreateError('Failed to create thread.');
        setCreating(false);
        return;
      }
      const { threadId } = (await res.json()) as { threadId: string; memberOrder: string[] };
      setNewSheetOpen(false);
      resetNewForm();
      await fetchThreads();
      // Select and auto-trigger respond sequence
      await handleSelectThread(threadId);
    } catch {
      setCreateError('Failed to create thread.');
    } finally {
      setCreating(false);
    }
  }

  function resetNewForm() {
    setNewTitle('');
    setNewBrief('');
    setThreadType('strategy');
    setDragOrder(members.map((m) => m.id));
    setCreateError('');
  }

  // ——— Drag-to-reorder ———

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    dragSource.current = index;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    setDropIndex(insertBefore ? index : index + 1);
  }, []);

  const handleDrop = useCallback(() => {
    const srcIdx = dragSource.current;
    const insertAt = dropIndex;
    dragSource.current = null;
    setDropIndex(null);

    if (srcIdx === null || insertAt === null) return;
    setDragOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(srcIdx, 1);
      const adjusted = insertAt > srcIdx ? insertAt - 1 : insertAt;
      next.splice(adjusted, 0, item);
      return next;
    });
  }, [dropIndex]);

  const handleDragEnd = useCallback(() => {
    dragSource.current = null;
    setDropIndex(null);
  }, []);

  // Materialise preset into dragOrder and switch to custom when user drags
  const handleDragStartSwitch = useCallback(
    (index: number, e: React.DragEvent) => {
      if (threadType !== 'custom') {
        const presetOrder = resolvePresetOrder(threadType);
        setDragOrder(presetOrder);
        setThreadType('custom');
      }
      handleDragStart(index, e);
    },
    [threadType, resolvePresetOrder, handleDragStart]
  );

  // ——— Derived ———

  function getMemberById(id: string) {
    return members.find((m) => m.id === id);
  }

  const isSequenceRunning = !!respondingMemberId;
  const inputDisabled = isSequenceRunning || sendingReply;

  // Ordered member list shown in the new-thread sheet
  const sheetMemberOrder = threadType === 'custom' ? dragOrder : resolvePresetOrder(threadType);

  // ——— Render helpers ———

  const renderThreadList = (mobile = false) => (
    <div
      className={cn(
        'border-panel-border flex flex-col',
        mobile ? 'h-full' : 'w-72 shrink-0 border-r'
      )}
    >
      <div className="border-panel-border border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-panel-foreground text-xs font-semibold">Threads</h2>
          <button
            onClick={() => setNewSheetOpen(true)}
            className="text-panel-muted hover:text-panel-foreground flex items-center gap-1.5 transition-colors"
            aria-label="New thread"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <ChromeLabel className="text-[10px] tracking-[0.08em] normal-case">New</ChromeLabel>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-5 py-10 text-center">
            <ChromeLabel className="text-panel-muted mb-2 text-[10px] tracking-widest">
              No threads yet
            </ChromeLabel>
            <p className="text-panel-muted text-xs">Start one to run a team discussion.</p>
          </div>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => handleSelectThread(thread.id)}
            className={cn(
              'border-panel-border hover:bg-panel-selected/70 w-full border-b px-5 py-4 text-left transition-colors',
              selected?.thread.id === thread.id && 'bg-panel-selected'
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-panel-foreground truncate text-xs font-semibold">
                {thread.title}
              </span>
              <ChromeLabel className="text-panel-faint shrink-0 text-[10px] tracking-[0.08em] normal-case">
                {formatDate(thread.updated_at)}
              </ChromeLabel>
            </div>
            {thread.last_message && (
              <p className="text-panel-muted truncate text-[10px] leading-relaxed">
                {thread.last_message}
              </p>
            )}
            <ChromeLabel className="text-panel-faint mt-1.5 text-[10px] tracking-[0.08em]">
              {thread.participant_count} MEMBERS
            </ChromeLabel>
          </button>
        ))}
      </div>
    </div>
  );

  const renderThreadDetail = (mobile = false) => {
    if (!selected && !loading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <ChromeLabel className="text-panel-muted text-[10px] tracking-widest">
            Conversation workspace
          </ChromeLabel>
          <p className="text-panel-muted text-sm">Select a thread to read</p>
        </div>
      );
    }

    if (loading && !selected) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <ThinkingDots />
        </div>
      );
    }

    if (!selected) return null;

    const respondingMember = respondingMemberId ? getMemberById(respondingMemberId) : null;

    return (
      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: mobile && keyboardOffset ? `${keyboardOffset}px` : undefined }}
      >
        {/* Detail header */}
        <div className={cn('border-panel-border border-b', mobile ? 'px-5 py-4' : 'px-8 py-5')}>
          <div className="mb-2 flex items-center gap-2">
            {mobile && (
              <button
                onClick={() => setMobileShowDetail(false)}
                className="text-panel-muted hover:text-panel-foreground -ml-1 flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
                aria-label="Back to threads"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-panel-foreground text-base font-semibold text-balance">
              {selected.thread.title}
            </h1>
          </div>

          {/* Respond order strip */}
          {selected.memberOrder.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selected.memberOrder.map((memberId) => {
                const m = getMemberById(memberId);
                const isActive = memberId === respondingMemberId;
                return (
                  <div
                    key={memberId}
                    title={m?.name ?? memberId}
                    className={cn(
                      'relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm font-mono text-[8px] font-bold transition-all',
                      isActive
                        ? 'bg-panel-chrome-strong text-panel-inverse ring-status-generating animate-pulse ring-1'
                        : 'bg-panel-chrome text-panel-chrome-foreground opacity-60'
                    )}
                  >
                    {m?.avatarUrl ? (
                      <Image
                        src={m.avatarUrl}
                        alt={m.name ?? memberId}
                        width={20}
                        height={20}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (m?.initials ?? memberId.slice(0, 2).toUpperCase())
                    )}
                  </div>
                );
              })}
              {respondingMember && (
                <ChromeLabel className="text-status-generating ml-1 text-[10px] tracking-[0.06em] normal-case">
                  {respondingMember.name} is responding...
                </ChromeLabel>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {selected.messages.map((msg) => {
            const timestamp = formatTime(msg.created_at);

            if (msg.sender_id === 'founder') {
              return (
                <div
                  key={msg.id}
                  className="group border-panel-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0"
                >
                  <div className="mb-1.5 flex items-center gap-2.5">
                    {profile.avatarDataUrl ? (
                      <Image
                        src={profile.avatarDataUrl}
                        alt={profile.name || 'Luke'}
                        width={24}
                        height={24}
                        unoptimized
                        className="h-6 w-6 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="bg-panel-chrome flex h-6 w-6 shrink-0 items-center justify-center rounded-sm">
                        <span className="text-panel-chrome-foreground font-mono text-[9px] font-bold">
                          {profile.initials || 'LH'}
                        </span>
                      </div>
                    )}
                    <span className="text-panel-foreground text-xs font-semibold">
                      {profile.name || 'Luke'}
                    </span>
                    <ChromeLabel className="text-panel-faint text-[10px] tracking-[0.08em] normal-case">
                      {timestamp}
                    </ChromeLabel>
                  </div>
                  <p className="text-panel-foreground pl-8.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              );
            }

            const senderMember = getMemberById(msg.sender_id);

            return (
              <div
                key={msg.id}
                className="group bg-ai-surface border-b-ai-border border-l-status-generating flex flex-col gap-1 border-b border-l-2 px-6 py-4 last:border-b-0"
              >
                <div className="mb-1.5 flex items-center gap-2.5">
                  {senderMember?.avatarUrl ? (
                    <Image
                      src={senderMember.avatarUrl}
                      alt={msg.sender_name ?? msg.sender_id}
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <div className="bg-panel-chrome-strong flex h-6 w-6 shrink-0 items-center justify-center rounded-sm">
                      <span className="text-panel-inverse font-mono text-[9px] font-bold">
                        {msg.sender_initials ?? '??'}
                      </span>
                    </div>
                  )}
                  <span className="text-panel-foreground text-xs font-semibold">
                    {msg.sender_name ?? msg.sender_id}
                  </span>
                  <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1 py-0.5 tracking-[0.08em]">
                    AI
                  </ChromeLabel>
                  <ChromeLabel className="text-panel-faint text-[10px] tracking-[0.08em] normal-case">
                    {timestamp}
                  </ChromeLabel>
                  <LogDecisionButton
                    messageContent={msg.content}
                    memberId={msg.sender_id}
                    conversationId={selected.thread.id}
                  />
                  <LogOrgMemoryButton
                    messageContent={msg.content}
                    memberId={msg.sender_id}
                    conversationId={selected.thread.id}
                  />
                </div>
                <div className="pl-8.5">
                  <div className="prose prose-sm max-w-none">
                    <Markdown id={msg.id}>{msg.content}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Live responding indicator */}
          {respondingMember && (
            <div className="bg-ai-surface border-l-status-generating flex flex-col gap-1 border-b border-l-2 px-6 py-4">
              <div className="mb-1.5 flex items-center gap-2.5">
                {respondingMember.avatarUrl ? (
                  <Image
                    src={respondingMember.avatarUrl}
                    alt={respondingMember.name}
                    width={24}
                    height={24}
                    unoptimized
                    className="h-6 w-6 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="bg-panel-chrome-strong flex h-6 w-6 shrink-0 items-center justify-center rounded-sm">
                    <span className="text-panel-inverse font-mono text-[9px] font-bold">
                      {respondingMember.initials}
                    </span>
                  </div>
                )}
                <span className="text-panel-foreground text-xs font-semibold">
                  {respondingMember.name}
                </span>
                <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1 py-0.5 tracking-[0.08em]">
                  AI
                </ChromeLabel>
                <ChromeLabel className="text-status-generating text-[10px] tracking-[0.08em] normal-case">
                  — generating
                </ChromeLabel>
              </div>
              <div className="pl-8.5">
                <ThinkingDots />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Reply input */}
        <div className="border-panel-border border-t px-6 py-4">
          <div className="border-panel-border bg-panel-input flex items-end gap-3 rounded-sm border px-4 py-3">
            <textarea
              value={replyValue}
              onChange={(e) => setReplyValue(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              disabled={inputDisabled}
              placeholder={isSequenceRunning ? 'Team is responding...' : 'Reply to thread...'}
              rows={1}
              className="text-panel-foreground placeholder:text-panel-muted flex-1 resize-none bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={inputDisabled || !replyValue.trim()}
              className="text-panel-muted hover:text-panel-foreground shrink-0 transition-colors disabled:opacity-30"
              aria-label="Send reply"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ——— Main render ———

  return (
    <>
      <div className="bg-panel flex h-full">
        {/* Mobile: single-pane list / detail */}
        <div className="flex h-full w-full flex-col md:hidden">
          {!mobileShowDetail ? renderThreadList(true) : renderThreadDetail(true)}
        </div>

        {/* Desktop: split-pane */}
        <div className="hidden h-full w-full md:flex">
          {renderThreadList()}
          <div className="flex flex-1 flex-col overflow-hidden">{renderThreadDetail()}</div>
        </div>
      </div>

      {/* New thread sheet */}
      <Sheet
        open={newSheetOpen}
        onOpenChange={(open) => {
          if (creating) return;
          setNewSheetOpen(open);
          if (!open) resetNewForm();
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Thread</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 pt-2 pb-8">
            {/* Title */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Title
              </label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Thread topic"
                className={FIELD_CLASS}
              />
            </div>

            {/* Brief */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Brief
              </label>
              <textarea
                value={newBrief}
                onChange={(e) => setNewBrief(e.target.value)}
                placeholder="Context, question, or decision for the team."
                rows={4}
                className={cn(FIELD_CLASS, 'resize-none')}
              />
            </div>

            {/* Preset selector */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Thread Type
              </label>
              <div className="flex flex-wrap gap-2">
                {(['strategy', 'technical', 'design', 'launch', 'custom'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (type === 'custom') {
                        // Materialise current preset as drag order
                        if (threadType !== 'custom') {
                          setDragOrder(resolvePresetOrder(threadType));
                        }
                      } else {
                        setDragOrder(resolvePresetOrder(type));
                      }
                      setThreadType(type);
                    }}
                    className={cn(
                      'rounded-sm px-3 py-1.5 text-[11px] font-medium transition-colors',
                      threadType === type
                        ? 'bg-sidebar-ring text-sidebar-foreground'
                        : 'bg-sidebar-hover text-sidebar-muted hover:text-sidebar-foreground'
                    )}
                  >
                    {PRESET_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Member sequence — drag to reorder */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Sequence
              </label>
              <div className="flex flex-col gap-1">
                {sheetMemberOrder.map((memberId, idx) => {
                  const m = getMemberById(memberId);
                  if (!m) return null;
                  return (
                    <div key={memberId}>
                      {dropIndex === idx && (
                        <div className="bg-sidebar-foreground/50 mx-2 my-0.5 h-0.5 rounded-full" />
                      )}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStartSwitch(idx, e)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        className="border-sidebar-ring hover:border-sidebar-primary flex cursor-grab items-center gap-2.5 rounded-sm border px-3 py-2 transition-colors active:cursor-grabbing"
                      >
                        <span className="text-sidebar-muted w-4 shrink-0 text-center font-mono text-[10px]">
                          {idx + 1}
                        </span>
                        <div className="bg-sidebar-ring flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm">
                          {m.avatarUrl ? (
                            <Image
                              src={m.avatarUrl}
                              alt={m.name}
                              width={20}
                              height={20}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sidebar-foreground font-mono text-[8px] font-bold">
                              {m.initials}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sidebar-foreground text-[12px] font-medium">
                            {m.name}
                          </p>
                          <p className="text-sidebar-muted truncate text-[10px]">{m.role}</p>
                        </div>
                      </div>
                      {dropIndex === sheetMemberOrder.length &&
                        idx === sheetMemberOrder.length - 1 && (
                          <div className="bg-sidebar-foreground/50 mx-2 my-0.5 h-0.5 rounded-full" />
                        )}
                    </div>
                  );
                })}
              </div>
            </div>

            {createError && <p className="text-[12px] text-red-400">{createError}</p>}

            <button
              onClick={handleCreateThread}
              disabled={creating || !newTitle.trim() || !newBrief.trim()}
              className="bg-sidebar-ring text-sidebar-foreground hover:bg-sidebar-hover mt-2 rounded-sm py-2.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Starting...' : 'Start Thread'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
