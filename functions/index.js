/*
 * Weekly Basket server functions (Firebase Cloud Functions, 2nd gen).
 *
 *  revenuecatWebhook  RevenueCat → every subscription payment / refund. Records affiliate commissions.
 *  deleteAccount      The app's "Delete my account": removes the account, its data and its RevenueCat record.
 *  entitlement        Is this account's Premium active? (for the web app, where the stores can't be asked)
 *
 * Secrets (set once with `firebase functions:secrets:set NAME`, see LAUNCH.md):
 *  REVENUECAT_WEBHOOK_AUTH  any long random text; the same value goes in RevenueCat → Webhooks → Authorization header
 *  REVENUECAT_SECRET_KEY    RevenueCat → Project settings → API keys → Secret API key (v1)
 */
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { classify, inWindow, commissionFor, monthOf, RATE } = require('./commission');

initializeApp();
const db = getFirestore();

const REGION = 'europe-west1'; // keep in sync with js/config.js → functionsRegion
const ENTITLEMENT = 'premium';
setGlobalOptions({ region: REGION, maxInstances: 10 });

const RC_WEBHOOK_AUTH = defineSecret('REVENUECAT_WEBHOOK_AUTH');
const RC_SECRET_KEY = defineSecret('REVENUECAT_SECRET_KEY');

const rc = (path, key, init) => fetch(`https://api.revenuecat.com/v1${path}`, Object.assign({
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
}, init));

// Find the account a RevenueCat event belongs to (app user id = Firebase uid).
async function findUser(ev) {
  const ids = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases || [])].filter((x) => x && !String(x).startsWith('$RCAnonymousID'));
  for (const id of new Set(ids)) {
    const snap = await db.doc(`users/${id}`).get();
    if (snap.exists) return snap;
  }
  return null;
}

async function recordEvent(ev) {
  const { kind, at, netUsd } = classify(ev);
  if (!kind) return 'ignored';
  const userSnap = await findUser(ev);
  const attrs = ev.subscriber_attributes || {};
  const code = (userSnap && userSnap.get('referral.code')) || (attrs.affiliate && attrs.affiliate.value) || null;
  const uid = userSnap ? userSnap.id : null;

  // First payment date (start of the 12-month commission window).
  let firstPaidAt = at;
  if (uid && kind === 'payment') {
    firstPaidAt = await db.runTransaction(async (tx) => {
      const ref = db.doc(`users/${uid}`);
      const cur = (await tx.get(ref)).get('firstPaidAt');
      if (cur) return cur.toMillis();
      tx.set(ref, { firstPaidAt: Timestamp.fromMillis(at) }, { merge: true });
      return at;
    });
  } else if (userSnap && userSnap.get('firstPaidAt')) {
    firstPaidAt = userSnap.get('firstPaidAt').toMillis();
  }

  if (!code) return 'no-affiliate';
  const aff = await db.doc(`affiliates/${code}`).get();
  if (!aff.exists) return 'unknown-affiliate';
  if (kind === 'payment' && !inWindow(firstPaidAt, at)) return 'outside-window';

  // One record per RevenueCat event id, so a webhook retried by RevenueCat is counted once.
  await db.doc(`commissions/${ev.id}`).create({
    affiliate: code, uid: uid || ev.app_user_id, kind, type: ev.type, store: ev.store || '', product: ev.product_id || '',
    at: Timestamp.fromMillis(at), month: monthOf(at),
    netUsd, rate: RATE, commissionUsd: commissionFor(netUsd),
    currency: ev.currency || 'USD', priceLocal: Number(ev.price_in_purchased_currency || 0),
    paid: false,
  }).catch((e) => { if (e.code !== 6 /* ALREADY_EXISTS */) throw e; });
  return 'recorded';
}

exports.revenuecatWebhook = onRequest({ secrets: [RC_WEBHOOK_AUTH] }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('POST only');
  const expected = RC_WEBHOOK_AUTH.value();
  const got = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!expected || got !== expected) return res.status(401).send('unauthorized');
  const ev = req.body && req.body.event;
  if (!ev || !ev.id) return res.status(400).send('no event');
  try {
    const result = await recordEvent(ev);
    return res.status(200).json({ result });
  } catch (e) {
    console.error('webhook failed', ev.id, e);
    return res.status(500).send('error'); // RevenueCat retries
  }
});

exports.deleteAccount = onCall({ secrets: [RC_SECRET_KEY] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const uid = req.auth.uid;
  // Payment records are kept for accounting (a legal obligation), without the account id.
  const mine = await db.collection('commissions').where('uid', '==', uid).get();
  const batch = db.batch();
  mine.forEach((d) => batch.update(d.ref, { uid: 'deleted-account' }));
  batch.delete(db.doc(`users/${uid}`));
  await batch.commit();
  const key = RC_SECRET_KEY.value();
  if (key) {
    try {
      const r = await rc(`/subscribers/${encodeURIComponent(uid)}`, key, { method: 'DELETE' });
      if (!r.ok && r.status !== 404) console.error('RevenueCat delete failed', r.status);
    } catch (e) {
      console.error('RevenueCat delete failed', e.message);
    }
  }
  await getAuth().deleteUser(uid);
  return { deleted: true };
});

exports.entitlement = onCall({ secrets: [RC_SECRET_KEY] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const key = RC_SECRET_KEY.value();
  if (!key) return { active: false };
  let data;
  try {
    const r = await rc(`/subscribers/${encodeURIComponent(req.auth.uid)}`, key);
    if (!r.ok) return { active: false };
    data = await r.json();
  } catch (e) {
    return { active: false };
  }
  const ent = ((data.subscriber || {}).entitlements || {})[ENTITLEMENT];
  const expires = ent && ent.expires_date ? Date.parse(ent.expires_date) : null;
  return { active: !!ent && (expires === null || expires > Date.now()), expires };
});

