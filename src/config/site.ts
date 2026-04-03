// Single source of truth for all site-wide metadata.
// /init fills this in from context.md + brand.md.
// Every other file imports from here — never hardcode site metadata elsewhere.
export const site = {
  name: 'TODO: site name',
  shortName: 'TODO',
  url: 'https://DOMAIN.com', // TODO: replace with actual domain
  // Base description — used in <meta description>, manifest, JSON-LD
  description: 'TODO: meta description (110–160 chars)',
  // Used as the <title> tag (homepage + fallback) AND social card title.
  // MUST be 50–60 chars — site.name alone is too short for SEO and will be
  // flagged by Bing/Google as a non-compliant title tag.
  // Pattern: '[Site Name] — [5–7 word tagline describing the tool]'
  // Example: 'GoAnyway — Find an Event and Walk In Confident'
  ogTitle: 'TODO: [Site Name] — [tagline] (50–60 chars)',
  ogDescription: 'TODO: OG description (110–160 chars)',
  cta: 'TODO: CTA pill text (5-8 words, e.g. Get started free)', // used in OG images
  founder: 'Luke Hanner',
  email: 'hello@DOMAIN.com', // TODO: contact email — set up forwarding in Vercel Dashboard → Domains → Email
  // Waitlist section copy — shown in the EmailSignup component on the landing page.
  // /init fills these in from context.md + brand.md. Never leave as TODO in production.
  waitlist: {
    headline: 'TODO: waitlist headline (4–7 words)',
    subheadline: 'TODO: 1–2 sentences. Why they should sign up. Reference the product promise.',
    success: 'TODO: confirmation message — warm, specific to this product.',
  },
  // Brand colors — used in manifest theme_color / background_color
  accent: '#F97415', // TODO: brand accent hex
  bg: '#050505', // TODO: brand background hex
  // Social profiles — used in footer links and Twitter card metadata.
  // twitter/twitterHandle/devto/shipordie are universal — pre-filled.
  // github is per-project — update to this repo's URL.
  social: {
    twitter: 'https://x.com/lukehanner',
    twitterHandle: '@lukehanner',
    github: 'https://github.com/TODO', // TODO: this repo's URL
    devto: 'https://dev.to/lukehanner',
    shipordie: 'https://shipordie.club/lukehanner',
  },
} as const;
