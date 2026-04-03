"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useRef, useState } from "react"
import { Send, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatViewProps {
  memberId: string
  memberName: string
  memberRole: string
  memberInitials: string
}

function getMessageText(message: { parts?: { type: string; text?: string }[]; content?: string }): string {
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
  }
  return message.content ?? ""
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[oklch(0.6_0_80)] animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

function FounderMessage({ text, timestamp }: { text: string; timestamp: string }) {
  return (
    <div className="group flex flex-col gap-1 py-4 px-6 border-b border-[var(--panel-border)] last:border-b-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-6 h-6 rounded-sm bg-zinc-300 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-mono font-bold text-zinc-600">F</span>
        </div>
        <span className="text-xs font-semibold text-[oklch(0.2_0_0)]">Founder</span>
        <span className="text-[10px] text-[oklch(0.6_0_0)] font-mono">{timestamp}</span>
      </div>
      <p className="text-sm text-[oklch(0.2_0_0)] leading-relaxed pl-8.5 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function AIMessage({
  text,
  memberName,
  memberInitials,
  timestamp,
  isStreaming,
}: {
  text: string
  memberName: string
  memberInitials: string
  timestamp: string
  isStreaming?: boolean
}) {
  return (
    <div className="group flex flex-col gap-1 py-4 px-6 bg-[var(--ai-surface)] border-b border-[var(--ai-border)] last:border-b-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-6 h-6 rounded-sm bg-zinc-400 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-mono font-bold text-zinc-100">{memberInitials}</span>
        </div>
        <span className="text-xs font-semibold text-[oklch(0.15_0_0)]">{memberName}</span>
        <span className="text-[9px] font-mono bg-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-sm">AI</span>
        <span className="text-[10px] text-[oklch(0.6_0_0)] font-mono">{timestamp}</span>
        {isStreaming && (
          <span className="text-[9px] font-mono text-[oklch(0.55_0.08_80)] tracking-wide">— generating</span>
        )}
      </div>
      <div className="pl-8.5">
        {text ? (
          <p className="text-sm text-[oklch(0.18_0_0)] leading-relaxed font-mono whitespace-pre-wrap">{text}</p>
        ) : (
          <ThinkingDots />
        )}
      </div>
    </div>
  )
}

function EmptyState({ memberName }: { memberName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
      <div className="w-12 h-12 rounded-sm border border-dashed border-[var(--panel-border)] flex items-center justify-center">
        <span className="text-sm font-mono text-[oklch(0.65_0_0)]">PT</span>
      </div>
      <div className="text-center max-w-xs">
        <p className="text-sm font-medium text-[oklch(0.3_0_0)]">{memberName}</p>
        <p className="text-xs text-[oklch(0.55_0_0)] mt-1 leading-relaxed">
          Start a conversation. Ask anything — strategy, decisions, first principles.
        </p>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function ChatView({ memberId, memberName, memberRole, memberInitials }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState("")

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          memberId,
        },
      }),
    }),
  })

  const isStreaming = status === "streaming" || status === "submitted"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return
    sendMessage({ text: inputValue })
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--panel-bg)]">
      {/* Header — hidden on mobile (handled by MobileHeader) */}
      <div className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-zinc-300 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-600">{memberInitials}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[oklch(0.15_0_0)]">{memberName}</span>
              <span className="text-[9px] font-mono bg-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-sm">AI</span>
            </div>
            <p className="text-[10px] text-[oklch(0.55_0_0)]">{memberRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isStreaming ? "bg-[oklch(0.72_0.12_75)] animate-pulse" : "bg-emerald-500"
            )}
          />
          <span className="text-[10px] font-mono text-[oklch(0.55_0_0)]">
            {isStreaming ? "analyzing" : "online"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState memberName={memberName} />
        ) : (
          <div>
            {messages.map((message, idx) => {
              const text = getMessageText(message)
              const timestamp = formatTime(new Date())
              const isLastAI = message.role === "assistant" && idx === messages.length - 1

              if (message.role === "user") {
                return (
                  <FounderMessage key={message.id ?? idx} text={text} timestamp={timestamp} />
                )
              }

              return (
                <AIMessage
                  key={message.id ?? idx}
                  text={text}
                  memberName={memberName}
                  memberInitials={memberInitials}
                  timestamp={timestamp}
                  isStreaming={isLastAI && isStreaming}
                />
              )
            })}

            {/* Streaming placeholder when submitted but no AI message yet */}
            {status === "submitted" && (
              <AIMessage
                text=""
                memberName={memberName}
                memberInitials={memberInitials}
                timestamp={formatTime(new Date())}
                isStreaming
              />
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-4">
        <div className="flex items-end gap-3 bg-[oklch(0.945_0.003_80)] border border-[var(--panel-border)] rounded-sm px-4 py-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${memberName}...`}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-[oklch(0.15_0_0)] placeholder:text-[oklch(0.6_0_0)] resize-none outline-none leading-relaxed min-h-[20px] max-h-32 overflow-y-auto disabled:opacity-50"
            style={{
              height: "auto",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = Math.min(target.scrollHeight, 128) + "px"
            }}
          />
          <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
            <span className="text-[9px] font-mono text-[oklch(0.6_0_0)] hidden sm:flex items-center gap-1">
              <CornerDownLeft className="w-2.5 h-2.5" /> send
            </span>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className="w-7 h-7 rounded-sm bg-[oklch(0.15_0_0)] disabled:opacity-30 flex items-center justify-center hover:bg-[oklch(0.25_0_0)] transition-colors"
              aria-label="Send message"
            >
              <Send className="w-3 h-3 text-[oklch(0.9_0_0)]" />
            </button>
          </div>
        </div>
        <p className="text-[9px] font-mono text-[oklch(0.6_0_0)] mt-2 text-center">
          Shift+Enter for new line — responses reflect AI modeling only, not the views of real individuals
        </p>
      </div>
    </div>
  )
}
