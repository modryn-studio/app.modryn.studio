// Single source of truth for all site-wide metadata.
// Every other file imports from here — never hardcode site metadata elsewhere.
export const site = {
  name: 'Modryn Studio',
  shortName: 'Modryn',
  url: 'https://app.modrynstudio.com',
  founder: 'Luke Hanner',
  // Base description — used in <meta description>, manifest, JSON-LD
  description:
    'An AI company operating system. Chat with AI team members, assign tasks, log decisions, and run async threads.',
  // Used as the <title> tag (homepage + fallback) AND social card title.
  ogTitle: 'Modryn Studio | AI Company Operating System',
  ogDescription:
    'An operating system where AI team members hold strategy, push back, and run alongside you. Assign tasks, log decisions, run async threads.',
  email: 'hello@modryn.studio',
  // Brand colors — used in manifest theme_color / background_color
  accent: '#171717',
  bg: '#171717',
  social: {
    twitter: 'https://x.com/lukehanner',
    github: 'https://github.com/modryn-studio/app.modryn.studio',
    devTo: 'https://dev.to/lukehanner',
    shipOrDie: 'https://shipordie.club/lukehanner',
  },
} as const;
