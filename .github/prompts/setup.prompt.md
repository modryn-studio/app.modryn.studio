---
name: setup
description: Reads context.md, development-principles.md, and brand.md, then fills in copilot-instructions.md and site.ts for a new project
agent: agent
---

Read the following files from the workspace root:

1. `context.md` — project-specific facts: product name, what it does, who it's for, stack additions, and routes
2. `development-principles.md` — product philosophy to inform tone
3. `brand.md` — voice, visual rules, target user, emotional arc, and copy examples

Then edit `.github/copilot-instructions.md` and replace every `<!-- TODO -->` section with real content:

- **[Project Name]** — the product name from context.md
- **Who I Am** — 2–4 sentences: who Luke is, what the product does, who it's for. Use development-principles.md for tone (fast shipper, AI-assisted builder, micro-niche focus).
- **Stack** — read `package.json` as the source of truth: list only what is actually installed. Use context.md for planned/future additions and flag them as "not yet installed". Never list something as part of the stack if it isn't in `package.json`.
- **Project Structure** — keep `/app`, `/components`, `/lib`. Add any project-specific directories from context.md. Remove the `<!-- TODO -->` comment.
- **Route Map** — list every route from context.md with a one-line description. Always include `/privacy` and `/terms`.
- **Brand & Voice** — populate from brand.md: voice rules, visual rules (colors, fonts, motion), target user description, emotional arc, and copy examples to use as reference.
- **Tailwind v4 @theme example** — find the `<!-- TODO: update the @theme example below... -->` comment in copilot-instructions.md. Replace the placeholder color values in the `@theme { }` block immediately below it with the actual brand colors from `brand.md`. Update both the hex values and the inline comments (color name + role). Also update the `/* ❌ wrong */` `:root` example to use the real accent color.

Also fill in `src/config/site.ts` — replace every `TODO:` placeholder with real content from context.md and brand.md:

- `name` / `shortName` — product name from context.md
- `url` — from the **URL** section of context.md. Use the URL as-is — do not extract a slug. **If the URL section is blank, do NOT guess — stop and tell Luke: "Fill in the URL field in context.md (e.g. https://lawnagent.app)".**
- `description` — 110–160 char meta description that describes what the product does and who it's for
- `ogTitle` — 50–60 char title formatted as "Product Name | Short Value Prop"
- `ogDescription` — 110–160 char OG description, slightly more marketing-forward than the meta description
- `cta` -- short CTA button label (5--8 words) for the OG image pill; pull from brand's primary action or pricing copy (e.g. `'Get your plan for $9 →'`, `'Start for free →'`)
- `founder` — from context.md or default to "Luke Hanner"
- `accent` / `bg` — brand colors from brand.md (hex values)
- `social.twitter` / `social.twitterHandle` — X/Twitter profile URL and handle (e.g. `@lukehanner`) from the Social Profiles section of context.md
- `social.github` — GitHub URL from the Social Profiles section of context.md
- Any other social entries listed in context.md (e.g. `devto`, `shipordie`) — uncomment the corresponding lines in `site.social` and populate them

Do not modify any section without a `<!-- TODO -->` marker.
Do not add new sections.
Do not touch API Route Logging, Analytics, Dev Server, Code Style, or Core Rules.

---

## Update Fonts in layout.tsx

Open `src/app/layout.tsx`. Read the **Typography** (or **Visual Rules**) section of `brand.md` to find the project's specified fonts.

1. Replace the `// TODO /setup` font comment block with the correct `next/font/google` import(s)
2. Instantiate each font with the required configuration: `subsets`, `weight` if needed, and a `variable` name matching the font (e.g. `variable: '--font-space-grotesk'`)
3. Apply each font's CSS variable as a className on `<html>`
4. Add `className="font-heading antialiased"` to `<body>` (replace the plain `antialiased` class)

Example — if brand.md specifies Space Grotesk (heading) and Space Mono (monospace):

```tsx
import { Space_Grotesk, Space_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', weight: ['400', '700'] });

// in RootLayout:
<html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
  <body className="font-heading antialiased">
```

Only import what brand.md specifies. If brand.md calls for one font, import one. If it calls for two, import two.

---

## Update Brand Colors in globals.css

Open `src/app/globals.css`. Update the `@theme { }` block with the actual brand colors and font from brand.md:

- Replace each hex value with the real brand color
- Update each inline comment to reflect the color's role for this project
- Update `--font-heading` to reference the heading font's CSS variable — this must match the `variable` name used in the font import above (e.g. `var(--font-space-grotesk)`)

This is the runtime theme — it must match what you put in `copilot-instructions.md` and `site.ts`.

---

## Create Home Page

Leave `src/app/page.tsx` as a stub. Do not generate a landing page.

The landing page will be built manually from locked copy. Check `docs/landing-page-v1.md` for the copy to use. Wire `<EmailSignup />` only (see next section).

---

## Wire EmailSignup Component

- Check if `src/components/email-signup.tsx` exists. It should already be in the boilerplate.
- Add `import EmailSignup from '@/components/email-signup'` to `src/app/page.tsx`
- Add `<EmailSignup />` inside `<main>` — it can be the only element for now
- The component posts to `/api/feedback` with `type: 'newsletter'` — this route already exists in the boilerplate.
- Set placeholder copy in the `waitlist` block in `src/config/site.ts`:
  - `headline: 'Early access'`
  - `subheadline: 'Sign up to be first in line.'`
  - `success: "You're on the list."`
