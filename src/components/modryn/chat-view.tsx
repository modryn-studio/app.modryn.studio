'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  memberId: string;
  memberName: string;
  memberRole: string;
  memberInitials: string;
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

function FounderMessage({ text, timestamp }: { text: string; timestamp: string }) {
  return (
    <div className="group border-panel-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0">
      <div className="mb-1.5 flex items-center gap-2.5">
        <div className="bg-panel-chrome flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm">
          <span className="text-panel-chrome-foreground font-mono text-[9px] font-bold">F</span>
        </div>
        <span className="text-panel-foreground text-xs font-semibold">Founder</span>
        <span className="text-panel-faint font-mono text-[10px]">{timestamp}</span>
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
  timestamp,
  isStreaming,
}: {
  text: string;
  memberName: string;
  memberInitials: string;
  timestamp: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="group bg-ai-surface border-ai-border flex flex-col gap-1 border-b px-6 py-4 last:border-b-0">
      <div className="mb-1.5 flex items-center gap-2.5">
        <div className="bg-panel-chrome-strong flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm">
          <span className="text-panel-inverse font-mono text-[9px] font-bold">
            {memberInitials}
          </span>
        </div>
        <span className="text-panel-foreground text-xs font-semibold">{memberName}</span>
        <span className="bg-panel-badge text-panel-muted rounded-sm px-1.5 py-0.5 font-mono text-[9px]">
          AI
        </span>
        <span className="text-panel-faint font-mono text-[10px]">{timestamp}</span>
        {isStreaming && (
          <span className="text-status-generating font-mono text-[9px] tracking-wide">
            â€" generating
          </span>
        )}
      </div>
      <div className="pl-8.5">
        {text ? (
          <p className="text-panel-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <ThinkingDots />
        )}
      </div>
    </div>
  );
}

function EmptyState({ memberName }: { memberName: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="border-panel-border flex h-12 w-12 items-center justify-center rounded-sm border border-dashed">
        <span className="text-panel-faint font-mono text-sm">PT</span>
      </div>
      <div className="max-w-xs text-center">
        <p className="text-panel-text text-sm font-medium">{memberName}</p>
        <p className="text-panel-muted mt-1 text-xs leading-relaxed">
          Start a conversation. Ask anything — strategy, decisions, first principles.
        </p>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ChatView({ memberId, memberName, memberRole, memberInitials }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          memberId,
        },
      }),
    }),
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return;
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
      {/* Header â€" hidden on mobile (handled by MobileHeader) */}
      <div className="border-panel-border bg-panel hidden items-center justify-between border-b px-6 py-3.5 md:flex">
        <div className="flex items-center gap-3">
          <div className="bg-panel-chrome flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm">
            <span className="text-panel-chrome-foreground font-mono text-[10px] font-bold">
              {memberInitials}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-panel-foreground text-sm font-semibold">{memberName}</span>
              <span className="bg-panel-badge text-panel-muted rounded-sm px-1.5 py-0.5 font-mono text-[9px]">
                AI
              </span>
            </div>
            <p className="text-panel-muted text-[10px]">{memberRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isStreaming ? 'bg-status-active animate-pulse' : 'bg-status-online'
            )}
          />
          <span className="text-panel-muted font-mono text-[10px]">
            {isStreaming ? 'analyzing' : 'online'}
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
              const text = getMessageText(message);
              const timestamp = formatTime(new Date());
              const isLastAI = message.role === 'assistant' && idx === messages.length - 1;

              if (message.role === 'user') {
                return <FounderMessage key={message.id ?? idx} text={text} timestamp={timestamp} />;
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
              );
            })}

            {/* Streaming placeholder when submitted but no AI message yet */}
            {status === 'submitted' && (
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
      <div className="border-panel-border bg-panel border-t px-6 py-4">
        <div className="bg-panel-input border-panel-border flex items-end gap-3 rounded-sm border px-4 py-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${memberName}...`}
            rows={1}
            disabled={isStreaming}
            className="text-panel-foreground placeholder:text-panel-faint max-h-32 min-h-[20px] flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed outline-none disabled:opacity-50"
            style={{
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <div className="flex flex-shrink-0 items-center gap-2 pb-0.5">
            <span className="text-panel-faint hidden items-center gap-1 font-mono text-[9px] sm:flex">
              <CornerDownLeft className="h-2.5 w-2.5" /> send
            </span>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isStreaming}
              className="bg-panel-foreground hover:bg-panel-foreground-hover flex h-7 w-7 items-center justify-center rounded-sm transition-colors disabled:opacity-30"
              aria-label="Send message"
            >
              <Send className="text-panel-inverse h-3 w-3" />
            </button>
          </div>
        </div>
        <p className="text-panel-faint mt-2 text-center font-mono text-[9px]">
          Shift+Enter for new line — responses reflect AI modeling only, not the views of real
          individuals
        </p>
      </div>
    </div>
  );
}
