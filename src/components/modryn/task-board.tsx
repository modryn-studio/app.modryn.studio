'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Copy, Loader2, Play, Plus, X } from 'lucide-react';
import Image from 'next/image';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { Markdown } from '@/components/prompt-kit/markdown';
import { useMembers, type AIMember } from '@/hooks/use-members';
import { useProfile } from '@/lib/use-profile';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  output: string | null;
  conversation_id: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<Task['status'], string> = {
  pending: 'pending',
  in_progress: 'in progress',
  done: 'done',
  blocked: 'blocked',
};

const STATUS_COLORS: Record<Task['status'], string> = {
  pending: 'text-panel-faint',
  in_progress: 'text-status-generating', // matches DM '— generating' + thread 'responding...' color
  done: 'text-status-online',
  blocked: 'text-red-400',
};

// Skeleton shimmer — matches ThreadListSkeleton pattern. Keeps the header visible during load.
function TaskBoardSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6">
      {[85, 60, 75].map((w, i) => (
        <div key={i} className="border-panel-border rounded-sm border px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="bg-panel-border mt-0.5 h-7 w-7 shrink-0 animate-pulse rounded-sm" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div
                className="bg-panel-border h-2.5 animate-pulse rounded"
                style={{ width: `${w}%` }}
              />
              <div className="bg-panel-border h-2 w-2/5 animate-pulse rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  members,
  founderName,
  founderInitials,
  founderAvatarDataUrl,
  onExecuted,
}: {
  task: Task;
  members: AIMember[];
  founderName: string;
  founderInitials: string;
  founderAvatarDataUrl?: string;
  onExecuted: (id: string, output: string) => void;
}) {
  const [executing, setExecuting] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!task.output) return;
    navigator.clipboard.writeText(task.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  const [executeError, setExecuteError] = useState<string | null>(null);

  // Prefer task.status from parent when it's already 'done' — avoids a one-render
  // flash of 'in_progress' caused by the local `executing` flag settling after onExecuted fires.
  const displayStatus: Task['status'] =
    task.status === 'done' ? 'done' : executing ? 'in_progress' : task.status;
  const hasOutput = !!task.output;

  const isFounder = task.assigned_to === 'founder';
  const assignedMember = isFounder ? null : members.find((m) => m.id === task.assigned_to);

  async function handleExecute() {
    setExecuting(true);
    setExecuteError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/execute`, { method: 'POST' });
      if (!res.ok) {
        setExecuteError('Execution failed. Try again.');
        return;
      }
      const data = await res.json();
      if (data.output) {
        onExecuted(task.id, data.output);
        setOutputOpen(true);
      }
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div
      className={cn(
        'border-panel-border rounded-sm border',
        // Left accent while executing — matches DM AI message bubble border-l-status-generating
        executing && 'border-l-status-generating border-l-2'
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Member avatar */}
          <div className="mt-0.5 shrink-0">
            {isFounder && founderAvatarDataUrl ? (
              <Image
                src={founderAvatarDataUrl}
                alt={founderName}
                width={28}
                height={28}
                unoptimized
                className="h-7 w-7 rounded-sm object-cover"
              />
            ) : assignedMember?.avatarUrl ? (
              <Image
                src={assignedMember.avatarUrl}
                alt={assignedMember.name}
                width={28}
                height={28}
                unoptimized
                className="h-7 w-7 rounded-sm object-cover"
              />
            ) : (
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-sm',
                  isFounder ? 'bg-panel-chrome' : 'bg-panel-chrome-strong'
                )}
              >
                <span className="text-panel-chrome-foreground font-mono text-[9px] font-semibold">
                  {isFounder
                    ? founderInitials
                    : (assignedMember?.initials ?? task.assigned_to.slice(0, 2).toUpperCase())}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-panel-foreground text-sm leading-snug">{task.title}</p>
            {task.description && (
              <p className="text-panel-muted mt-0.5 text-xs leading-relaxed">{task.description}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              {/* Pulse dot — matches DM header status dot and thread respond-order ring */}
              {(executing || displayStatus === 'in_progress') && (
                <span className="bg-status-generating h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" />
              )}
              {displayStatus === 'done' && (
                <span className="bg-status-online h-1.5 w-1.5 shrink-0 rounded-full" />
              )}
              <ChromeLabel
                className={cn('text-[9px] tracking-widest', STATUS_COLORS[displayStatus])}
              >
                {STATUS_LABELS[displayStatus]}
              </ChromeLabel>
              <ChromeLabel className="text-panel-faint text-[9px]">
                {isFounder
                  ? founderName
                  : (assignedMember?.name ?? task.assigned_to_name ?? task.assigned_to)}
              </ChromeLabel>
            </div>
            {executeError && (
              <p className="text-destructive mt-1.5 font-mono text-[10px]">{executeError}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            {/* Intentionally raw <button> — non-standard icon-only shape */}
            {task.status !== 'done' && !isFounder && (
              <button
                type="button"
                disabled={executing}
                onClick={handleExecute}
                className="text-panel-faint hover:text-status-online rounded-sm p-1.5 transition-colors disabled:opacity-40"
                aria-label="Execute task"
              >
                {executing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {hasOutput && (
              <button
                type="button"
                onClick={() => setOutputOpen((v) => !v)}
                className="text-panel-faint hover:text-panel-muted rounded-sm p-1.5 transition-colors"
                aria-label={outputOpen ? 'Collapse output' : 'Expand output'}
              >
                {outputOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      {outputOpen && task.output && (
        <div className="border-panel-border bg-ai-surface border-t px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <ChromeLabel className="text-panel-faint text-[9px] tracking-widest">
              Output
            </ChromeLabel>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy"
              className="text-panel-muted hover:text-panel-foreground ml-auto rounded-sm p-1 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="prose prose-sm max-w-none">
            <Markdown>{task.output}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const { members } = useMembers();
  const { profile } = useProfile();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch {
      // Network error — keep existing tasks, loading clears in finally
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Pre-select first member once roster loads
  useEffect(() => {
    if (!newAssignedTo && members.length > 0) {
      setNewAssignedTo(members[0].id);
    }
  }, [members, newAssignedTo]);

  const handleExecuted = useCallback((id: string, output: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'done' as const, output } : t))
    );
  }, []);

  function handleOpenSheet() {
    setNewTitle('');
    setNewDescription('');
    setNewAssignedTo(members[0]?.id ?? 'founder');
    setCreateError(null);
    setSheetOpen(true);
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newAssignedTo) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          assigned_to: newAssignedTo,
          projectId,
        }),
      });
      if (!res.ok) {
        setCreateError('Could not create task. Try again.');
        return;
      }
      const data = await res.json();
      const enriched = {
        ...data.task,
        assigned_to_name:
          newAssignedTo === 'founder'
            ? null // displayed via founderName prop in TaskCard
            : (members.find((m) => m.id === newAssignedTo)?.name ?? null),
      };
      setTasks((prev) => [enriched, ...prev]);
      setSheetOpen(false);
    } catch {
      setCreateError('Could not create task. Try again.');
    } finally {
      setCreating(false);
    }
  }

  const pending = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <>
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Assign task"
            className="bg-sidebar border-sidebar-border fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-2xl sm:w-80"
          >
            <div className="border-sidebar-border flex items-center justify-between border-b px-5 py-4">
              <span className="text-sidebar-foreground text-[13px] font-medium tracking-tight">
                Assign Task
              </span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="text-sidebar-muted hover:text-sidebar-foreground rounded-sm transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="task-title"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Title
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="What needs to be done"
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="task-description"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Context
                </label>
                <textarea
                  id="task-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional background or constraints"
                  rows={3}
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-muted w-full resize-none rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="task-assignee"
                  className="text-sidebar-muted font-mono text-[9px] tracking-[0.18em] uppercase"
                >
                  Assign to
                </label>
                <select
                  id="task-assignee"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground w-full rounded-sm border px-3 py-2 text-[13px] outline-none focus:border-white/30"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  <option value="founder">{profile.name || 'Luke'} (You)</option>
                </select>
              </div>
              {createError && (
                <p className="text-destructive font-mono text-[11px]">{createError}</p>
              )}
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newAssignedTo || creating}
                className="bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 mt-auto rounded-sm px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="bg-panel flex flex-1 flex-col overflow-y-auto">
        <div className="border-panel-border flex items-center justify-between border-b px-4 py-4 sm:px-6">
          <div>
            <p className="text-panel-foreground text-sm font-medium">Tasks</p>
            <p className="text-panel-muted mt-0.5 text-xs">
              {loading ? (
                <span className="bg-panel-border inline-block h-2 w-24 animate-pulse rounded align-middle" />
              ) : (
                `${pending.length} pending · ${done.length} done`
              )}
            </p>
          </div>
          {/* Intentionally raw <button> — non-standard icon-only shape */}
          <button
            type="button"
            onClick={handleOpenSheet}
            className="text-panel-faint hover:text-panel-muted rounded-sm p-1.5 transition-colors"
            aria-label="Assign task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <TaskBoardSkeleton />
        ) : tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
            <p className="text-panel-faint font-mono text-xs">[ ]</p>
            <p className="text-panel-foreground text-sm font-medium">No tasks yet</p>
            <p className="text-panel-muted text-xs">Synthesize a thread or assign one manually.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {pending.length > 0 && (
              <div className="flex flex-col gap-2">
                <ChromeLabel className="text-panel-faint mb-1 text-[9px] tracking-widest">
                  Pending
                </ChromeLabel>
                {pending.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    founderName={profile.name || 'Luke'}
                    founderInitials={profile.initials || 'LH'}
                    founderAvatarDataUrl={profile.avatarDataUrl}
                    onExecuted={handleExecuted}
                  />
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div className="flex flex-col gap-2">
                <ChromeLabel className="text-panel-faint mb-1 text-[9px] tracking-widest">
                  Done
                </ChromeLabel>
                {done.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    founderName={profile.name || 'Luke'}
                    founderInitials={profile.initials || 'LH'}
                    founderAvatarDataUrl={profile.avatarDataUrl}
                    onExecuted={handleExecuted}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
