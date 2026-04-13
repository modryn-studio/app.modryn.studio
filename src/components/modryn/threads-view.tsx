'use client';

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useDraft } from '@/hooks/use-draft';
import Image from 'next/image';
import { ChatContainerRoot, ChatContainerContent } from '@/components/prompt-kit/chat-container';
import { ScrollButton } from '@/components/prompt-kit/scroll-button';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { LogDecisionButton } from '@/components/modryn/log-decision-button';
import { LogOrgMemoryButton } from '@/components/modryn/log-org-memory-button';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Sheet } from '@/components/ui/sheet';
import { ActionSheet } from '@/components/ui/action-sheet';
import { ModalShell, SHEET_FIELD_CLASS } from '@/components/ui/modal-shell';
import { useMembers } from '@/hooks/use-members';
import { useProfile } from '@/lib/use-profile';
import { cn } from '@/lib/utils';

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
  brainstorm: ['Marc', 'Jobs', 'Munger', 'Michelle', 'Rams'],
};

const PRESET_LABELS: Record<string, string> = {
  strategy: 'Strategy',
  technical: 'Technical',
  design: 'Design',
  launch: 'Launch',
  brainstorm: 'Brainstorm',
  custom: 'Custom',
};

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

function ThreadListSkeleton() {
  return (
    <div className="flex flex-col">
      {[72, 56, 64].map((h, i) => (
        <div key={i} className="border-panel-border space-y-2 border-b px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div
              className="bg-panel-border h-2.5 animate-pulse rounded"
              style={{ width: `${h}%` }}
            />
            <div className="bg-panel-border h-2 w-10 shrink-0 animate-pulse rounded" />
          </div>
          <div className="bg-panel-border h-2 w-3/4 animate-pulse rounded" />
        </div>
      ))}
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

function AttachmentChip({ name, content }: { name: string; content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-sidebar-ring overflow-hidden rounded-sm border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-sidebar-hover flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors"
      >
        <FileText className="text-sidebar-muted h-3 w-3 shrink-0" />
        <span className="text-sidebar-muted font-mono text-[10px]">{name}</span>
        <ChevronDown
          className={cn(
            'text-sidebar-muted ml-auto h-3 w-3 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="border-sidebar-ring max-h-64 overflow-y-auto border-t px-3 py-2">
          <pre className="text-sidebar-muted font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ——— Main component ———

export function ThreadsView() {
  const { members } = useMembers();
  const { profile } = useProfile();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selected, setSelected] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [respondingMemberId, setRespondingMemberId] = useState<string | null>(null);
  // Accumulates token text from the active stream — displayed in the generating bubble.
  // Cleared to '' before each member starts and after their message is pushed to msgs.
  const [streamingText, setStreamingText] = useState('');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [replyValue, setReplyValue] = useDraft(`thread-${selected?.thread.id ?? 'none'}`);
  const [sendingReply, setSendingReply] = useState(false);
  const [replyExcluded, setReplyExcluded] = useState<Set<string>>(new Set());
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [confirmDeleteThreadId, setConfirmDeleteThreadId] = useState<string | null>(null);
  const [longPressSheetMsgId, setLongPressSheetMsgId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Proposal/approval state — proposed decisions and tasks after each respond sequence
  const [pendingProposals, setPendingProposals] = useState<{
    decisions: { title: string; description: string }[];
    tasks: { title: string; description: string; assigned_to: string }[];
  } | null>(null);
  // Tracks which proposal item is currently being confirmed (key = 'decision-N' | 'task-N')
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  // Per-task member overrides keyed by task index — allows correcting Haiku's assignment before confirming
  const [taskAssignOverrides, setTaskAssignOverrides] = useState<Record<number, string>>({});
  // True while the on-demand synthesize button is calling decisions-draft
  const [synthesizing, setSynthesizing] = useState(false);

  // Clear any pending long-press timer on unmount to prevent state updates after unmount.
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  function handleCopyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId((prev) => (prev === id ? null : prev)), 1500);
  }

  async function handleDeleteThread(threadId: string) {
    if (confirmDeleteThreadId !== threadId) {
      // First click — enter confirm state, auto-reset after 3s
      setConfirmDeleteThreadId(threadId);
      setTimeout(() => setConfirmDeleteThreadId((prev) => (prev === threadId ? null : prev)), 3000);
      return;
    }
    // Second click — execute
    setConfirmDeleteThreadId(null);
    setDeletingThreadId(threadId);
    try {
      await fetch(`/api/threads/${threadId}`, { method: 'DELETE' });
      if (selected?.thread.id === threadId) {
        setSelected(null);
        setMobileShowDetail(false);
      }
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } finally {
      setDeletingThreadId(null);
    }
  }

  // New thread form
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBrief, setNewBrief] = useState('');
  const [threadType, setThreadType] = useState<
    'strategy' | 'technical' | 'design' | 'launch' | 'brainstorm' | 'custom'
  >('strategy');
  const [dragOrder, setDragOrder] = useState<string[]>([]);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const dragSource = useRef<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);
  const [excludedMembers, setExcludedMembers] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard against concurrent respond sequences
  const respondingRef = useRef(false);
  // Tracks whether we've done the initial auto-open so subsequent thread list
  // refreshes (after create/delete) don't clobber the user's current selection.
  const hasAutoOpenedRef = useRef(false);

  // Load threads on mount
  useEffect(() => {
    fetchThreads();
  }, []);

  // Auto-open the most recent thread on initial mount — once only.
  useEffect(() => {
    if (!loadingThreads && threads.length > 0 && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      handleSelectThread(threads[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingThreads, threads]);

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

  // Elapsed-seconds timer — resets each time a new member starts responding
  useEffect(() => {
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (respondingMemberId) {
      setElapsedSeconds(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [respondingMemberId]);

  // ——— Data fetching ———

  async function fetchThreads() {
    try {
      const res = await fetch('/api/threads');
      if (!res.ok) return;
      const data = await res.json();
      setThreads(data.threads ?? []);
    } catch {
      // silent — thread list is best-effort
    } finally {
      setLoadingThreads(false);
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
    const base =
      threadType === 'custom'
        ? dragOrder.length > 0
          ? dragOrder
          : members.map((m) => m.id)
        : resolvePresetOrder(threadType);
    return base.filter((id) => !excludedMembers.has(id));
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
      setStreamingText('');
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

        // Idempotent path returns JSON; new responses return an AI SDK data stream.
        // Detect by Content-Type to avoid consuming the body twice.
        if (res.headers.get('content-type')?.includes('application/json')) {
          // Already responded — return existing message directly
          const { message } = (await res.json()) as { message: ThreadMessage };
          msgs = [...msgs, message];
          lastSuccessfulResponderId = memberId;
          setSelected((prev) => (prev ? { ...prev, messages: msgs } : prev));
        } else {
          // New response — read the plain text stream manually, accumulating token text.
          // toTextStreamResponse emits raw text chunks; no protocol framing.
          // The stream does not close until onFinish (and DB write) completes server-side,
          // so reading to done guarantees the DB row exists before the next member starts.
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setStreamingText(accumulated);
          }
          // Flush any bytes buffered by the decoder for multi-byte characters
          // split across chunk boundaries (e.g. UTF-8 emoji or non-ASCII text).
          const trailing = decoder.decode();
          if (trailing) {
            accumulated += trailing;
            setStreamingText(accumulated);
          }
          // Stream closed = DB write committed. Build the temp message and advance.
          const streamedMsg: ThreadMessage = {
            id: `streamed-${memberId}-${Date.now()}`,
            sender_id: memberId,
            sender_name: member?.name ?? memberId,
            sender_initials: member?.initials ?? '?',
            sender_role: member?.role ?? null,
            role: 'assistant',
            content: accumulated,
            created_at: new Date().toISOString(),
          };
          msgs = [...msgs, streamedMsg];
          lastSuccessfulResponderId = memberId;
          setStreamingText('');
          setSelected((prev) => (prev ? { ...prev, messages: msgs } : prev));
        }
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
    // Sequence done — clear responding state immediately so the last member's
    // generating indicator doesn't linger while extraction runs.
    setRespondingMemberId(null);
    respondingRef.current = false;
    // Refresh sidebar thread list to update last-message preview
    fetchThreads();
    // Re-fetch thread detail to replace in-memory temp messages with real DB rows.
    // Temp messages lack the <sources> block appended by onFinish for web search
    // responses, so citations would be invisible without this refresh.
    // Guard: only update selected if the user is still viewing this thread —
    // a long Michelle search (2+ min) could complete after the user navigated away.
    const refreshed = await fetchThreadDetail(threadId);
    if (refreshed) setSelected((prev) => (prev?.thread.id === threadId ? refreshed : prev));
    // Fire org-fact extraction in the background — non-critical, never awaited.
    if (lastSuccessfulResponderId) {
      fetch(`/api/threads/${threadId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: lastSuccessfulResponderId }),
      }).catch(() => {
        // Extraction failure is non-critical
      });
    }
    // Fetch proposed decisions + tasks for this round — shown inline for approval.
    // Awaited so proposals appear before the UI returns to idle.
    try {
      const draftRes = await fetch(`/api/threads/${threadId}/decisions-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (draftRes.ok) {
        const draft = (await draftRes.json()) as {
          decisions: { title: string; description: string }[];
          tasks: { title: string; description: string; assigned_to: string }[];
        };
        if (draft.decisions.length > 0 || draft.tasks.length > 0) {
          setPendingProposals(draft);
        }
      }
    } catch {
      // Draft failure is non-critical — proposals just won't appear
    }
  }

  // ——— Thread selection ———

  async function handleSelectThread(threadId: string) {
    if (respondingRef.current) return; // Don't switch mid-sequence
    setMobileShowDetail(true);
    setLoading(true);
    setSelected(null);
    setReplyExcluded(new Set()); // Clear per-reply exclusions from previous thread
    setPendingProposals(null); // Clear proposals from previous thread
    setTaskAssignOverrides({});

    const data = await fetchThreadDetail(threadId);
    if (!data) {
      setLoading(false);
      return;
    }
    setSelected(data);
    setLoading(false);

    // Fire respond sequence only when the last message is from the founder and no member
    // has responded yet. This covers newly created threads opened for the first time.
    // The /respond route is idempotent so duplicate calls are safe.
    // No auto-resume on partial sequences — refresh loads current state only.
    const lastMsg = data.messages[data.messages.length - 1];
    if (lastMsg && lastMsg.sender_id === 'founder') {
      await runRespondSequence(threadId, data.memberOrder, data.messages);
    }
  }

  // ——— Reply ———

  async function handleSendReply() {
    if (!replyValue.trim() || respondingMemberId || !selected || sendingReply) return;
    const content = replyValue.trim();
    setReplyValue('');
    if (replyInputRef.current) replyInputRef.current.style.height = 'auto';
    setSendingReply(true);
    setPendingProposals(null); // Clear previous round's proposals before starting a new round
    setTaskAssignOverrides({});
    // Capture excluded set at send-time — replyExcluded state resets in finally after the sequence
    const excludedAtSend = new Set(replyExcluded);
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
      const filteredOrder = selected.memberOrder.filter((id) => !excludedAtSend.has(id));
      await runRespondSequence(selected.thread.id, filteredOrder, msgs);
      // Reset exclusions only after the sequence fully resolves — not on failure/early return,
      // so the user can retry without re-toggling.
      setReplyExcluded(new Set());
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
    if (!newBrief.trim() && attachedFiles.length === 0) return;
    setCreating(true);
    setCreateError('');
    try {
      const memberOrder = getEffectiveOrder();
      const parts = [
        newBrief.trim(),
        ...attachedFiles.map((f) => `---\n**${f.name}**\n\n${f.content}`),
      ].filter(Boolean);
      const brief = parts.join('\n\n');
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          brief,
          memberOrder,
        }),
      });
      if (!res.ok) {
        setCreateError('Failed to create thread.');
        setCreating(false);
        return;
      }
      const { threadId } = (await res.json()) as { threadId: string; memberOrder: string[] };
      await fetchThreads();
      // Keep sheet open while detail loads — closes once data is ready
      // 7s timeout so the user is never trapped if the GET fails or hangs
      const data = await Promise.race([
        fetchThreadDetail(threadId),
        new Promise<ThreadDetail | null>((resolve) => setTimeout(() => resolve(null), 7000)),
      ]);
      setNewSheetOpen(false);
      resetNewForm();
      if (data) {
        setMobileShowDetail(true);
        setSelected(data);
        await runRespondSequence(threadId, data.memberOrder, data.messages);
      } else {
        // Timed out or failed — fall back to full selection flow
        await handleSelectThread(threadId);
      }
    } catch {
      setCreateError('Failed to create thread.');
    } finally {
      setCreating(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
  }

  function resetNewForm() {
    setNewTitle('');
    setNewBrief('');
    setThreadType('strategy');
    setDragOrder(members.map((m) => m.id));
    setCreateError('');
    setAttachedFiles([]);
    setExcludedMembers(new Set());
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
        {loadingThreads ? (
          <ThreadListSkeleton />
        ) : threads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-5 py-10 text-center">
            <ChromeLabel className="text-panel-muted mb-2 text-[10px] tracking-widest">
              No threads yet
            </ChromeLabel>
            <p className="text-panel-muted text-xs">Start one to run a team discussion.</p>
          </div>
        ) : null}
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={cn(
              'group border-panel-border hover:bg-panel-selected/70 relative w-full border-b transition-colors',
              selected?.thread.id === thread.id && 'bg-panel-selected'
            )}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectThread(thread.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSelectThread(thread.id);
              }}
              className="w-full cursor-pointer px-5 py-4 text-left"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-panel-foreground truncate text-xs font-semibold">
                  {thread.title || <span className="text-panel-faint italic">Untitled</span>}
                </span>
                <ChromeLabel className="text-panel-faint shrink-0 text-[10px] tracking-[0.08em] normal-case">
                  {formatDate(thread.updated_at)}
                </ChromeLabel>
              </div>
              {isSequenceRunning && selected?.thread.id === thread.id ? (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="bg-status-generating h-1.5 w-1.5 animate-pulse rounded-full" />
                  <ChromeLabel className="text-panel-faint text-[10px] tracking-[0.08em] normal-case">
                    responding...
                  </ChromeLabel>
                </div>
              ) : thread.last_message ? (
                <p className="text-panel-muted truncate text-[10px] leading-relaxed">
                  {thread.last_message}
                </p>
              ) : null}
              <div className="mt-1.5 flex items-center justify-between">
                <ChromeLabel className="text-panel-faint text-[10px] tracking-[0.08em]">
                  {thread.participant_count} MEMBERS
                </ChromeLabel>
                {/* Delete thread button — hover to reveal, two-click confirm */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteThread(thread.id);
                  }}
                  disabled={deletingThreadId === thread.id}
                  title={confirmDeleteThreadId === thread.id ? 'Confirm delete' : 'Delete thread'}
                  className={cn(
                    'rounded-sm p-0.5 transition-colors disabled:opacity-30 md:opacity-0 md:group-hover:opacity-100',
                    confirmDeleteThreadId === thread.id
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-panel-faint hover:text-panel-muted'
                  )}
                >
                  {confirmDeleteThreadId === thread.id ? (
                    <X className="h-3 w-3" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
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

    // Scope "done" to the current round only (messages after the last founder message).
    // Without this, round 2 starts with all avatars already showing as done.
    const lastFounderIdx = selected.messages.reduce(
      (best, msg, i) => (msg.sender_id === 'founder' ? i : best),
      -1
    );
    const currentRoundSenderIds = new Set(
      selected.messages.slice(lastFounderIdx + 1).map((msg) => msg.sender_id)
    );

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
            <h1 className="text-panel-foreground min-w-0 flex-1 text-base font-semibold text-balance">
              {selected.thread.title || (
                <span className="text-panel-faint font-normal italic">Untitled</span>
              )}
            </h1>
            {/* Synthesize button — re-runs decisions-draft on demand for any existing thread */}
            <button
              type="button"
              disabled={isSequenceRunning || sendingReply || synthesizing}
              onClick={async () => {
                setSynthesizing(true);
                try {
                  const res = await fetch(`/api/threads/${selected.thread.id}/decisions-draft`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  if (res.ok) {
                    const draft = (await res.json()) as {
                      decisions: { title: string; description: string }[];
                      tasks: { title: string; description: string; assigned_to: string }[];
                    };
                    if (draft.decisions.length > 0 || draft.tasks.length > 0) {
                      setPendingProposals(draft);
                    }
                  }
                } finally {
                  setSynthesizing(false);
                }
              }}
              className="text-panel-faint hover:text-panel-muted shrink-0 rounded-sm p-1 transition-colors disabled:opacity-30"
              title="Synthesize decisions + tasks from this round"
              aria-label="Synthesize decisions and tasks"
            >
              {synthesizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Respond order strip */}
          {selected.memberOrder.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selected.memberOrder.map((memberId) => {
                const m = getMemberById(memberId);
                const isDone = currentRoundSenderIds.has(memberId);
                const isActive = memberId === respondingMemberId;
                const isWaiting = isSequenceRunning && !isDone && !isActive;
                const isExcluded = replyExcluded.has(memberId);
                const isInteractive = !isSequenceRunning && !sendingReply;
                return (
                  <div
                    key={memberId}
                    title={
                      isExcluded
                        ? `${m?.name ?? memberId} — excluded this cycle`
                        : (m?.name ?? memberId)
                    }
                    onClick={
                      isInteractive
                        ? () =>
                            setReplyExcluded((prev) => {
                              const next = new Set(prev);
                              next.has(memberId) ? next.delete(memberId) : next.add(memberId);
                              return next;
                            })
                        : undefined
                    }
                    className={cn(
                      'group relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-sm font-mono text-[8px] font-bold transition-all',
                      isInteractive && 'cursor-pointer',
                      isExcluded
                        ? 'bg-panel-chrome text-panel-chrome-foreground opacity-25'
                        : isActive
                          ? 'bg-panel-chrome-strong text-panel-inverse ring-status-generating animate-pulse ring-1'
                          : isDone
                            ? 'bg-panel-chrome text-panel-chrome-foreground'
                            : isWaiting
                              ? 'bg-panel-chrome text-panel-chrome-foreground opacity-40'
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
                    {/* EyeOff: always visible when excluded (idle or mid-sequence) */}
                    {isExcluded && (
                      <div className="bg-panel-chrome/85 absolute inset-0 flex items-center justify-center">
                        <EyeOff className="text-panel-muted h-2.5 w-2.5" />
                      </div>
                    )}
                    {/* Eye: hover hint when idle and not excluded */}
                    {!isExcluded && isInteractive && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="bg-panel-chrome/75 absolute inset-0" />
                        <Eye className="text-panel-muted relative h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isSequenceRunning && (
                <ChromeLabel className="text-panel-faint ml-0.5 font-mono text-[10px] tracking-[0.08em]">
                  {`${selected.memberOrder.filter((id) => currentRoundSenderIds.has(id)).length} / ${selected.memberOrder.filter((id) => !replyExcluded.has(id)).length}`}
                </ChromeLabel>
              )}
              {respondingMember && (
                <ChromeLabel className="text-status-generating ml-1 text-[10px] tracking-[0.06em] normal-case">
                  {respondingMember.name} is responding...
                </ChromeLabel>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <ChatContainerRoot className="relative flex-1">
          <ChatContainerContent>
            {selected.messages.map((msg) => {
              const timestamp = formatTime(msg.created_at);

              if (msg.sender_id === 'founder') {
                const { body: msgBody, attachments: msgAttachments } = parseMessageContent(
                  msg.content
                );
                return (
                  <div
                    key={msg.id}
                    className="group border-panel-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0"
                    onTouchStart={() => {
                      longPressTimerRef.current = setTimeout(
                        () => setLongPressSheetMsgId(msg.id),
                        500
                      );
                    }}
                    onTouchEnd={() => {
                      if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                    }}
                    onTouchMove={() => {
                      if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
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
                      <div className="ml-auto hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msgBody)}
                          title="Copy"
                          className="text-panel-muted hover:text-panel-foreground rounded-sm p-1 transition-colors"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pl-8.5">
                      {msgBody && (
                        <p className="text-panel-foreground text-sm leading-relaxed whitespace-pre-wrap">
                          {msgBody}
                        </p>
                      )}
                      {msgAttachments.map((a, i) => (
                        <AttachmentChip key={i} name={a.name} content={a.content} />
                      ))}
                    </div>
                    <ActionSheet
                      open={longPressSheetMsgId === msg.id}
                      onClose={() => setLongPressSheetMsgId(null)}
                      items={[
                        {
                          label: 'Copy',
                          icon: <Copy className="h-4 w-4" />,
                          onClick: () => handleCopyMessage(msg.id, msgBody),
                        },
                      ]}
                    />
                  </div>
                );
              }

              const senderMember = getMemberById(msg.sender_id);
              const { body: msgBody, sources: msgSources } = parseSourcesBlock(msg.content);

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
                    <div className="ml-auto flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msgBody)}
                        title="Copy"
                        className="text-panel-muted hover:text-panel-foreground rounded-sm p-1 transition-colors"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <LogDecisionButton
                        messageContent={msgBody}
                        memberId={msg.sender_id}
                        conversationId={selected.thread.id}
                      />
                      <LogOrgMemoryButton
                        messageContent={msgBody}
                        memberId={msg.sender_id}
                        conversationId={selected.thread.id}
                      />
                    </div>
                  </div>
                  <div className="pl-8.5">
                    <div className="prose prose-sm max-w-none">
                      <Markdown id={msg.id}>{msgBody}</Markdown>
                    </div>
                    {msgSources.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <ChromeLabel className="text-panel-faint text-[10px] tracking-widest">
                          Sources
                        </ChromeLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {msgSources.map((s, i) => {
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
            })}

            {/* Live responding indicator */}
            {respondingMember && (
              <div className="bg-ai-surface border-l-status-generating flex flex-col gap-1 border-b border-l-2 px-6 py-4 last:border-b-0">
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
                  {!streamingText && (
                    <ChromeLabel className="text-status-generating text-[10px] tracking-[0.08em] normal-case">
                      — generating
                    </ChromeLabel>
                  )}
                </div>
                <div className="pl-8.5">
                  {streamingText ? (
                    // Tokens are arriving — render live Markdown
                    <div className="prose prose-sm max-w-none">
                      <Markdown id={`streaming-${respondingMember.id}`}>{streamingText}</Markdown>
                    </div>
                  ) : (
                    // Waiting for first token — show dots + elapsed timer
                    <>
                      <ThinkingDots />
                      {respondingMember.id === 'michelle-lim' && (
                        <p className="text-panel-faint font-mono text-[11px]">
                          searching the web...
                        </p>
                      )}
                      <ChromeLabel className="text-panel-faint mt-1 font-mono text-[10px] tracking-[0.08em]">
                        {elapsedSeconds}s
                      </ChromeLabel>
                    </>
                  )}
                </div>
              </div>
            )}
          </ChatContainerContent>
          <div className="absolute right-4 bottom-4 z-10">
            <ScrollButton className="bg-panel-input border-panel-border text-panel-muted hover:text-panel-foreground" />
          </div>
        </ChatContainerRoot>

        {/* Proposals panel — decisions and tasks proposed by Haiku after each respond sequence */}
        {pendingProposals &&
          (pendingProposals.decisions.length > 0 || pendingProposals.tasks.length > 0) && (
            <div className="border-panel-border bg-ai-surface max-h-[45vh] shrink-0 overflow-y-auto border-t">
              {pendingProposals.decisions.length > 0 && (
                <div
                  className={cn(
                    'px-6 py-3',
                    pendingProposals.tasks.length > 0 && 'border-panel-border border-b'
                  )}
                >
                  <ChromeLabel className="text-secondary mb-2 block text-[10px] tracking-widest">
                    Decisions
                  </ChromeLabel>
                  <div className="flex flex-col gap-2">
                    {pendingProposals.decisions.map((d, i) => {
                      const key = `decision-${i}`;
                      const isConfirming = confirmingKey === key;
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-panel-foreground text-sm leading-snug">{d.title}</p>
                            {d.description && (
                              <p className="text-panel-muted mt-0.5 text-xs leading-relaxed">
                                {d.description}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 pt-0.5">
                            {/* Intentionally raw <button> — non-standard icon-only shape */}
                            <button
                              type="button"
                              disabled={!!confirmingKey}
                              onClick={async () => {
                                setConfirmingKey(key);
                                try {
                                  await fetch('/api/decisions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      title: d.title,
                                      description: d.description,
                                      conversationId: selected?.thread.id,
                                      loggedBy: 'founder',
                                    }),
                                  });
                                  setPendingProposals((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          decisions: prev.decisions.filter((_, j) => j !== i),
                                        }
                                      : null
                                  );
                                } finally {
                                  setConfirmingKey(null);
                                }
                              }}
                              className="text-panel-faint hover:text-status-online rounded-sm p-1 transition-colors disabled:opacity-40"
                              aria-label="Confirm decision"
                            >
                              {isConfirming ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={!!confirmingKey}
                              onClick={() =>
                                setPendingProposals((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        decisions: prev.decisions.filter((_, j) => j !== i),
                                      }
                                    : null
                                )
                              }
                              className="text-panel-faint hover:text-panel-muted rounded-sm p-1 transition-colors disabled:opacity-40"
                              aria-label="Dismiss decision"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {pendingProposals.tasks.length > 0 && (
                <div className="px-6 py-3">
                  <ChromeLabel className="text-secondary mb-2 block text-[10px] tracking-widest">
                    Tasks
                  </ChromeLabel>
                  <div className="flex flex-col gap-2">
                    {pendingProposals.tasks.map((t, i) => {
                      const key = `task-${i}`;
                      const isConfirming = confirmingKey === key;
                      return (
                        <div key={i} className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-panel-foreground text-sm leading-snug">{t.title}</p>
                            <div className="text-panel-muted mt-0.5 flex flex-wrap items-center gap-x-1 text-xs leading-relaxed">
                              <select
                                value={taskAssignOverrides[i] ?? t.assigned_to}
                                onChange={(e) =>
                                  setTaskAssignOverrides((prev) => ({
                                    ...prev,
                                    [i]: e.target.value,
                                  }))
                                }
                                className="text-panel-muted cursor-pointer bg-transparent text-xs outline-none"
                              >
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                                <option value="founder">{profile?.name || 'Founder'}</option>
                              </select>
                              {t.description && <span> — {t.description}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 pt-0.5">
                            {/* Intentionally raw <button> — non-standard icon-only shape */}
                            <button
                              type="button"
                              disabled={!!confirmingKey}
                              onClick={async () => {
                                setConfirmingKey(key);
                                try {
                                  await fetch('/api/tasks', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      title: t.title,
                                      description: t.description,
                                      assigned_to: taskAssignOverrides[i] ?? t.assigned_to,
                                      conversationId: selected?.thread.id,
                                    }),
                                  });
                                  setPendingProposals((prev) =>
                                    prev
                                      ? { ...prev, tasks: prev.tasks.filter((_, j) => j !== i) }
                                      : null
                                  );
                                } finally {
                                  setConfirmingKey(null);
                                }
                              }}
                              className="text-panel-faint hover:text-status-online rounded-sm p-1 transition-colors disabled:opacity-40"
                              aria-label="Confirm task"
                            >
                              {isConfirming ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={!!confirmingKey}
                              onClick={() =>
                                setPendingProposals((prev) =>
                                  prev
                                    ? { ...prev, tasks: prev.tasks.filter((_, j) => j !== i) }
                                    : null
                                )
                              }
                              className="text-panel-faint hover:text-panel-muted rounded-sm p-1 transition-colors disabled:opacity-40"
                              aria-label="Dismiss task"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Reply input */}
        <div className="border-panel-border border-t px-6 py-4">
          <div className="border-panel-border bg-panel-input focus-within:border-sidebar-accent focus-within:ring-sidebar-accent/10 flex items-end gap-3 rounded-sm border px-4 py-3 transition-colors focus-within:ring-4">
            <textarea
              ref={replyInputRef}
              value={replyValue}
              onChange={(e) => setReplyValue(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              disabled={inputDisabled}
              placeholder={isSequenceRunning ? 'Team is responding...' : 'Reply to thread...'}
              rows={1}
              className="text-panel-foreground placeholder:text-panel-faint flex-1 resize-none bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              className="bg-panel-foreground hover:bg-panel-foreground/80 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-30"
              aria-label="Send reply"
            >
              {sendingReply ? (
                <ThinkingDots />
              ) : (
                <Send className="text-panel-inverse h-3.5 w-3.5" />
              )}
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
        <ModalShell title="New Thread">
          <div className="flex flex-col gap-6 overflow-y-auto px-6 pt-8 pb-6">
            {/* Title */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Title
              </label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Thread topic"
                className={SHEET_FIELD_CLASS}
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
                className={cn(SHEET_FIELD_CLASS, 'resize-none')}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sidebar-muted hover:text-sidebar-foreground flex items-center gap-1 text-[11px] transition-colors"
                >
                  <Paperclip className="h-3 w-3" />
                  Attach
                </button>
                {attachedFiles.map((f, i) => (
                  <span
                    key={i}
                    className="bg-sidebar-hover text-sidebar-foreground flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-[10px]"
                  >
                    {f.name}
                    <button
                      type="button"
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="text-sidebar-muted hover:text-sidebar-foreground ml-0.5 leading-none"
                      aria-label={`Remove ${f.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Preset selector */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Thread Type
              </label>
              <div className="flex flex-wrap gap-2">
                {(
                  ['strategy', 'technical', 'design', 'launch', 'brainstorm', 'custom'] as const
                ).map((type) => (
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

            {/* Member sequence — drag to reorder, click eye to exclude */}
            <div>
              <label className="text-sidebar-muted mb-2 block text-[10px] font-semibold tracking-widest uppercase">
                Sequence
              </label>
              <div className="flex flex-col gap-1">
                {sheetMemberOrder.map((memberId, idx) => {
                  const m = getMemberById(memberId);
                  if (!m) return null;
                  const isExcluded = excludedMembers.has(memberId);
                  // Sequence number: count of non-excluded members before this one in the render list
                  // Computed fresh from live state on every render — no stored index
                  const seqNum = isExcluded
                    ? null
                    : sheetMemberOrder.slice(0, idx).filter((id) => !excludedMembers.has(id))
                        .length + 1;
                  return (
                    <div key={memberId}>
                      {dropIndex === idx && (
                        <div className="bg-sidebar-foreground/50 mx-2 my-0.5 h-0.5 rounded-full" />
                      )}
                      <div
                        draggable={!isExcluded}
                        onDragStart={!isExcluded ? (e) => handleDragStartSwitch(idx, e) : undefined}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'border-sidebar-ring flex items-center gap-2.5 rounded-sm border px-3 py-2 transition-colors',
                          isExcluded
                            ? 'cursor-default opacity-40'
                            : 'hover:border-sidebar-primary cursor-grab active:cursor-grabbing'
                        )}
                      >
                        <span className="text-sidebar-muted w-4 shrink-0 text-center font-mono text-[10px]">
                          {seqNum ?? '—'}
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
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-[12px] font-medium',
                              isExcluded ? 'text-sidebar-muted' : 'text-sidebar-foreground'
                            )}
                          >
                            {m.name}
                          </p>
                          <p className="text-sidebar-muted truncate text-[10px]">{m.role}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExcludedMembers((prev) => {
                              const next = new Set(prev);
                              if (next.has(memberId)) {
                                next.delete(memberId);
                              } else {
                                next.add(memberId);
                              }
                              return next;
                            })
                          }
                          className="text-sidebar-muted hover:text-sidebar-foreground ml-1 shrink-0 transition-colors"
                          aria-label={isExcluded ? `Include ${m.name}` : `Exclude ${m.name}`}
                        >
                          {isExcluded ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>
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
              disabled={
                creating ||
                (!newBrief.trim() && attachedFiles.length === 0) ||
                getEffectiveOrder().length === 0
              }
              className="bg-sidebar-ring text-sidebar-foreground hover:bg-sidebar-hover mt-2 rounded-sm py-2.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Starting...' : 'Start Thread'}
            </button>
          </div>
        </ModalShell>
      </Sheet>
    </>
  );
}
