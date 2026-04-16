# Modryn Studio — User Guide

This is the internal AI company operating system for Modryn Studio. One user: the founder (Luke). Additional human members can be invited by the admin.

---

## First Launch — Setup

When you first sign in and no profile exists, the app shows a setup screen instead of the main workspace:

1. **Your name** (required) — enter your name and press Enter or click "Save"
2. **Company description** (optional) — a one-line description of the studio

After saving, if no projects exist the app shows the **New Project** screen. Enter a project name and click **Create project**. The main workspace loads once a project is created.

You will not see these screens again unless the profile or projects are cleared from the database.

---

## Projects

All conversations, tasks, decisions, and org memory are scoped to a project. You must have at least one project to use the workspace.

### Switching projects

The project name appears at the top of the sidebar roster (below the app name). Click it to open the project dropdown.

- The dropdown floats over sidebar content — it never pushes members down.
- Click a project row to switch. The workspace reloads for that project.
- Only your conversations, tasks, and memory for that project are shown.

### Creating a new project

In the project dropdown, click **+ New project** (bottom row). The workspace switches to the creation form. Enter a name and click **Create project**.

On mobile, open the team drawer (top-left menu icon) to find the project switcher.

### Renaming a project

1. Open the project dropdown
2. Hover a project row — a pencil icon appears on the right
3. Click the pencil to enter edit mode
4. Type the new name — **Enter** to save, **Escape** to cancel. Clicking away also saves.

Renames are saved immediately to the database. The sidebar updates optimistically and reverts silently if the save fails.

### Deleting a project

1. Open the project dropdown
2. Hover a project row — a trash icon appears to the right of the pencil (always visible on mobile)
3. Click the trash icon — the dropdown replaces the project list with a confirmation panel
4. Type the project name exactly in the input field
5. Click **Delete** (or press Enter) to confirm — or click **Cancel** (or press Escape) to go back

Deleting a project permanently removes all conversations, messages, tasks, decisions, and memory scoped to that project. Uploaded images that are not referenced by any other project are also deleted from storage. The workspace switches to the next available project automatically. If no projects remain, the New Project screen appears.

---

## Authentication

**Sign in:** Go to `/auth/sign-in`. Enter your email and password. Redirects to the main workspace on success.

**Sign up:** New accounts require an invite link from the admin. The link format is `/auth/sign-up?token=...`. Without a valid token, sign-up is blocked. The admin (luke@modrynstudio.com) can always create an account without a token.

**Sign out:** Click the sign-out button at the bottom of the sidebar icon rail.

---

## Layout

The app is a single full-screen workspace with three zones:

1. **Sidebar** (left, desktop only) — icon rail + team roster
2. **Main panel** (center) — chat, inbox, or placeholder views
3. **Context panel** (right, desktop only) — member decisions, tasks, notes

On mobile: the sidebar becomes a slide-out drawer (tap the menu icon in the header), a bottom tab bar handles navigation, and the context panel opens as a pull-up sheet via the "Briefing" strip above the tab bar.

When in DM chat view, the mobile header shows the active member's name and role in the center, with their avatar on the right. In all other views, it shows the Modryn Studio logo centered and your founder avatar on the right.

---

## Sidebar

### Icon rail

Five navigation icons:

- **DMs** (`MessageSquare` icon) — one-on-one chat (default view)
- **Inbox** (`Inbox` icon) — async messages from members
- **Threads** (`MessagesSquare` icon) — group async threads
- **Tasks** (`CheckSquare` icon) — task board
- **Reddit** (`Globe` icon) — Reddit thread fetcher

### Team roster

The roster lists all members fetched from the database. Each row shows:

- Avatar (initials chip, `rounded-sm` square)
- Name and role
- Status dot + label (`online` / `analyzing` / `away`)
- A `GripVertical` drag handle on the left (admin only)

Click any AI member row to open a DM with them.

**Reorder members (admin only):** Drag a row using the grip handle. A thin insertion line appears between rows to show the drop position. Release to confirm. The new order is saved to the database immediately.

**Edit a member (admin only):** Hover a member row to reveal a pencil icon on the right side of the avatar. Click it to open the member in edit mode — the same Add Member sheet but pre-filled with that member's data. Saves via PATCH to `/api/members/[id]`.

### Footer actions (admin only)

Two icon buttons appear at the bottom of the sidebar for admin users only:

- **`Plus` icon** — "Add AI member" — opens the Add Member sheet
- **`UserPlus` icon** — "Invite person" — opens the Invite Member sheet

These buttons are hidden for non-admin users.

### Your profile

Your avatar appears at the very bottom of the sidebar. Click it to open the Profile sheet.

---

## DM Chat

Click an AI member in the roster to open a conversation.

- Type in the input at the bottom. On desktop, press **Enter** to send (Shift+Enter for a new line). On mobile, use the send button — Enter inserts a newline.
- Click the **Paperclip** icon to attach a file. The file content is sent along with your message. Multiple files can be attached before sending.
- The AI responds in real-time via streaming. The status dot pulses amber + shows "analyzing" during generation.
- While streaming, a `— generating` label appears next to the member's timestamp. For Michelle Lim (web search member), this changes to `— searching` during the web search phase, and "searching the web..." replaces the thinking dots in the message body.
- AI messages appear on a slightly darker cream surface with a mono "AI" badge.
- Your messages appear on the standard panel background.
- Conversation history is fetched from the database on load. Messages persist across sessions.
- The disclaimer at the bottom: "Responses reflect AI modeling only, not the views of real individuals."

**Message actions (AI messages):** Hover an AI message (desktop) or it's always visible on mobile. Four icon buttons appear top-right:

- **Copy** (`Copy` icon) — copies the message text to clipboard
- **Retry** (`RotateCcw` icon) — re-sends the last user message (only on the most recent AI response)
- **Log Decision** (`Bookmark` icon) — opens an inline form to save a decision entry (title + description) linked to this conversation
- **Log Org Memory** (`Users` icon) — opens an inline form to save a team-wide fact to org memory

**Message actions (your messages):** Hover reveals Copy and Edit (`Pencil`) buttons. Edit opens an inline textarea — confirm to re-send from that point. On mobile, long-press any message to open an action sheet with the same options.

**Web search citations (Michelle only):** After a response that used web search, citation chips appear below the message body under a "Sources" label. Each chip shows the domain name and links to the source URL.

The context panel on the right (desktop) shows **Decisions** and **Tasks** for the active member, fetched live from the database (active/pending tasks assigned to this member within this project, and logged decisions for this project). Each section is expandable/collapsible. Click the toggle icon in the top-right of the chat header to collapse or expand the panel.

---

## Inbox

Switch to Inbox via the sidebar icon or mobile tab bar.

The inbox is currently empty — `INBOX_MESSAGES` is an empty array. The list and detail view are fully wired but have no data source yet (member-initiated async messages are not yet implemented).

---

## Threads

Switch to Threads via the sidebar icon or mobile tab bar.

- Click **New Thread** to open a creation sheet: enter an optional title, a brief (your initial message to the team), select a preset sequence type (Strategy, Technical, Design, Launch, Brainstorm, or Custom), and optionally exclude specific members by clicking the eye icon on their row. Excluded members are skipped entirely — they won't receive the brief or generate a response. Drag rows to reorder the sequence. Title is optional — threads without one display as _Untitled_.
- Once created, the thread opens in detail view. Each selected member responds in sequence — their responses stream in one at a time.
- For Michelle Lim (web search member), a static "searching the web..." note appears in her generating bubble while she's running a web search.
- All responses are persisted to DB. The thread history is visible on reload.
- Hover any completed AI response (desktop) to reveal **Copy**, **Log Decision**, and **Log Org Memory** buttons — identical behavior to DM chat.
- Web search citation chips appear below Michelle's responses when she performed a search.
- Org facts are extracted from the full thread transcript after all members have responded.
- A **synthesize button** (document icon, top-right of the thread view) runs Haiku against the current transcript and proposes decisions and tasks. A panel slides up at the bottom with the proposed items — confirm each one to save it to the DB, or click ✕ to dismiss.

---

## Tasks

Switch to Tasks via the sidebar icon or mobile tab bar.

The task board shows all tasks assigned to AI members. Active tasks (pending, in progress, blocked) appear above completed ones.

**Create a task:** Click **New Task** (top right) to open a slide-in sheet. Enter a title (required), an optional description, and pick an assigned member. Click **Create** to save.

**Execute a task:** Click the **Play** button on a task card. The assigned member processes the task using their system prompt, company context, and org memory. Michelle Lim also has web search access during execution. The card shows a pulse dot and `IN PROGRESS` status while generating. When done, the status changes to `DONE` and the output panel becomes available.

**View output:** Click the chevron on a task card to expand the output panel. The output renders as prose Markdown. Click **Copy** in the output panel header to copy the full text to clipboard.

**Task statuses:** `PENDING` (default, not yet run), `IN PROGRESS` (currently executing), `DONE` (completed), `BLOCKED` (manually set via API).

---

## Placeholder Views

Calendar shows a placeholder screen. It is not yet functional:

- **Calendar (`##`)** — "Scheduling, milestones, and AI-coordinated meeting prep — coming in the next release."

---

## Profile Editor

Click your avatar at the bottom of the sidebar to open the profile sheet.

- **Avatar** — click to upload a photo. Stored as base64 in the database (`founder_profile.avatar_url`).
- **Name** — click to edit inline. Saves on blur or Enter.
- **Description** — click to edit inline. Multi-line supported.

Profile data is stored in the Neon database (`founder_profile` table). Changes persist across devices and sessions.

---

## Add AI Member (admin only)

Click the **`+` icon** at the bottom of the sidebar. A slide-in sheet (dark chrome zone) opens with four fields:

- **Name** (required)
- **Role / title** (required)
- **System prompt** (required) — the personality and behavioral instructions for this member
- **Personality notes** (optional) — supplemental context

Click **Add member** to save to the database. The roster updates immediately.

---

## Invite a Person (admin only)

Click the **`UserPlus` icon** at the bottom of the sidebar. A sheet opens:

- **Email (optional)** — lock the invite to a specific email address, or leave blank for open invite
- Click **Generate invite link** — calls `/api/invites`, returns a one-time URL
- Copy the link and send it to the person manually
- Links expire after 7 days. Each token is single-use.

---

## Status

| Feature                                            | Status                       |
| -------------------------------------------------- | ---------------------------- |
| Sign in / sign out (Neon Auth)                     | ✅ Works                     |
| Invite-gated sign up                               | ✅ Works                     |
| Admin role gate (add member, invite)               | ✅ Works                     |
| Setup screen (first launch)                        | ✅ Works                     |
| Multi-project architecture (create, switch)        | ✅ Works                     |
| Rename project (inline in dropdown)                | ✅ Works                     |
| Delete project (typed-name confirm + blob cleanup) | ✅ Works                     |
| Project context injection into AI prompts          | ✅ Works                     |
| DM chat with AI members (streaming)                | ✅ Works                     |
| Conversation persistence (DB)                      | ✅ Works                     |
| Member system prompt + memory injection            | ✅ Works                     |
| Company context injection (founding doc)           | ✅ Works                     |
| Episodic memory summarization (post-session)       | ✅ Works                     |
| Semantic memory (behavioural patterns)             | ✅ Works                     |
| Org memory extraction (DMs + threads)              | ✅ Works                     |
| Token budget context assembly                      | ✅ Works                     |
| Group threads (multi-member, sequential)           | ✅ Works                     |
| Michelle web search (DMs + threads + tasks)        | ✅ Works                     |
| Add AI member sheet                                | ✅ Works                     |
| Edit AI member sheet (hover row → pencil icon)     | ✅ Works                     |
| Drag-to-reorder members                            | ✅ Works                     |
| Invite person sheet                                | ✅ Works                     |
| Founder profile editor (name, description, photo)  | ✅ Works                     |
| Sidebar navigation                                 | ✅ Works                     |
| Context panel (decisions, tasks)                   | ✅ Works                     |
| Thread decision/task synthesis                     | ✅ Works                     |
| Inbox                                              | ⏳ UI only — no messages yet |
| Member-initiated async messages                    | ❌ Not built                 |
| Task board                                         | ✅ Works                     |
| Calendar                                           | ❌ Not built                 |
| Reddit thread fetcher + saved threads              | ✅ Works                     |
