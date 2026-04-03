'use client';

import { useSyncExternalStore, useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';

const RECEIPT_KEY = 'payment_receipt';
const RECEIPT_EVENT = 'receipt-stored';

function subscribeToReceipt(cb: () => void) {
  // storage = cross-tab; receipt-stored = same-tab (dispatched after localStorage.setItem)
  window.addEventListener('storage', cb);
  window.addEventListener(RECEIPT_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(RECEIPT_EVENT, cb);
  };
}

function getReceiptSnapshot() {
  return !!localStorage.getItem(RECEIPT_KEY);
}

function getReceiptServerSnapshot() {
  return false;
}

interface PayGateProps {
  /** Content shown to users who have paid */
  children: React.ReactNode;
  /** What the user gets — shown on the gate */
  valueProposition: string;
  /** Price display string, e.g. "$9" */
  price: string;
  /**
   * Stripe Payment Link URL (recommended — no server code needed).
   * Create one at stripe.com → Payment Links. Set the success_url to your
   * tool page with ?paid=true appended (e.g. https://modrynstudio.com/tools/my-tool?paid=true).
   *
   * When omitted, falls back to POST /api/checkout (Checkout Sessions —
   * requires `stripe` npm package + STRIPE_SECRET_KEY + STRIPE_PRICE_ID env vars).
   */
  checkoutUrl?: string;
}

/**
 * Local-first pay gate.
 * Checks localStorage for a payment receipt. If found, renders children.
 * If not, shows a gate with a payment button.
 *
 * Two modes:
 * 1. Payment Links (default) — pass a `checkoutUrl` prop. No server code needed.
 * 2. Checkout Sessions — omit `checkoutUrl`. Requires /api/checkout route + env vars.
 *
 * After Stripe redirects back with ?paid=true, stores the receipt
 * in localStorage and reveals the content. No accounts, no database.
 */
export default function PayGate({ children, valueProposition, price, checkoutUrl }: PayGateProps) {
  const hasPaid = useSyncExternalStore(
    subscribeToReceipt,
    getReceiptSnapshot,
    getReceiptServerSnapshot
  );
  const [loading, setLoading] = useState(false);

  // Side effects only — no setState. useSyncExternalStore picks up the localStorage write via the receipt-stored event.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === 'true' && !localStorage.getItem(RECEIPT_KEY)) {
      localStorage.setItem(RECEIPT_KEY, new Date().toISOString());
      window.dispatchEvent(new Event(RECEIPT_EVENT));
      analytics.track('payment_gate', { action: 'payment_completed' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    analytics.track('payment_gate', { action: 'checkout_click' });

    // Payment Links mode — navigate directly to the Stripe-hosted link
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }

    // Checkout Sessions mode — POST to /api/checkout for a session URL
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Checkout returned an error — re-enable button so user can retry
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  if (hasPaid) return <>{children}</>;

  return (
    <div className="border-border bg-surface mx-auto max-w-md rounded-2xl border p-8 text-center">
      <h3 className="font-heading text-xl font-semibold">{valueProposition}</h3>
      <p className="text-muted mt-4 text-sm">One-time payment. No account required. Quick checkout.</p>
      <Button onClick={handleCheckout} disabled={loading} className="mt-6 h-12 w-full">
        {loading ? 'Redirecting...' : `Pay ${price}`}
      </Button>
    </div>
  );
}
