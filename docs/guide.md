# Modryn Studio — User Guide

This is the internal AI company operating system for Modryn Studio. One user: the founder.

---

## Layout

The app is a single full-screen workspace with three zones:

1. **Sidebar** (left, desktop only) — icon rail + team roster
2. **Main panel** (center) — chat, inbox, or placeholder views
3. **Context panel** (right, desktop only) — member decisions, tasks, notes

On mobile, the sidebar is replaced by a slide-out drawer, a bottom tab bar, and a pull-up sheet for the context panel (briefing).

---

## Sidebar

### Icon rail

Five navigation icons stacked vertically:

- **DMs** — one-on-one chat (default view)
- **Threads** — group threads (placeholder)
- **Inbox** — async messages from members
- **Tasks** — task board (placeholder)
- **Calendar** — scheduling (placeholder)

The active icon has a left border indicator and highlighted background.

### Team roster

Below the icon rail, the roster lists:

- **Founder** — your profile. Click the avatar to open the profile editor (name, description, photo).
- **Peter Thiel** — AI Strategist. The only active AI member. Click to open a DM.
- **AI Member 2, AI Member 3** — future slots, grayed out.

---

## DM Chat

Click an AI member in the roster (or tap DMs on mobile) to open a one-on-one conversation.

- Type a message in the input field at the bottom and press Enter (or tap the send button).
- The AI responds in real-time via streaming. A green "online" dot shows when idle; an amber pulsing dot and "analyzing" label show during generation.
- AI messages display on a slightly darker cream surface. Each AI message has a mono "AI" badge.
- The disclaimer at the bottom reads: "Responses reflect AI modeling only, not the views of real individuals."

Peter Thiel's persona is contrarian, Socratic, and first-principles driven. He pushes back on assumptions and asks hard questions.

---

## Inbox

Switch to Inbox via the sidebar icon (or mobile tab bar).

The inbox shows async messages from AI members. Each message has:

- Unread indicator (amber dot)
- Sender name and AI badge
- Subject line and preview
- Full message body when selected

Messages are currently hardcoded demo data — not generated dynamically.

---

## Context Panel

On desktop, the right panel shows context for the active AI member:

- **Recent Decisions** — logged strategic decisions
- **Active Tasks** — assigned tasks with due dates
- **Conversation Notes** — session notes

On mobile, the bottom tab bar shows a docked **Briefing** strip above the nav tabs when you're in a DM. Tap it — or swipe up from it — to open the context panel as a slide-up sheet. Swipe down on the handle or tap the backdrop to close it.

Context data is currently hardcoded per member.

---

## Profile Editor

Click your avatar in the sidebar roster to open the profile sheet (slides in from the right).

- **Avatar** — click to upload a photo. Stored as base64 in localStorage.
- **Name** — click to edit inline. Saves on blur or Enter.
- **Description** — click to edit inline. Multi-line supported.

All profile data persists in localStorage. Changes are reflected immediately across all founder surfaces — sidebar avatar, mobile header, mobile drawer, and chat message blocks — without a page reload.

---

## Placeholder Views

Threads, Tasks, and Calendar show placeholder screens with a "Coming in next release" label. These views are not functional.

---

## Feedback Widget

- **Desktop:** a "Feedback" tab on the right edge of the screen slides out a form.
- **Mobile:** a "Feedback" link in the footer opens a slide-up sheet.

Enter a message (required) and optionally an email for a reply. Submissions are sent to `/api/feedback`, which emails the founder via Gmail SMTP.

---

## API Routes

| Route           | Method | What it does                                                                                                         |
| --------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `/api/chat`     | POST   | Streams AI responses via Anthropic (Claude Sonnet). Accepts `messages` and `memberId`.                               |
| `/api/feedback` | POST   | Sends feedback/newsletter/bug reports via Gmail SMTP (nodemailer). Falls back gracefully if credentials are missing. |
| `/api/checkout` | POST   | Creates a Stripe Checkout session. Not active — requires `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` env vars.         |

---

## Status

| Feature                                         | Status                                |
| ----------------------------------------------- | ------------------------------------- |
| DM chat with Peter Thiel (streaming)            | ✅ Works                              |
| Peter Thiel persona + system prompt             | ✅ Works                              |
| Sidebar navigation (5 views)                    | ✅ Works                              |
| Profile editor (name, description, avatar)      | ✅ Works                              |
| Inbox (demo messages)                           | ✅ Works (hardcoded data)             |
| Context panel (decisions, tasks, notes)         | ✅ Works (hardcoded data)             |
| Mobile layout (drawer, tab bar, briefing strip) | ✅ Works                              |
| Feedback widget                                 | ✅ Works (requires Gmail credentials) |
| Threads view                                    | ⏳ Placeholder                        |
| Tasks view                                      | ⏳ Placeholder                        |
| Calendar view                                   | ⏳ Placeholder                        |
| Additional AI members                           | ⏳ Slots exist, no personas           |
| Database persistence (Neon)                     | ❌ Not built                          |
| Conversation history persistence                | ❌ Not built (in-memory only)         |
| Member memory across sessions                   | ❌ Not built                          |
| Task assignment and tracking                    | ❌ Not built                          |
| Group threads (multi-member)                    | ❌ Not built                          |
| Stripe checkout flow                            | ❌ Not active                         |
