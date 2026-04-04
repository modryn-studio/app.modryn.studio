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

| Name           | Token                        | Value                 | Role                                   |
| -------------- | ---------------------------- | --------------------- | -------------------------------------- |
| Sidebar bg     | `--color-sidebar`            | `oklch(0.10 0 0)`     | Leftmost chrome, darkest surface       |
| Sidebar accent | `--color-sidebar-accent`     | `oklch(0.18 0 0)`     | Hover + active row highlight in roster |
| Sidebar border | `--color-sidebar-border`     | `oklch(0.18 0 0)`     | Rail + roster dividers                 |
| Sidebar text   | `--color-sidebar-foreground` | `oklch(0.85 0 0)`     | Primary member names, nav labels       |
| Sidebar muted  | component zinc scale         | `zinc-500/600`        | Secondary labels, roles, timestamps    |
| Status active  | `--color-status-active`      | `oklch(0.72 0.12 75)` | Analyzing / unread / streaming dot     |
| Status online  | component utility            | `emerald-500`         | Online presence dot                    |

### Warm cream panels (chat, inbox, context pane)

| Name           | Token                      | Value                   | Role                                       |
| -------------- | -------------------------- | ----------------------- | ------------------------------------------ |
| Chat bg        | `--color-panel`            | `oklch(0.965 0.004 80)` | Main reading surface, warm off-white       |
| AI surface     | `--color-ai-surface`       | `oklch(0.94 0.004 80)`  | AI message rows, slightly darker than chat |
| Context bg     | `--color-context`          | `oklch(0.955 0.004 80)` | Right context panel background             |
| Input surface  | `--color-panel-input`      | `oklch(0.945 0.003 80)` | Textarea/input background                  |
| Panel border   | `--color-panel-border`     | `oklch(0.88 0.004 80)`  | Row dividers, input borders in chat/inbox  |
| Context border | `--color-context-border`   | `oklch(0.87 0.004 80)`  | Context panel border + inner cards         |
| Panel text     | `--color-panel-foreground` | `oklch(0.15 0 0)`       | Primary body text on cream                 |
| Panel muted    | `--color-panel-muted`      | `oklch(0.5 0 0)`        | Timestamps, secondary labels               |
| Panel faint    | `--color-panel-faint`      | `oklch(0.6 0 0)`        | Placeholder / low-priority metadata        |

### Brand tokens (shared)

| Name      | Hex     | Role                                                          |
| --------- | ------- | ------------------------------------------------------------- |
| Accent    | #E4E4E7 | Near-white neutral — active states, selected items (zinc-200) |
| Secondary | #D4922A | Status — analyzing, unread, streaming (warm amber)            |

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
- The accent blue `#4B57D8` is for interaction and emphasis, not for filling large surfaces.
- Notion owns purple-gray. Avoid entirely.
- No pure black (#000000) or pure white (#ffffff) anywhere.
- No gradients anywhere in the product UI.
- Zinc is the neutral scale for dark chrome (zinc-200 for text, zinc-500/600 for muted, zinc-700 for AI badge backgrounds).

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
- Footer: <!-- TODO: Example: "Built by Luke. Paid for by a day job. Shipping anyway." -->
- Error: <!-- TODO: Example: "Something went wrong. Try again." -->
