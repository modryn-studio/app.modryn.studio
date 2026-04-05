# Modryn Studio — User Guide

This is the internal AI company operating system for Modryn Studio. One user: the founder (Luke). Additional human members can be invited by the admin.

---

## First Launch — Setup

When you first sign in and no profile exists, the app shows a setup screen instead of the main workspace:

1. **Your name** (required) — enter your name and press Enter or click "Save"
2. **Company description** (optional) — a one-line description of the studio

After saving, the main workspace loads. You will not see this screen again unless the profile is cleared from the database.

---

## Authentication

**Sign in:** Go to `/auth/sign-in`. Enter your email and password. Redirects to the main workspace on success.

**Sign up:** New accounts require an invite link from the admin. The link format is `/auth/sign-up?token=...`. Without a valid token, sign-up is blocked. The admin (luke@modrynstudio.com) can always create an account without a token.

**Sign out:** Not yet exposed in the UI — use Neon Auth session management directly.

---

## Layout

The app is a single full-screen workspace with three zones:

1. **Sidebar** (left, desktop only) — icon rail + team roster
2. **Main panel** (center) — chat, inbox, or placeholder views
3. **Context panel** (right, desktop only) — member decisions, tasks, notes

On mobile: the sidebar becomes a slide-out drawer (tap the menu icon in the header), a bottom tab bar handles navigation, and the context panel opens as a pull-up sheet via the "Briefing" strip above the tab bar.

---

## Sidebar

### Icon rail

Two active navigation icons:

- **DMs** (`MessageSquare` icon) — one-on-one chat (default view)
- **Inbox** (`Inbox` icon) — async messages from members

### Team roster

The roster lists all members fetched from the database. Each row shows:

- Avatar (initials chip, `rounded-sm` square)
- Name and role
- Status dot + label (`online` / `analyzing` / `away`)

Click any AI member row to open a DM with them.

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

- Type in the input at the bottom. Press **Enter** to send (Shift+Enter for a new line).
- The AI responds in real-time via streaming. The status dot pulses amber + shows "analyzing" during generation.
- AI messages appear on a slightly darker cream surface with a mono "AI" badge.
- Your messages appear on the standard panel background.
- Conversation history is fetched from the database on load. Messages persist across sessions.
- The disclaimer at the bottom: "Responses reflect AI modeling only, not the views of real individuals."

The context panel on the right (desktop) shows **Recent Decisions**, **Active Tasks**, and **Conversation Notes** for the active member. Each section is expandable/collapsible. Data is currently hardcoded per member — not yet persisted from conversations.

---

## Inbox

Switch to Inbox via the sidebar icon or mobile tab bar.

The inbox is currently empty — `INBOX_MESSAGES` is an empty array. The list and detail view are fully wired but have no data source yet (member-initiated async messages are not yet implemented).

---

## Placeholder Views

Threads, Tasks, and Calendar show placeholder screens. These are not functional:

- **Threads (`///`)** — "Async conversation threads across the entire team — coming in the next release."
- **Tasks (`[ ]`)** — "Shared task management with AI assignment and tracking — coming in the next release."
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

## API Routes

| Route                        | Method | What it does                                                                                             |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `/api/chat`                  | POST   | Streams AI response via Anthropic (Claude). Reads member system prompt + memory from DB. Saves messages. |
| `/api/members`               | GET    | Returns all members from DB                                                                              |
| `/api/members`               | POST   | Creates a new AI member. Admin only.                                                                     |
| `/api/conversations/dm/[id]` | GET    | Returns conversation history for a DM                                                                    |
| `/api/profile`               | GET    | Returns founder profile from DB                                                                          |
| `/api/profile`               | PATCH  | Updates founder profile (name, description, avatar)                                                      |
| `/api/me`                    | GET    | Returns current user's role (`admin` or `member`)                                                        |
| `/api/invites`               | GET    | Lists all invite tokens. Admin only.                                                                     |
| `/api/invites`               | POST   | Creates a new invite token. Admin only.                                                                  |
| `/api/auth/[...path]`        | ALL    | Neon Auth proxy — rewrites origin for Vercel preview deployments                                         |

---

## Status

| Feature                                           | Status                         |
| ------------------------------------------------- | ------------------------------ |
| Sign in / sign out (Neon Auth)                    | ✅ Works                       |
| Invite-gated sign up                              | ✅ Works                       |
| Admin role gate (add member, invite)              | ✅ Works                       |
| Setup screen (first launch)                       | ✅ Works                       |
| DM chat with AI members (streaming)               | ✅ Works                       |
| Conversation persistence (DB)                     | ✅ Works                       |
| Member system prompt + memory injection           | ✅ Works                       |
| Add AI member sheet                               | ✅ Works                       |
| Invite person sheet                               | ✅ Works                       |
| Founder profile editor (name, description, photo) | ✅ Works                       |
| Sidebar navigation                                | ✅ Works                       |
| Context panel (decisions, tasks, notes)           | ⏳ UI only — data is hardcoded |
| Inbox                                             | ⏳ UI only — no messages yet   |
| Member-initiated async messages                   | ❌ Not built                   |
| Group threads                                     | ❌ Not built                   |
| Task board                                        | ❌ Not built                   |
| Calendar                                          | ❌ Not built                   |
| Memory summarization (post-session)               | ❌ Not built                   |

- Unread indicator (amber dot)
- Sender name and AI badge
- Subject line and preview
- Full message body when selected

Messages are currently hardcoded demo data — not generated dynamically.
