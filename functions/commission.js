// Affiliate commission rules (pure functions, unit-tested in test/commission.test.js).
//
// An affiliate earns RATE of what we receive (after the App Store / Google Play fee and sales tax)
// for each payment their subscriber makes during MONTHS months after the subscriber's first payment.
// Free-trial starts earn nothing; refunds take the commission back.

const RATE = 0.2;
const MONTHS = 12;
const DAY = 864e5;

const PAID = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE']);

// What a RevenueCat webhook event means for commissions:
// → { kind: 'payment' | 'refund' | null, at, netUsd }
function classify(ev) {
  const at = Number(ev.purchased_at_ms || ev.event_timestamp_ms || Date.now());
  const price = Number(ev.price || 0); // USD
  const keep = 1 - Number(ev.tax_percentage || 0) - Number(ev.commission_percentage || 0);
  const netUsd = round2(price * (keep > 0 && keep <= 1 ? keep : 1));
  if (PAID.has(ev.type) && ev.period_type !== 'TRIAL' && price > 0) return { kind: 'payment', at, netUsd };
  if ((ev.type === 'CANCELLATION' || ev.type === 'REFUND') && price < 0) return { kind: 'refund', at, netUsd };
  return { kind: null, at, netUsd };
}

// Does a payment at `at` still earn commission, given the subscriber's first payment?
function inWindow(firstPaidAt, at) {
  return at < firstPaidAt + MONTHS * 30.44 * DAY;
}

function commissionFor(netUsd) {
  return round2(netUsd * RATE);
}

const round2 = (v) => Math.round(v * 100) / 100;
const monthOf = (ms) => new Date(ms).toISOString().slice(0, 7);

module.exports = { RATE, MONTHS, classify, inWindow, commissionFor, monthOf };
