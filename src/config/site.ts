// Single source of truth for all site-wide metadata.
// /init fills this in from context.md + brand.md.
// Every other file imports from here — never hardcode site metadata elsewhere.
export const site = {
  name: 'Modryn Studio',
  shortName: 'Modryn',
  url: 'https://app-modryn-studio.vercel.app',
  // Base description — used in <meta description>, manifest, JSON-LD
  description:
    'An AI company operating system. Chat with AI team members, assign tasks, log decisions, and run async threads.',
  // Used as the <title> tag (homepage + fallback) AND social card title.
  ogTitle: 'Modryn Studio — AI Company Operating System',
  ogDescription:
    'An operating system where AI team members hold strategy, push back, and run alongside you.',
  cta: 'Open the studio →', // used in OG images
  email: 'hello@modryn.studio',
  // Waitlist section copy — not used (monetization: none)
  waitlist: {
    headline: '',
    subheadline: '',
    success: '',
  },
  // Brand colors — used in manifest theme_color / background_color
  accent: '#171717',
  bg: '#171717',
  // Social profiles — used in footer links and Twitter card metadata.
  social: {
    github: 'https://github.com/modryn-studio/app.modryn.studio',
  },
} as const;
