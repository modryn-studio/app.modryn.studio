// Token estimation and context assembly with priority-ordered budget pruning.
// Priority order (highest → lowest):
//   1. Format instructions — never pruned
//   2. System prompt       — never pruned
//   3. Company context     — never pruned
//   4. Project context     — never pruned
//   5. Tasks (work queue)  — prunable
//   6. Semantic memory     — prunable
//   7. Org memory          — prunable
//   8. Episodic memory     — most prunable

// 12k budget: large enough for the biggest system prompt (~6.5k) + founding doc (~1.5k) + memory.
// Sonnet 4.6 window is 200k — this is a cost/signal guardrail, not a capacity limit.
export const DEFAULT_BUDGET = 12000;

// Fast character-count estimator: 1 token ≈ 4 chars.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ContextPart {
  label: string;
  content: string;
  // Lower number = higher priority. Parts with prunable=true are dropped oldest-first if over budget.
  priority: number;
  prunable?: boolean;
}

// Assembles a system prompt string within budgetTokens.
// Drops prunable parts (lowest priority first, newest kept) until it fits.
// Never-prunable parts are always included regardless of budget.
export function assembleContext(parts: ContextPart[], budgetTokens = DEFAULT_BUDGET): string {
  const fixed = parts.filter((p) => !p.prunable);
  const prunable = [...parts.filter((p) => p.prunable)].sort((a, b) => b.priority - a.priority); // lowest priority first

  const fixedTokens = fixed.reduce((sum, p) => sum + estimateTokens(p.content), 0);
  // Warn when fixed parts are consuming most of the budget — memory sections will be silently dropped.
  if (fixedTokens > budgetTokens * 0.8) {
    console.warn(
      '[tokens] Fixed context exceeds 80% of token budget — memory will be heavily pruned',
      {
        fixedTokens,
        budgetTokens,
      }
    );
  }
  let remaining = budgetTokens - fixedTokens;

  // Greedily include prunable parts from highest to lowest priority until budget exhausted.
  const selected: ContextPart[] = [];
  for (const part of prunable.slice().reverse()) {
    // iterate highest priority first
    const cost = estimateTokens(part.content);
    if (cost <= remaining) {
      selected.push(part);
      remaining -= cost;
    }
    // Skip parts that don't fit — don't truncate, just omit
  }

  return [...fixed, ...selected]
    .sort((a, b) => a.priority - b.priority)
    .map((p) => p.content)
    .filter(Boolean)
    .join('\n\n---\n\n');
}
