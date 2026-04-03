"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface InboxMessage {
  id: string
  from: string
  fromInitials: string
  subject: string
  preview: string
  body: string
  time: string
  isAI: boolean
  unread: boolean
}

const INBOX_MESSAGES: InboxMessage[] = [
  {
    id: "1",
    from: "Peter Thiel",
    fromInitials: "PT",
    subject: "Q3 Strategy — You're asking the wrong questions",
    preview:
      "Competition is for losers. The real question is why you don't already have a monopoly on this...",
    body: `Competition is for losers. The real question is why you don't already have a monopoly on this vertical.

Most founders obsess over market share in an existing category. That's precisely the wrong frame. The goal isn't to compete — it's to build something so differentiated that competition becomes irrelevant.

What's the one thing this company can do that no one else can — or will — do for the next 10 years?

If you can't answer that in a single clear sentence, the strategy isn't done.`,
    time: "09:14",
    isAI: true,
    unread: true,
  },
  {
    id: "2",
    from: "Peter Thiel",
    fromInitials: "PT",
    subject: "On the pricing model",
    preview:
      "Raising prices is almost always the right move if your product is genuinely indispensable...",
    body: `Raising prices is almost always the right move if your product is genuinely indispensable.

The instinct to keep prices low is a scarcity mindset. It signals to the market — and to yourself — that you're not sure the product is worth it.

If customers are willing to pay more and you're not charging it, that's not humility — it's leaving signal on the table.

The question isn't "what will the market bear?" The question is: what does this make possible for the buyer that they couldn't do before?

Price to the value created, not to what competitors charge.`,
    time: "Yesterday",
    isAI: true,
    unread: false,
  },
  {
    id: "3",
    from: "Peter Thiel",
    fromInitials: "PT",
    subject: "Hiring note",
    preview: "Don't hire for credentials. Hire for conviction about something most people think is wrong...",
    body: `Don't hire for credentials. Hire for conviction about something most people think is wrong.

The best early employees aren't the most polished — they're the ones who have a specific, heterodox view about how a particular problem should be solved, and the obsession to prove it.

Ask: what important truth do very few people agree with you on?

If they can't answer that, they'll build consensus, not the future.`,
    time: "Mon",
    isAI: true,
    unread: false,
  },
]

export function InboxView() {
  const [selected, setSelected] = useState<InboxMessage | null>(null)
  const [messages, setMessages] = useState(INBOX_MESSAGES)

  const handleSelect = (msg: InboxMessage) => {
    setSelected(msg)
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, unread: false } : m))
    )
  }

  return (
    <div className="flex h-full bg-panel">
      {/* Message list */}
      <div className="w-72 flex-shrink-0 border-r border-panel-border flex flex-col">
        <div className="px-5 py-4 border-b border-panel-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-panel-foreground">Inbox</h2>
            <span className="text-[9px] font-mono bg-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-sm">
              {messages.filter((m) => m.unread).length} new
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg)}
              className={cn(
                "w-full text-left px-5 py-4 border-b border-panel-border transition-colors hover:bg-black/5",
                selected?.id === msg.id && "bg-panel-selected"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {msg.unread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-status-active block mt-1.5" />
                  )}
                  {!msg.unread && <span className="w-1.5 h-1.5 block" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-xs",
                          msg.unread
                            ? "font-semibold text-panel-foreground"
                            : "font-medium text-panel-text-secondary"
                        )}
                      >
                        {msg.from}
                      </span>
                      {msg.isAI && (
                        <span className="text-[8px] font-mono bg-zinc-200 text-zinc-500 px-1 py-0.5 rounded-sm">
                          AI
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-panel-faint flex-shrink-0">
                      {msg.time}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs truncate mb-1",
                      msg.unread ? "text-panel-foreground font-medium" : "text-panel-text-secondary"
                    )}
                  >
                    {msg.subject}
                  </p>
                  <p className="text-[10px] text-panel-muted truncate">{msg.preview}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="px-8 py-5 border-b border-panel-border">
              <h1 className="text-base font-semibold text-panel-foreground text-balance mb-2">
                {selected.subject}
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-sm bg-zinc-300 flex items-center justify-center">
                  <span className="text-[8px] font-mono font-bold text-zinc-600">
                    {selected.fromInitials}
                  </span>
                </div>
                <span className="text-xs text-panel-text-secondary">{selected.from}</span>
                {selected.isAI && (
                  <span className="text-[8px] font-mono bg-zinc-200 text-zinc-500 px-1 py-0.5 rounded-sm">
                    AI
                  </span>
                )}
                <span className="text-[10px] font-mono text-panel-faint ml-auto">{selected.time}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="max-w-prose">
                <p className="text-sm font-mono text-panel-foreground leading-relaxed whitespace-pre-wrap">
                  {selected.body}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-panel-muted">Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
