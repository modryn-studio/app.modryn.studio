# Architecture

## Models

- **Responses** (DMs + threads): `claude-sonnet-4-6`
- **Memory** (episodic summaries, semantic patterns, org fact extraction): `claude-haiku-4-5-20251001`

---

## System Prompt — Same structure for both DMs and threads

Built from 8 priority-ordered layers with a 12k token budget. Lower-priority layers are dropped first if over budget.

1. Format instruction — route-specific length/style constraint
2. Member system prompt — full persona from DB
3. Company context — founding document (read from disk)
4. Project context — project name + context field from `projects` table, wrapped in `<project-context>` tags. Not prunable.
5. Member task queue — active tasks (pending/in_progress/blocked, up to 5) + recently completed titles (up to 3), via `getMemberTasks()`. Prunable. Injected so members are self-aware of their own work without being told.
6. Semantic memory — behavioural patterns across conversations (up to 3)
7. Org memory — decisions + org facts (newest 20, project-scoped)
8. Episodic memory — per-conversation summaries for this member (up to 5, project-scoped)

---

## System Prompt — Tasks

Built from 5 priority-ordered layers with an 8k token budget. No episodic or semantic memory — tasks are discrete deliverables, not continuations of a conversation.

1. Format instruction — task-specific length/style constraint
2. Member system prompt — full persona from DB
3. Company context — founding document (read from disk)
4. Project context — project name + context field, not prunable
5. Org memory — decisions + org facts (newest 20, prunable)

Uses `generateText` rather than `streamText`. Michelle does not have web search in tasks — web search is DM + thread only.

---

## DM vs Thread — how messages work

**DM:** Server fetches up to 60 messages from DB (newest-first), accumulates them until an 8 000-token budget (`HISTORY_TOKEN_BUDGET`) is exhausted, then reverses to chronological order. Client only sends the new message; server owns history.

**Thread:** Each member gets a single user message containing the full labeled transcript of everything said so far, ending with "Contribute your response." Members re-query the DB at respond time so each one sees responses from members who went before them in the sequence.

---

## Web Search

Only Michelle (`michelle-lim`) has web search access via `anthropic.tools.webSearch_20260209`. The model decides when to use it — it is not forced.

- DMs: `maxUses: 2`
- Threads: `maxUses: 2`
- Tasks: no web search
- All other members: no tools

When Michelle searches, citations are saved as a `<sources>` JSON block appended to her DB message and rendered as links in the UI.

---

## Memory

- **Episodic**: written after a DM conversation with 2+ user turns — one summary per conversation, upserted. DM reads are project-scoped; thread respond reads are cross-project (no `project_id` filter).
- **Semantic**: written every 5th episodic entry — cross-conversation behavioural patterns
- **Org facts**: extracted after each thread respond sequence completes

All stored in `member_memory` (episodic, semantic) and `org_memory` (org facts) tables in Neon.

---

## Decisions Draft (DM + Threads)

**DM:** `POST /api/conversations/[conversationId]/decisions-draft` — triggered by the Synthesize button (desktop header or mobile strip above input). Reads messages since `last_synthesized_at` on the conversations row (NULL = full history), runs Haiku against that slice, returns `{ decisions: [...], tasks: [...] }`. After each run, advances `last_synthesized_at` to the last message's `created_at` so subsequent calls only read new turns. Returns empty arrays if nothing new.

**Thread:** `POST /api/threads/[threadId]/decisions-draft` — triggered by the synthesize button in thread view. Runs Haiku against the full thread transcript. Same response shape and review flow — no watermark (threads scope by round instead).

Both: proposals returned to the client for review. The user confirms or dismisses each item before it's written to the DB. Distinct from automatic org extraction (`/extract`), which fires after every respond sequence without user input.

---

## Thread Respond Sequence — Client-Orchestrated

The client (not the server) drives the per-member respond loop. After a thread is created or a reply is sent, the client fires `/api/threads/[threadId]/respond` for each member in order, one at a time. It waits for the stream to fully close before firing the next member — stream close guarantees the DB write completed on the server (`onFinish` runs before the stream closes). This means each member re-queries the DB and sees all prior responses automatically.

If a member's respond call returns already-responded JSON (idempotent path), the client just appends that message and continues. Network failures surface as in-thread error messages rather than silently breaking the sequence.

---

## Member IDs

Actual DB primary keys — hardcoded in several places in the codebase (web search gate, prompt stripping logic):

| ID               | Name           |
| ---------------- | -------------- |
| `charlie-munger` | Charlie Munger |
| `dieter-rams`    | Dieter Rams    |
| `marc-lou`       | Marc Lou       |
| `michelle-lim`   | Michelle Lim   |
| `steve-jobs`     | Steve Jobs     |

The founder is identified as `sender_id = 'founder'` in messages — not a members row.

---

## Reddit Thread Fetcher

`POST /api/reddit` — accepts a `reddit.com` URL and a `depth` value (2–99, default 4), fetches the thread via Reddit's JSON API, and returns the post + comments as indented plain text. No auth required. Used internally by Luke via the Reddit panel on the `/` dashboard to copy formatted threads into AI conversations.

---

## Database Tables

| Table                  | What it stores                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`             | Top-level containers — name, optional context field, timestamps                                                                                                                                                             |
| `members`              | AI member profiles — ID, name, role, initials, system prompt, status                                                                                                                                                        |
| `conversations`        | DM or thread containers — type (`dm` or `thread`), title, timestamps. `last_synthesized_at` (nullable) tracks the DM synthesis watermark.                                                                                   |
| `conversation_members` | Join table — which members (+ founder) are in each conversation, with respond order for threads                                                                                                                             |
| `messages`             | All messages — sender_id, role (`user`/`assistant`), content, conversation_id                                                                                                                                               |
| `member_memory`        | Episodic and semantic memory rows per member — memory_type, summary, conversation_id                                                                                                                                        |
| `org_memory`           | Team-wide facts extracted from threads — fact text, source_conversation_id                                                                                                                                                  |
| `decisions`            | Logged decisions — title, description, logged_by, conversation_id                                                                                                                                                           |
| `user_roles`           | Neon Auth user ID → role (`admin`/`member`)                                                                                                                                                                                 |
| `tasks`                | Work units assigned to members — title, description, status (pending/in_progress/done/blocked), output (work product), due_at, conversation_id. `assigned_to` is a logical ID (member slug or 'founder'), no FK constraint. |
| `invites`              | Single-use invite tokens for sign-up gating                                                                                                                                                                                 |
| `founder_profile`      | Founder name + company description (set on first launch)                                                                                                                                                                    |
| `saved_reddit_urls`    | Saved Reddit threads per project — url, label, full thread text cached at save time, depth                                                                                                                                  |
