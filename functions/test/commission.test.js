const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, inWindow, commissionFor, monthOf } = require('../commission');

const DAY = 864e5;
const t0 = Date.UTC(2026, 9, 1);

test('paid renewals earn 20% of what we receive; trials earn nothing; refunds are negative', () => {
  const pay = classify({ type: 'RENEWAL', period_type: 'NORMAL', price: 7.99, tax_percentage: 0.1, commission_percentage: 0.15, purchased_at_ms: t0 });
  assert.equal(pay.kind, 'payment');
  assert.equal(pay.netUsd, 5.99);
  assert.equal(commissionFor(pay.netUsd), 1.2);
  assert.equal(classify({ type: 'INITIAL_PURCHASE', period_type: 'TRIAL', price: 0 }).kind, null);
  assert.equal(classify({ type: 'INITIAL_PURCHASE', period_type: 'INTRO', price: 0 }).kind, null);
  assert.equal(classify({ type: 'EXPIRATION', price: 7.99 }).kind, null);
  const refund = classify({ type: 'CANCELLATION', price: -7.99, commission_percentage: 0.15 });
  assert.equal(refund.kind, 'refund');
  assert.ok(commissionFor(refund.netUsd) < 0);
});

test('commission only for 12 months after the first payment', () => {
  assert.ok(inWindow(t0, t0 + 300 * DAY));
  assert.ok(inWindow(t0, t0 + 364 * DAY));
  assert.ok(!inWindow(t0, t0 + 366 * DAY));
  assert.equal(monthOf(t0), '2026-10');
});
