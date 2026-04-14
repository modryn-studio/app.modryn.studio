'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ChromeLabel } from '@/components/modryn/chrome-label';
import { Markdown } from '@/components/prompt-kit/markdown';
import { cn } from '@/lib/utils';

interface InboxMessage {
  id: string;
  from: string;
  fromInitials: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  isAI: boolean;
  unread: boolean;
}

const INBOX_MESSAGES: InboxMessage[] = [];

export function InboxView() {
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [messages, setMessages] = useState(INBOX_MESSAGES);
  const unreadCount = messages.filter((m) => m.unread).length;

  const handleSelect = (msg: InboxMessage) => {
    setSelected(msg);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, unread: false } : m)));
  };

  const renderMessageList = (mobile = false) => (
    <div
      className={cn(
        'border-panel-border flex flex-col',
        mobile ? 'h-full' : 'w-72 shrink-0 border-r'
      )}
    >
      <div className="border-panel-border border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-panel-foreground text-xs font-semibold">Inbox</h2>
          <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1.5 py-0.5 tracking-[0.08em] normal-case">
            {unreadCount} new
          </ChromeLabel>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.map((msg) => (
          <button
            key={msg.id}
            onClick={() => handleSelect(msg)}
            className={cn(
              'border-panel-border hover:bg-panel-selected/70 w-full border-b px-5 py-4 text-left transition-colors',
              selected?.id === msg.id && 'bg-panel-selected'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {msg.unread && (
                  <span className="bg-status-active mt-1.5 block h-1.5 w-1.5 rounded-full" />
                )}
                {!msg.unread && <span className="block h-1.5 w-1.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-xs',
                        msg.unread
                          ? 'text-panel-foreground font-semibold'
                          : 'text-panel-text-secondary font-medium'
                      )}
                    >
                      {msg.from}
                    </span>
                    {msg.isAI && (
                      <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1 py-0.5 tracking-[0.08em]">
                        AI
                      </ChromeLabel>
                    )}
                  </div>
                  <ChromeLabel className="text-panel-faint shrink-0 tracking-[0.08em] normal-case">
                    {msg.time}
                  </ChromeLabel>
                </div>
                <p
                  className={cn(
                    'mb-1 truncate text-xs',
                    msg.unread ? 'text-panel-foreground font-medium' : 'text-panel-text-secondary'
                  )}
                >
                  {msg.subject}
                </p>
                <p
                  className={cn(
                    'text-panel-muted text-[10px] leading-relaxed',
                    !mobile && 'truncate'
                  )}
                >
                  {msg.preview}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderMessageDetail = (mobile = false) => {
    if (!selected) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-panel-muted text-sm">Select a message to read</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={cn('border-panel-border border-b', mobile ? 'px-5 py-4' : 'px-8 py-5')}>
          <div className="mb-2 flex items-center gap-2">
            {mobile && (
              <button
                onClick={() => setSelected(null)}
                className="text-panel-muted hover:text-panel-foreground -ml-1 flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
                aria-label="Back to inbox"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-panel-foreground text-base font-semibold text-balance">
              {selected.subject}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-panel-chrome flex h-5 w-5 items-center justify-center rounded-sm">
              <span className="text-panel-chrome-foreground font-mono text-[8px] font-bold">
                {selected.fromInitials}
              </span>
            </div>
            <span className="text-panel-text-secondary text-xs">{selected.from}</span>
            {selected.isAI && (
              <ChromeLabel className="bg-panel-badge text-panel-muted rounded-sm px-1 py-0.5 tracking-[0.08em]">
                AI
              </ChromeLabel>
            )}
            <ChromeLabel className="text-panel-faint ml-auto text-[10px] tracking-[0.08em] normal-case">
              {selected.time}
            </ChromeLabel>
          </div>
        </div>
        <div className={cn('flex-1 overflow-y-auto', mobile ? 'px-5 py-5' : 'px-8 py-6')}>
          <div className="prose prose-sm max-w-prose">
            <Markdown>{selected.body}</Markdown>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="bg-panel flex h-full">
      {/* Mobile: single-pane list/detail */}
      <div className="flex h-full w-full flex-col md:hidden">
        {!selected ? renderMessageList(true) : renderMessageDetail(true)}
      </div>

      {/* Desktop: split view */}
      <div className="hidden h-full w-full md:flex">
        {renderMessageList()}
        <div className="flex flex-1 flex-col overflow-hidden">{renderMessageDetail()}</div>
      </div>
    </div>
  );
}
