# Brand

## Voice

How the product sounds in UI copy, headings, CTAs, error messages, and status labels.

- Direct and functional. No setup, no softening. Say the thing.
- Technical precision over warmth - system language, not consumer app language.
- Honest about AI nature. Always label it. Never pretend the AI is human.
- Status language is exact: "online", "analyzing", "generating" - not "thinking" or "loading".
- First-principles framing: ask the fundamental question. Strip the surface question away.
- Mono font for system/meta text signals intentionality, not decoration.
- Never use: "powerful", "seamless", "unlock", "supercharge", "AI-powered", "next-level", "revolutionary"

---

## The User

A solo founder building a serious digital business who thinks in frameworks and makes decisions through debate. They want strategic challenge, not agreement. They've tried generic AI tools and found them too agreeable to be useful.

---

## Visual Rules

- Color mode: Split-tone - dark chrome (sidebar, nav rail, headers) with warm cream content panels (chat, inbox, context pane). Not dark mode throughout. No system toggle.
- Fonts: Inter (body, UI text) + JetBrains Mono (system labels, timestamps, badges, mono content)
- Avatars: Square (`rounded-sm`), not circular - deliberate departure from standard workspace UI.
- Motion: Minimal. Pulse animation for active/streaming status only. No scroll animations.
- Density: Information-dense. Workspace aesthetic - not marketing page aesthetic.
- Avoid: Gradients, bright fills, rounded pill shapes, stock photography, popups, onboarding modals.

---

## Color System

Two distinct zones with different palettes:

### Dark chrome (sidebar, nav rail, mobile header/tabs)

| Name                | Token                        | Value                  | Role                                        |
| ------------------- | ---------------------------- | ---------------------- | ------------------------------------------- |
| Nav rail bg         | `--color-sidebar-rail`       | `oklch(0.07 0 0)`      | Icon rail background, darkest surface       |
| Sidebar bg          | `--color-sidebar`            | `oklch(0.10 0 0)`      | Roster panel background                     |
| Sidebar accent      | `--color-sidebar-accent`     | `oklch(0.28 0 0)`      | Hover + active row highlight in roster      |
| Sidebar border      | `--color-sidebar-border`     | `oklch(0.18 0 0)`      | Rail + roster dividers                      |
| Sidebar text        | `--color-sidebar-foreground` | `oklch(0.85 0 0)`      | Body text — member names, nav labels        |
| Sidebar active text | `--color-sidebar-primary`    | `oklch(0.93 0 0)`      | Near-white — selected names, active UI text |
| Sidebar muted       | `--color-sidebar-muted`      | `oklch(0.55 0 0)`      | Secondary labels, roles, timestamps         |
| Status active       | `--color-status-active`      | `#d4922a`              | Analyzing / unread / streaming dot          |
| Status online       | `--color-status-online`      | `oklch(0.72 0.19 160)` | Online presence dot                         |
| Status generating   | `--color-status-generating`  | `oklch(0.55 0.08 80)`  | "generating" label during streaming         |

### Warm cream panels (chat, inbox, context pane)

| Name                 | Token                             | Value                   | Role                                        |
| -------------------- | --------------------------------- | ----------------------- | ------------------------------------------- |
| Chat bg              | `--color-panel`                   | `oklch(0.965 0.004 80)` | Main reading surface, warm off-white        |
| AI surface           | `--color-ai-surface`              | `oklch(0.94 0.004 80)`  | AI message rows, slightly darker than chat  |
| Context bg           | `--color-context`                 | `oklch(0.955 0.004 80)` | Right context panel background              |
| Input surface        | `--color-panel-input`             | `oklch(0.945 0.003 80)` | Textarea/input background                   |
| Selected row         | `--color-panel-selected`          | `oklch(0.93 0.004 80)`  | Active inbox/list row highlight             |
| Panel border         | `--color-panel-border`            | `oklch(0.88 0.004 80)`  | Row dividers, input borders in chat/inbox   |
| AI message border    | `--color-ai-border`               | `oklch(0.85 0.005 80)`  | AI message row bottom border                |
| Context border       | `--color-context-border`          | `oklch(0.87 0.004 80)`  | Context panel border + inner cards          |
| Panel text           | `--color-panel-foreground`        | `oklch(0.15 0 0)`       | Primary body text on cream                  |
| Panel text secondary | `--color-panel-text`              | `oklch(0.25 0 0)`       | Secondary body text                         |
| Panel text tertiary  | `--color-panel-text-secondary`    | `oklch(0.4 0 0)`        | Tertiary / dimmer labels                    |
| Panel muted          | `--color-panel-muted`             | `oklch(0.5 0 0)`        | Timestamps, secondary labels                |
| Panel faint          | `--color-panel-faint`             | `oklch(0.6 0 0)`        | Placeholder / low-priority metadata         |
| Panel text hover     | `--color-panel-foreground-hover`  | `oklch(0.25 0 0)`       | Hover state for panel body text             |
| Panel inverse        | `--color-panel-inverse`           | `oklch(0.9 0 0)`        | Light text on dark chips within cream zone  |
| In-panel avatar bg   | `--color-panel-chrome`            | `oklch(0.82 0 0)`       | Founder avatar chip background              |
| In-panel avatar dark | `--color-panel-chrome-strong`     | `oklch(0.65 0 0)`       | AI member avatar chip background            |
| In-panel avatar text | `--color-panel-chrome-foreground` | `oklch(0.4 0 0)`        | Initials text inside avatar chips           |
| AI badge bg          | `--color-panel-badge`             | `oklch(0.9 0.002 80)`   | "AI" badge background in chat/inbox headers |

### Brand tokens (shared)

| Name      | Hex     | Role                                                          |
| --------- | ------- | ------------------------------------------------------------- |
| Accent    | #E4E4E7 | Near-white neutral — active states, selected items (zinc-200) |
| Secondary | #D4922A | Status — analyzing, unread, streaming (warm amber)            |

Note: `--color-secondary` and `--color-status-active` share the same amber value (`#d4922a`). `--color-secondary` is the brand token alias; `--color-status-active` is the semantic status alias. Use the semantic token (`bg-status-active`) in component code.

### Logomark palette

These are the identity neutrals inside the mark and should guide small detailing in the dark chrome zone.

| Name              | Hex     | Role                                                       |
| ----------------- | ------- | ---------------------------------------------------------- |
| Logomark charcoal | #3C3E42 | Deepest face of the mark, cool neutral anchor              |
| Logomark steel    | #54585B | Mid-dark structural neutral                                |
| Logomark slate    | #788084 | Cool muted highlight, suitable for selected rail indicator |
| Logomark mist     | #7E848D | Lightest mark plane, suitable for subtle chrome highlights |

Color rules:

- The split-tone contrast is deliberate. Dark chrome frames the reading surface. Do not flatten to all-dark or all-light.
- Warm cream panels read as "paper" - ambient temperature is warm, not cool gray.
- The chat background is `--color-panel` and the right context panel is `--color-context`. Those values are intentional and should not drift during UI work.
- Use the logomark palette only as cool detailing inside the dark chrome zone. Do not pull those cool neutrals into the cream reading surfaces.
- Do not introduce a separate blue interaction color into the product UI. The neutral accent and amber status system already define emphasis.
- Notion owns purple-gray. Avoid entirely.
- No pure black (#000000) or pure white (#ffffff) anywhere.
- No gradients anywhere in the product UI.
- Zinc is the neutral scale for dark chrome (zinc-200 for text, zinc-500/600 for muted, zinc-700 for AI badge backgrounds).

---

## Component Zones

Every UI component belongs to one of two token zones. Never mix tokens across zones.

### Dark chrome zone
Components: Sidebar, nav rail, mobile header/tabs, `ProfileSheet`, `AddMemberSheet`
- Background: `bg-sidebar` / `bg-sidebar-rail`
- Text: `text-sidebar-primary` (active), `text-sidebar-foreground` (body), `text-sidebar-muted` (labels)
- Borders: `border-sidebar-border`
- Input underlines / focus rings: `border-sidebar-ring`
- Hover rows: `bg-sidebar-accent`

### Warm cream zone
Components: `ChatView`, `InboxView`, `ContextPanel`, `PlaceholderView`, `SetupView`
- Background: `bg-panel` (chat/inbox), `bg-context` (right pane)
- Text: `text-panel-foreground` (primary), `text-panel-text` (secondary), `text-panel-muted` (timestamps), `text-panel-faint` (placeholders)
- Borders: `border-panel-border`
- Inputs: `bg-panel-input`
- AI messages: `bg-ai-surface` / `border-ai-border`
- Avatars in panel: `bg-panel-chrome` (founder), `bg-panel-chrome-strong` (AI member), `text-panel-chrome-foreground` (initials)

---

## Logomark

**Direction:** Single letterform - "M" for Modryn. Mono-weight, square, minimal.

**Palette:** #3C3E42, #54585B, #788084, #7E848D.

**Background:** Transparent. No enclosing circle, badge, or gradient plate.

**UI implication:** The mark is cool and architectural. The app chrome can borrow from that cool neutral family for small details, but the reading surfaces stay warm cream.

**Future-proofing:** Not tied to a niche. Abstract enough to work across internal tools, operator software, and future studio products.

**Competitor exclusions:** Avoid glossy gradients, soft blob marks, consumer-SaaS color explosions, and generic chat-bubble iconography as the primary brand identifier.

**Anti-patterns:** No circle badge, no sparkle, no waveform, no robot head, no anthropomorphic AI mascot.

---

## Emotional Arc

What a visitor feels at each stage - land, read, scroll, convert.

- Land: <!-- TODO: Example: "Wait, this is different" -->
- Read: <!-- TODO: Example: "This person actually builds real things" -->
- Scroll: <!-- TODO: Example: "I want to follow this journey" -->
- Convert: <!-- TODO: Example: "I don't want to miss the next one" -->

---

## Copy Examples

Real copy to use as reference when writing UI text.

- Hero: <!-- TODO: Example: "Tools for people who don't have time for bad software." -->
- CTA: <!-- TODO: Example: "Don't miss the drop." -->
- Footer: <!-- TODO: Example: "Built by one person. Shipped anyway." -->
- Error: <!-- TODO: Example: "Something went wrong. Try again." -->
