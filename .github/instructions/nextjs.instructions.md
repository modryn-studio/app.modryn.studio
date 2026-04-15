---
name: 'Next.js 16 Conventions'
description: 'App Router patterns, Server Components, metadata, and file conventions for Next.js 16'
applyTo: '**/*.ts,**/*.tsx,**/app/**'
---

# Next.js 16 App Router Conventions

## Components

- Server Components by default — only add `'use client'` when you need interactivity, hooks, or browser APIs
- Co-locate components with their route when they're route-specific
- Shared components go in `/components`

## Routing & Files

- Use file-based routing: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Every route segment should have an `error.tsx` boundary
- Use `loading.tsx` for streaming/suspense fallbacks
- Dynamic routes use `[param]` folder naming
- `src/instrumentation-client.ts` — optional root file for early client-side monitoring setup (analytics init, error tracking); runs before any app code

## SEO & Metadata

- Export a `metadata` object or `generateMetadata()` function from every `page.tsx` — never use raw `<head>` or `<title>` tags
- Use `generateMetadata()` for dynamic routes (e.g., `/tools/[slug]`)
- Include `title`, `description`, and `openGraph` in every metadata export
- **`'use client'` blocks metadata exports silently** — Next.js ignores `metadata` in client components with no build error or warning. If a page needs both metadata and client hooks (`useSearchParams`, `useRouter`, `useState`, etc.), use the server shell + client content pattern from the start:
  ```
  page.tsx          ← server component, exports metadata, renders <ClientContent />
  page-content.tsx  ← 'use client', all hooks live here, wrapped in <Suspense>
  ```
  Never write a page as `'use client'` and plan to add metadata later — there is no later.
- Export `viewport` separately from `metadata` — do not nest it inside the metadata object:
  ```ts
  import type { Viewport } from 'next';
  export const viewport: Viewport = { themeColor: '#000000' };
  ```

## Data & Rendering

- Use API routes (`app/api/**/route.ts`) for all data fetching and mutations — this project does not use Server Actions
- Use client-side `fetch()` in components for data loading
- Static generation by default — only use `force-dynamic` when data changes per-request

## Images & Assets

- Always use `next/image` `Image` component — never raw `<img>` tags
- Specify `width` and `height` or use `fill` prop
- Use `priority` on above-the-fold images

## Required App Files

- `src/app/robots.ts` — export a `robots()` function (App Router convention, not a static `public/robots.txt`)
- `src/app/manifest.ts` — export a `manifest()` function for PWA metadata (not a static `public/manifest.json`)
- `public/og-image.png` — 1200×630px OG image (separate from any README banner).
- Link manifest via the `manifest` metadata field in root `layout.tsx`.

## Styling

- Tailwind CSS utility classes — no CSS modules or styled-components
- Use `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional classes
