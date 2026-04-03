import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { site } from '@/config/site';
import './globals.css';

// TODO /setup: import project fonts from next/font/google based on brand.md Typography section
// Example:
//   import { Inter } from 'next/font/google';
//   const inter = Inter({ subsets: ['latin'], variable: '--font-heading' });
// Then add the variable className to <html> and 'font-heading' to <body>

export const metadata: Metadata = {
  title: site.ogTitle,
  description: site.description,
  openGraph: {
    title: site.ogTitle,
    description: site.ogDescription ?? site.description,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.ogTitle,
    description: site.ogDescription ?? site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // TODO /setup: add font variable className(s) to <html> once fonts are configured above
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
