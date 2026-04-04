'use client';

// Mobile-only: dispatches the open-feedback event that FeedbackWidget listens for.
// Rendered inside the footer, hidden on md+ where the side tab takes over.
export function FeedbackTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('open-feedback'))}
      className="text-muted-foreground cursor-pointer font-mono text-xs transition-opacity hover:opacity-80 md:hidden"
    >
      Feedback
    </button>
  );
}
