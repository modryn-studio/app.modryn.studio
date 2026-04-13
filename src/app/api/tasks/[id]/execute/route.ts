import { generateText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createRouteLogger } from '@/lib/route-logger';
import { getCompanyContext, getProjectContext, getOrgMemory } from '@/lib/context';
import { assembleContext, estimateTokens } from '@/lib/tokens';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

// Inline task format instruction — do not import from chat/route.ts.
// Consolidate only when a third consumer exists.
const TASK_FORMAT =
  'You are completing an assigned task. Produce a structured deliverable. Include finding, reasoning, and recommendation. Length appropriate to the task scope.';

const log = createRouteLogger('tasks/execute');

const FALLBACK_SYSTEM = 'You are a helpful AI advisor inside Modryn Studio.';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  const { id } = await params;
  try {
    // Idempotency check — before any member context queries. No point pulling DB
    // join data for a task that's already done.
    const [task] = await sql`
      SELECT id, title, description, assigned_to, status, output, project_id
      FROM tasks WHERE id = ${id} LIMIT 1
    `;
    if (!task) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }
    if (task.status === 'done') {
      log.info(ctx.reqId, 'Already done — returning cached output', { id });
      return log.end(ctx, Response.json({ id: task.id, status: 'done', output: task.output }));
    }
    // Guard against parallel executions — double-click / race condition would both read 'pending'
    // and both proceed without this check. This is the actual double-execution protection.
    if (task.status === 'in_progress') {
      return log.end(ctx, Response.json({ error: 'Task is already running' }, { status: 409 }));
    }

    // Mark in_progress immediately — window between this write and the status check above is
    // still a race, but it closes the door on most duplicate clicks from the UI.
    await sql`UPDATE tasks SET status = 'in_progress', updated_at = now() WHERE id = ${id}`;

    // Pull member context in parallel — tasks don't get episodic/semantic memory.
    // Conversation history is noise for a discrete work deliverable; persona + company
    // context + project context + org decisions is what matters.
    const taskProjectId: string | null = task.project_id ?? null;
    const [memberRows, orgMemory, projectContext] = await Promise.all([
      sql`SELECT system_prompt FROM members WHERE id = ${task.assigned_to} LIMIT 1`,
      taskProjectId ? getOrgMemory(taskProjectId) : Promise.resolve(null),
      taskProjectId ? getProjectContext(taskProjectId) : Promise.resolve(null),
    ]);

    const memberSystemPrompt: string = memberRows[0]?.system_prompt ?? FALLBACK_SYSTEM;
    const companyContext = getCompanyContext();

    const orgMemoryTokens = orgMemory ? estimateTokens(orgMemory) : 0;
    const systemPromptRaw = [
      { label: 'format', content: TASK_FORMAT },
      { label: 'system', content: memberSystemPrompt },
      { label: 'company', content: companyContext },
      ...(projectContext ? [{ label: 'project', content: projectContext }] : []),
      ...(orgMemory ? [{ label: 'org', content: orgMemory }] : []),
    ];

    log.info(ctx.reqId, 'Context layers (estimated tokens)', {
      format: estimateTokens(TASK_FORMAT),
      system_prompt: estimateTokens(memberSystemPrompt),
      company_context: estimateTokens(companyContext),
      project_context: projectContext ? estimateTokens(projectContext) : 0,
      org_memory: orgMemoryTokens,
      total_estimated: systemPromptRaw.reduce((s, l) => s + estimateTokens(l.content), 0),
    });

    const systemPrompt = assembleContext(
      [
        { label: 'format', content: TASK_FORMAT, priority: 1 },
        { label: 'system', content: memberSystemPrompt, priority: 2 },
        { label: 'company', content: companyContext, priority: 3 },
        ...(projectContext ? [{ label: 'project', content: projectContext, priority: 4 }] : []),
        ...(orgMemory ? [{ label: 'org', content: orgMemory, priority: 5, prunable: true }] : []),
      ],
      8000
    );

    const prompt = [task.title, task.description].filter(Boolean).join('\n\n');

    const promptTokensEst = estimateTokens(prompt);
    log.info(ctx.reqId, 'Assembled system prompt', {
      assembled_chars: systemPrompt.length,
      assembled_tokens_est: estimateTokens(systemPrompt),
      prompt_tokens_est: promptTokensEst,
      total_input_est: estimateTokens(systemPrompt) + promptTokensEst,
    });

    // Michelle gets web search on tasks — capped at 1 use. Tasks need a targeted fact-check
    // (current API endpoint, auth header format), not deep research. Each search compounds
    // input tokens (results accumulate across steps), so 3 uses at 5–15k tokens each
    // multiplies cost fast. One search is enough to ground a technical deliverable.
    const tools =
      task.assigned_to === 'michelle-lim'
        ? { web_search: anthropic.tools.webSearch_20260209({ maxUses: 1 }) }
        : undefined;

    const { text, usage, steps } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      prompt,
      maxOutputTokens: 1500,
      stopWhen: stepCountIs(3), // search (1) + result synthesis (1) + final answer (1) — hard ceiling on compounding input
      ...(tools && { tools }),
    });

    // Sonnet 4.6 pricing: $3/MTok input, $15/MTok output
    const inputCost = ((usage?.inputTokens ?? 0) / 1_000_000) * 3;
    const outputCost = ((usage?.outputTokens ?? 0) / 1_000_000) * 15;
    const webSearchUses =
      steps?.flatMap((s) => s.toolCalls ?? []).filter((t) => t.toolName === 'web_search').length ??
      0;

    log.info(ctx.reqId, 'generateText complete', {
      input_tokens: usage?.inputTokens,
      output_tokens: usage?.outputTokens,
      total_tokens: usage?.totalTokens,
      input_cost_usd: inputCost.toFixed(5),
      output_cost_usd: outputCost.toFixed(5),
      total_cost_usd: (inputCost + outputCost).toFixed(5),
      web_search_uses: webSearchUses,
      output_words: text.split(/\s+/).filter(Boolean).length,
      output_chars: text.length,
    });

    await sql`
      UPDATE tasks
      SET status = 'done', output = ${text}, updated_at = now()
      WHERE id = ${id}
    `;

    log.info(ctx.reqId, 'Task executed', { id, assigned_to: task.assigned_to });
    return log.end(ctx, Response.json({ id, status: 'done', output: text }));
  } catch (error) {
    // Roll back in_progress on failure so the task stays executable
    await sql`UPDATE tasks SET status = 'pending', updated_at = now() WHERE id = ${id}`.catch(
      () => {}
    );
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
