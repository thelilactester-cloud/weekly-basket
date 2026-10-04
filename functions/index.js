/*
 * Prepcart server functions (Firebase Cloud Functions, 2nd gen).
 *
 *  revenuecatWebhook  RevenueCat → every subscription payment / refund. Records affiliate commissions.
 *  deleteAccount      The app's "Delete my account": removes the account, its data and its RevenueCat record.
 *  entitlement        Is Premium active for this account, or for the household it shares (family plan)?
 *  joinHousehold      Adds the signed-in account to a household, from a valid invite (household sharing).
 *  leaveHousehold     Leaves a shared household (the owner leaving deletes it).
 *  instacartList      "Order online": the shopping list as an Instacart shopping-list page (US, Canada).
 *
 * Secrets (set once with `firebase functions:secrets:set NAME`, see LAUNCH.md):
 *  REVENUECAT_WEBHOOK_AUTH  any long random text; the same value goes in RevenueCat → Webhooks → Authorization header
 *  REVENUECAT_SECRET_KEY    RevenueCat → Project settings → API keys → Secret API key (v1)
 */
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
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
  await leaveAll(uid);
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

// Premium of one account, from RevenueCat → { active, expires }
async function premiumOf(uid, key) {
  try {
    const r = await rc(`/subscribers/${encodeURIComponent(uid)}`, key);
    if (!r.ok) return { active: false };
    const data = await r.json();
    const ent = ((data.subscriber || {}).entitlements || {})[ENTITLEMENT];
    const expires = ent && ent.expires_date ? Date.parse(ent.expires_date) : null;
    return { active: !!ent && (expires === null || expires > Date.now()), expires };
  } catch (e) {
    return { active: false };
  }
}

// One subscription covers the family: anyone sharing a household with a subscriber has Premium too.
exports.entitlement = onCall({ secrets: [RC_SECRET_KEY] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const key = RC_SECRET_KEY.value();
  if (!key) return { active: false };
  const own = await premiumOf(req.auth.uid, key);
  if (own.active) return own;
  const homes = await db.collection('households').where('members', 'array-contains', req.auth.uid).limit(3).get();
  for (const h of homes.docs) {
    for (const uid of (h.data().members || []).filter((u) => u !== req.auth.uid).slice(0, 8)) {
      const p = await premiumOf(uid, key);
      if (p.active) return Object.assign({ family: true }, p);
    }
  }
  return own;
});

// ---------- household sharing ----------
const HOUSEHOLD_MAX = 12;
exports.joinHousehold = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const { hid, token } = req.data || {};
  if (!/^[a-z0-9]{6,40}$/i.test(String(hid)) || !/^[a-f0-9]{32}$/.test(String(token))) throw new HttpsError('invalid-argument', 'Bad invite.');
  const ref = db.doc(`households/${hid}`);
  const inv = ref.collection('invites').doc(token);
  await db.runTransaction(async (tx) => {
    const [h, i] = await Promise.all([tx.get(ref), tx.get(inv)]);
    if (!h.exists || !i.exists || i.data().expiresAt.toMillis() < Date.now()) throw new HttpsError('not-found', 'This invite has expired.');
    const members = h.data().members || [];
    if (members.includes(req.auth.uid)) return;
    if (members.length >= HOUSEHOLD_MAX) throw new HttpsError('resource-exhausted', 'This household is full.');
    tx.update(ref, { members: FieldValue.arrayUnion(req.auth.uid) });
  });
  return { joined: true };
});

async function leaveAll(uid, onlyHid) {
  const homes = await db.collection('households').where('members', 'array-contains', uid).get();
  for (const h of homes.docs) {
    if (onlyHid && h.id !== onlyHid) continue;
    if (h.data().owner === uid) await db.recursiveDelete(h.ref);
    else await h.ref.update({ members: FieldValue.arrayRemove(uid) });
  }
}
exports.leaveHousehold = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const hid = String((req.data || {}).hid || '');
  if (!/^[a-z0-9]{6,40}$/i.test(hid)) throw new HttpsError('invalid-argument', 'Bad household.');
  await leaveAll(req.auth.uid, hid);
  return { left: true };
});


// "Order online" → Instacart (US, Canada): turns the shopping list into an Instacart shopping-list page.
// Needs an Instacart Developer Platform API key: firebase functions:secrets:set INSTACART_API_KEY
// (and INSTACART_ENV=development while testing, see LAUNCH.md). Commission: Instacart's affiliate programme.
const INSTACART_API_KEY = defineSecret('INSTACART_API_KEY');
const UNITS = new Set(['gram', 'milliliter', 'each']);
exports.instacartList = onCall({ secrets: [INSTACART_API_KEY] }, async (req) => {
  const key = INSTACART_API_KEY.value();
  if (!key) throw new HttpsError('failed-precondition', 'Instacart is not set up.');
  const d = req.data || {};
  const items = Array.isArray(d.items) ? d.items.slice(0, 150) : [];
  const lineItems = items
    .filter((x) => x && typeof x.name === 'string' && x.name.trim())
    .map((x) => ({
      name: x.name.trim().slice(0, 100),
      quantity: Math.max(1, Math.min(100000, Math.round(Number(x.quantity) || 1))),
      unit: UNITS.has(x.unit) ? x.unit : 'each',
    }));
  if (!lineItems.length) throw new HttpsError('invalid-argument', 'The list is empty.');
  const host = process.env.INSTACART_ENV === 'development' ? 'https://connect.dev.instacart.tools' : 'https://connect.instacart.com';
  const r = await fetch(`${host}/idp/v1/products/products_link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: String(d.title || 'Prepcart').slice(0, 80), link_type: 'shopping_list', line_items: lineItems }),
  });
  if (!r.ok) throw new HttpsError('unavailable', 'Instacart did not accept the list.');
  const out = await r.json();
  return { url: out.products_link_url || null };
});
