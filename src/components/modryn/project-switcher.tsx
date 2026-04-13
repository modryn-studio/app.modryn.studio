'use client';

import { ChevronDown, Pencil, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProjectSwitcherProps {
  projects: { id: string; name: string }[];
  activeProjectId: string | null;
  onProjectChange: (projectId: string) => void;
  onNewProject?: () => void;
  onNameChanged?: (id: string, name: string) => void;
}

export function ProjectSwitcher({
  projects,
  activeProjectId,
  onProjectChange,
  onNewProject,
  onNameChanged,
}: ProjectSwitcherProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Prevents blur from double-saving when Enter/Escape already handled the commit/cancel
  const skipBlurRef = useRef(false);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Close dropdown on outside click — if editing, save first
  useEffect(() => {
    if (!expanded) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // blur will fire after this and handle the save; just close
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [expanded]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  async function saveRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const original = projects.find((p) => p.id === id)?.name ?? '';
    if (trimmed === original) return;
    // Optimistic — notify parent immediately
    onNameChanged?.(id, trimmed);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) onNameChanged?.(id, original); // revert on failure
    } catch {
      onNameChanged?.(id, original);
    }
  }

  function startEdit(e: React.MouseEvent, p: { id: string; name: string }) {
    e.stopPropagation();
    skipBlurRef.current = false;
    setEditingId(p.id);
    setEditingName(p.name);
  }

  function handleEditKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Mark blur as handled so the upcoming unmount-blur doesn't double-save
      skipBlurRef.current = true;
      saveRename(id, editingName);
      setEditingId(null);
    } else if (e.key === 'Escape') {
      // Mark blur as handled so the upcoming unmount-blur doesn't save a cancelled edit
      skipBlurRef.current = true;
      setEditingId(null);
    }
  }

  function handleEditBlur(id: string) {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    saveRename(id, editingName);
    setEditingId(null);
  }

  if (projects.length === 0) return null;

  return (
    <div ref={containerRef} className="relative px-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="hover:bg-sidebar-accent/45 flex w-full items-center justify-between rounded-sm border border-transparent px-2 py-1.5 transition-colors hover:border-white/5"
      >
        <span className="text-sidebar-primary truncate text-[14px] font-medium tracking-tight">
          {activeProject?.name ?? 'Select project'}
        </span>
        <ChevronDown
          className={cn(
            'text-sidebar-muted h-3.5 w-3.5 shrink-0 transition-transform duration-150',
            expanded && 'rotate-180'
          )}
          strokeWidth={1.5}
        />
      </button>

      {/* Floating dropdown — never pushes content */}
      {expanded && (
        <div className="bg-sidebar border-sidebar-border absolute top-full right-0 left-0 z-50 mt-0.5 rounded-sm border py-1 shadow-lg">
          {projects.map((p) => (
            <div
              key={p.id}
              className={cn(
                'group/row flex items-center transition-colors',
                editingId === p.id
                  ? 'bg-sidebar-accent'
                  : p.id === activeProjectId
                    ? 'bg-sidebar-accent'
                    : 'hover:bg-sidebar-accent/45'
              )}
            >
              {editingId === p.id ? (
                <input
                  ref={inputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, p.id)}
                  onBlur={() => handleEditBlur(p.id)}
                  className="text-sidebar-primary min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[13px] outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onProjectChange(p.id);
                    setExpanded(false);
                  }}
                  className="text-sidebar-foreground min-w-0 flex-1 truncate px-3 py-1.5 text-left text-[13px]"
                >
                  {p.name}
                </button>
              )}
              {/* Pencil — revealed on row hover, not shown while editing */}
              {editingId !== p.id && (
                <button
                  type="button"
                  onClick={(e) => startEdit(e, p)}
                  className="text-sidebar-muted hover:text-sidebar-foreground mr-2 shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100"
                  aria-label={`Rename ${p.name}`}
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
          {onNewProject && (
            <>
              <div className="border-sidebar-border/40 my-1 border-t" />
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  onNewProject();
                }}
                className="text-sidebar-foreground hover:bg-sidebar-accent/45 flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[12px] transition-colors"
              >
                <Plus className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                <span>New project</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
