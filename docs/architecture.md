# Architecture

## Models

- **Responses** (DMs + threads): `claude-sonnet-4-6`
- **Memory** (episodic summaries, semantic patterns, org fact extraction): `claude-haiku-4-5-20251001`

---

## System Prompt — Same structure for both DMs and threads

Built from 6 priority-ordered layers with a 12k token budget. Lower-priority layers are dropped first if over budget.

1. Format instruction — route-specific length/style constraint
2. Member system prompt — full persona from DB
3. Company context — founding document (read from disk)
4. Semantic memory — behavioural patterns across conversations (up to 3)
5. Org memory — decisions + org facts (newest 20)
6. Episodic memory — per-conversation summaries for this member (up to 5)

---

## DM vs Thread — how messages work

**DM:** Server fetches the last 40 messages from DB and passes a sliding window of 20 to the model. Client only sends the new message; server owns history.

**Thread:** Each member gets a single user message containing the full labeled transcript of everything said so far, ending with "Contribute your response." Members re-query the DB at respond time so each one sees responses from members who went before them in the sequence.

---

## Web Search

Only Michelle (`michelle-lim`) has web search access via `anthropic.tools.webSearch_20260209`. The model decides when to use it — it is not forced.

- DMs: `maxUses: 3`
- Threads: `maxUses: 1`
- All other members: no tools

When Michelle searches, citations are saved as a `<sources>` JSON block appended to her DB message and rendered as links in the UI.

---

## Memory

- **Episodic**: written after a DM conversation with 5+ user turns — one summary per conversation
- **Semantic**: written every 5th episodic entry — cross-conversation behavioural patterns
- **Org facts**: extracted after each thread respond sequence completes

All stored in `member_memory` (episodic, semantic) and `org_memory` (org facts) tables in Neon.

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

| Table                  | What it stores                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `members`              | AI member profiles — ID, name, role, initials, system prompt, status                            |
| `conversations`        | DM or thread containers — type (`dm` or `thread`), title, timestamps                            |
| `conversation_members` | Join table — which members (+ founder) are in each conversation, with respond order for threads |
| `messages`             | All messages — sender_id, role (`user`/`assistant`), content, conversation_id                   |
| `member_memory`        | Episodic and semantic memory rows per member — memory_type, summary, conversation_id            |
| `org_memory`           | Team-wide facts extracted from threads — fact text, source_conversation_id                      |
| `decisions`            | Logged decisions — title, description, logged_by, conversation_id                               |
| `user_roles`           | Neon Auth user ID → role (`admin`/`member`)                                                     |
| `invites`              | Single-use invite tokens for sign-up gating                                                     |
| `founder_profile`      | Founder name + company description (set on first launch)                                        |
