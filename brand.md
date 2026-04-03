# Brand

## Voice

How the product sounds in UI copy, headings, CTAs, error messages, and status labels.

- Direct and functional. No setup, no softening. Say the thing.
- Technical precision over warmth — system language, not consumer app language.
- Honest about AI nature. Always label it. Never pretend the AI is human.
- Status language is exact: "online", "analyzing", "generating" — not "thinking" or "loading".
- First-principles framing: ask the fundamental question. Strip the surface question away.
- Mono font for system/meta text signals intentionality, not decoration.
- Never use: "powerful", "seamless", "unlock", "supercharge", "AI-powered", "next-level", "revolutionary"

---

## The User

A solo founder building a serious digital business who thinks in frameworks and makes decisions through debate. They want strategic challenge, not agreement. They've tried generic AI tools and found them too agreeable to be useful.

---

## Visual Rules

- Color mode: Split-tone — dark chrome (sidebar, nav rail, headers) with warm cream content panels (chat, inbox, context pane). Not dark mode throughout. No system toggle (internal tool).
- Fonts: Inter (body, UI text) + JetBrains Mono (system labels, timestamps, badges, mono content)
- Avatars: Square (`rounded-sm`), not circular — deliberate departure from standard workspace UI.
- Motion: Minimal. Pulse animation for active/streaming status only. No scroll animations.
- Density: Information-dense. Workspace aesthetic — not marketing page aesthetic.
- Avoid: Gradients, bright fills, rounded pill shapes, stock photography, popups, onboarding modals.

---

## Color System

Two distinct zones with different palettes:

### Dark chrome (sidebar, nav rail, mobile header/tabs)

| Name           | Approx     | Role                                                      |
| -------------- | ---------- | --------------------------------------------------------- |
| Sidebar bg     | ~#1a1a1a   | Leftmost chrome -- darkest surface                        |
| Sidebar accent | ~#1e1e1e   | Hover + active row highlight in sidebar                   |
| Sidebar border | ~#232323   | Rail + roster dividers                                    |
| Sidebar text   | zinc-200   | Primary member names, nav labels                          |
| Sidebar muted  | zinc-500   | Secondary labels, roles, timestamps                       |
| Status active  | #9EB421    | Analyzing / unread / streaming dot                        |
| Status online  | emerald-500 | Online presence dot                                      |

### Warm cream panels (chat, inbox, context pane)

| Name          | Approx                | Role                                                  |
| ------------- | --------------------- | ----------------------------------------------------- |
| Panel bg      | oklch(0.965 0.004 80) | Main reading surface -- warm off-white                |
| AI surface    | oklch(0.94 0.004 80)  | AI message rows -- slightly tinted from panel         |
| Context bg    | oklch(0.955 0.004 80) | Right context panel background                        |
| Panel border  | oklch(0.88 0.004 80)  | Row dividers, input borders within panels             |
| Panel text    | oklch(0.15-0.2 0 0)   | Body text in panels -- near-black on cream            |
| Panel muted   | oklch(0.55-0.6 0 0)   | Timestamps, secondary labels in panels                |
| Input surface | oklch(0.945 0.003 80) | Textarea/input background                             |

### Brand tokens (shared)

| Name      | Hex     | Role                                                              |
| --------- | ------- | ----------------------------------------------------------------- |
| Accent    | #4B57D8 | Interactive primary -- active sidebar state, CTAs, selected items |
| Secondary | #9EB421 | Status -- analyzing, unread, streaming                            |

Color rules:

- The split-tone contrast is deliberate. Dark chrome frames the reading surface. Don't flatten to all-dark or all-light.
- Warm cream panels read as "paper" -- ambient temperature is warm, not cool gray.
- Notion owns purple-gray. Avoid entirely.
- No pure black (#000000) or pure white (#ffffff) anywhere.
- No gradients anywhere in the product UI.
- Zinc is the neutral scale for dark chrome (zinc-200 for text, zinc-500/600 for muted, zinc-700 for AI badge backgrounds).

---
## Logomark

**Direction:** Single letterform — "M" for Modryn. Mono-weight, square, minimal.

**Primary color:**

<!-- TODO: Which brand color is the mark rendered in? Example: "Accent #FF6B6B" -->

**Background:**

<!-- TODO: Transparent, contained circle, etc.? Example: "Transparent — no container" -->

**Future-proofing:**

<!-- TODO: Is the mark tied to the current niche, or scalable? Example: "No birthday-specific imagery — mark must work if product expands to anniversaries/graduations" -->

**Competitor exclusions:**

<!-- TODO: What visual territory does your main competitor own that you must avoid? Example: "Competitor owns pink-purple gradient circle + music note — avoid: gradients, circle badges, music notes" -->

**Anti-patterns:**

<!-- TODO: Broader category clichés to avoid. Example: "No music notes, no headphones, no waveform bars, no vinyl" -->

---

## Emotional Arc

What a visitor feels at each stage — land, read, scroll, convert.

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
