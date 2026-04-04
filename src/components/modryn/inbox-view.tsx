'use client';

import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ChromeLabel } from '@/components/modryn/chrome-label';
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

const INBOX_MESSAGES: InboxMessage[] = [
  {
    id: '1',
    from: 'Peter Thiel',
    fromInitials: 'PT',
    subject: "Q3 Strategy — You're asking the wrong questions",
    preview:
      "Competition is for losers. The real question is why you don't already have a monopoly on this...",
    body: `Competition is for losers. The real question is why you don't already have a monopoly on this vertical.

Most founders obsess over market share in an existing category. That's precisely the wrong frame. The goal isn't to compete — it's to build something so differentiated that competition becomes irrelevant.

What's the one thing this company can do that no one else can — or will — do for the next 10 years?

If you can't answer that in a single clear sentence, the strategy isn't done.`,
    time: '09:14',
    isAI: true,
    unread: true,
  },
  {
    id: '2',
    from: 'Peter Thiel',
    fromInitials: 'PT',
    subject: 'On the pricing model',
    preview:
      'Raising prices is almost always the right move if your product is genuinely indispensable...',
    body: `Raising prices is almost always the right move if your product is genuinely indispensable.

The instinct to keep prices low is a scarcity mindset. It signals to the market — and to yourself — that you're not sure the product is worth it.

If customers are willing to pay more and you're not charging it, that's not humility — it's leaving signal on the table.

The question isn't "what will the market bear?" The question is: what does this make possible for the buyer that they couldn't do before?

Price to the value created, not to what competitors charge.`,
    time: 'Yesterday',
    isAI: true,
    unread: false,
  },
  {
    id: '3',
    from: 'Peter Thiel',
    fromInitials: 'PT',
    subject: 'Hiring note',
    preview:
      "Don't hire for credentials. Hire for conviction about something most people think is wrong...",
    body: `Don't hire for credentials. Hire for conviction about something most people think is wrong.

The best early employees aren't the most polished — they're the ones who have a specific, heterodox view about how a particular problem should be solved, and the obsession to prove it.

Ask: what important truth do very few people agree with you on?

If they can't answer that, they'll build consensus, not the future.`,
    time: 'Mon',
    isAI: true,
    unread: false,
  },
];

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
          <div className="max-w-prose">
            <p className="text-panel-text text-sm leading-relaxed whitespace-pre-wrap">
              {selected.body}
            </p>
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
