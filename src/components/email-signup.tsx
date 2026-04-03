'use client';

import { useState, type FormEvent } from 'react';
import { analytics } from '@/lib/analytics';
import { site } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'newsletter', email }),
      });

      if (!res.ok) {
        setError('Something went wrong. Try again.');
        return;
      }

      setDone(true);
      analytics.newsletterSignup();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="signup" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {site.waitlist.headline}
          </h2>
          <p className="mt-4 text-sm text-muted md:text-base">{site.waitlist.subheadline}</p>

          {!done ? (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="signup-email" className="sr-only">
                Email address
              </label>
              <Input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
                className="h-12 flex-1"
              />
              <Button type="submit" disabled={submitting} className="h-12 px-8">
                {submitting ? 'Sending...' : 'Notify me'}
              </Button>
            </form>
          ) : (
            <div className="mt-8 border border-accent/30 bg-accent/5 p-4 text-sm text-accent">
              {site.waitlist.success}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-accent">{error}</p>}
        </div>
      </div>
    </section>
  );
}
