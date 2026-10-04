/*
 * Household sharing (free): every adult uses Prepcart on their own phone, edits their own preferences, and the
 * plan and shopping list add up for the whole household.
 *
 * End-to-end encrypted: the household's data is encrypted on the phone with a household key (AES-GCM, 256-bit)
 * before it is stored online. The key travels only inside the invite link, after the "#", which browsers never
 * send to any server. Firebase stores encrypted blobs it cannot read, plus who belongs to which household.
 *
 *   households/{hid}                 { owner, members: [uid], iv, ct, updatedBy }   ← the plan, shops, list…
 *   households/{hid}/people/{pid}    { iv, ct, updatedBy }                          ← one person each
 *   households/{hid}/invites/{token} { createdBy, expiresAt }                      ← accepted by joinHousehold
 *
 * Shared: household, people, shops, cuisines and budget, the week, favourites, the list and its ticks.
 * Not shared: food journals, display settings, language, the screen you're on, trial and access codes.
 * state.sync = { hid, key, uid, hashes: { shared, [pid] }, at }
 */
(function (g) {
  const MP = (g.MP = g.MP || {});
  const SHARED = ['household', 'country', 'region', 'store', 'customStore', 'extraStores', 'units', 'prefs', 'week',
    'lastWeek', 'recentWeeks', 'favorites', 'extras', 'checked', 'products', 'spend'];
  const subtle = () => g.crypto.subtle;
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

  const H = {};

  // ---------- pure parts (also used by the tests) ----------
  // What goes online: the shared part and one record per person (with their place in the household).
  H.split = function (state) {
    const shared = {};
    for (const k of SHARED) if (state[k] !== undefined) shared[k] = state[k];
    const people = {};
    state.members.forEach((m, i) => { people[m.id] = Object.assign({}, m, { order: i }); });
    return { shared, people };
  };

  // Puts what came from the household into this phone's state. People come back in household order.
  H.merge = function (state, shared, people) {
    if (shared) for (const k of SHARED) if (shared[k] !== undefined) state[k] = shared[k];
    if (people) {
      const list = Object.values(people).sort((a, b) => (a.order || 0) - (b.order || 0)).map((p) => {
        const m = Object.assign({}, p);
        delete m.order;
        return m;
      });
      if (list.length) state.members = list;
    }
    return state;
  };

  // Stable fingerprint, to send only what changed.
  H.hash = function (obj) {
    const s = JSON.stringify(obj);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + ':' + s.length;
  };

  H.newKey = async function () {
    const key = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    return b64(await subtle().exportKey('raw', key));
  };
  const keys = {};
  async function cryptoKey(k) {
    return (keys[k] = keys[k] || subtle().importKey('raw', unb64(k), 'AES-GCM', false, ['encrypt', 'decrypt']));
  }
  H.encrypt = async function (k, obj) {
    const iv = g.crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, await cryptoKey(k), new TextEncoder().encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(ct) };
  };
  H.decrypt = async function (k, rec) {
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, await cryptoKey(k), unb64(rec.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  };

  // Invite link: …/#join=<hid>.<token>.<key>   (everything after # stays on the phone)
  H.inviteLink = (base, hid, token, key) => `${base.split('#')[0]}#join=${hid}.${token}.${key}`;
  H.parseInvite = function (text) {
    const m = String(text || '').match(/join=([A-Za-z0-9_-]{6,40})\.([a-f0-9]{32})\.([A-Za-z0-9_-]{43})/);
    return m ? { hid: m[1], token: m[2], key: m[3] } : null;
  };

  // ---------- online parts ----------
  const F = () => MP.account.sdk();
  const db = () => MP.account.db();
  const ready = (state) => !!(state.sync && state.sync.hid && MP.account && MP.account.enabled && MP.account.user);
  const randomHex = (n) => [...g.crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

  // Starts sharing this phone's household. → invite link
  H.create = async function (state, base) {
    const uid = MP.account.user.uid;
    const key = await H.newKey();
    const hid = randomHex(10);
    const me = state.members.find((m) => !MP.isChild(m));
    if (me) me.uid = uid;
    const { shared } = H.split(state);
    await F().setDoc(F().doc(db(), 'households', hid), Object.assign({ owner: uid, members: [uid], updatedBy: uid,
      createdAt: F().serverTimestamp() }, await H.encrypt(key, shared)));
    state.sync = { hid, key, uid, hashes: {}, at: 0 };
    await H.push(state, true);
    return H.invite(state, base);
  };

  // A new invite link (valid 7 days).
  H.invite = async function (state, base) {
    const token = randomHex(16);
    await F().setDoc(F().doc(db(), 'households', state.sync.hid, 'invites', token), {
      createdBy: state.sync.uid, expiresAt: F().Timestamp.fromMillis(Date.now() + 7 * 864e5),
    });
    return H.inviteLink(base, state.sync.hid, token, state.sync.key);
  };

  // Joins a household from an invite (the server checks the invite), then loads it.
  H.join = async function (state, invite) {
    await F().httpsCallable(MP.account.functions(), 'joinHousehold')({ hid: invite.hid, token: invite.token });
    // joining: nothing is sent from this phone until the household has been loaded (it would add this phone's
    // own people to the household)
    state.sync = { hid: invite.hid, key: invite.key, uid: MP.account.user.uid, hashes: {}, at: 0, joining: true };
    await H.pull(state);
    delete state.sync.joining;
    return state;
  };

  // Sends what changed since last time. force: send everything.
  H.push = async function (state, force) {
    if (!ready(state) || state.sync.joining) return false;
    const S = state.sync;
    const { shared, people } = H.split(state);
    const batch = F().writeBatch(db());
    let n = 0;
    const hs = H.hash(shared);
    if (force || S.hashes.shared !== hs) {
      batch.set(F().doc(db(), 'households', S.hid), Object.assign({ updatedBy: S.uid }, await H.encrypt(S.key, shared)), { merge: true });
      S.hashes.shared = hs;
      n++;
    }
    for (const [pid, p] of Object.entries(people)) {
      const hp = H.hash(p);
      if (!force && S.hashes[pid] === hp) continue;
      batch.set(F().doc(db(), 'households', S.hid, 'people', pid), Object.assign({ updatedBy: S.uid }, await H.encrypt(S.key, p)));
      S.hashes[pid] = hp;
      n++;
    }
    for (const pid of Object.keys(S.hashes)) {
      if (pid !== 'shared' && !people[pid]) { batch.delete(F().doc(db(), 'households', S.hid, 'people', pid)); delete S.hashes[pid]; n++; }
    }
    if (n) await batch.commit();
    S.at = Date.now();
    return n > 0;
  };

  // Loads the household and everyone in it. → true when something changed on this phone
  H.pull = async function (state) {
    if (!ready(state)) return false;
    const S = state.sync;
    const snap = await F().getDoc(F().doc(db(), 'households', S.hid));
    if (!snap.exists()) throw Object.assign(new Error('gone'), { code: 'household/gone' });
    const hd = snap.data();
    if (!(hd.members || []).includes(S.uid)) throw Object.assign(new Error('removed'), { code: 'household/removed' });
    const shared = await H.decrypt(S.key, hd);
    const ps = await F().getDocs(F().collection(db(), 'households', S.hid, 'people'));
    const people = {};
    for (const d of ps.docs) people[d.id] = await H.decrypt(S.key, d.data());
    const before = H.hash(H.split(state));
    H.merge(state, shared, people);
    const after = H.split(state);
    S.hashes = { shared: H.hash(after.shared) };
    for (const [pid, p] of Object.entries(after.people)) S.hashes[pid] = H.hash(p);
    S.owner = hd.owner;
    S.count = (hd.members || []).length;
    S.at = Date.now();
    return H.hash(after) !== before;
  };

  // Push local changes, then load everyone else's.
  H.sync = async function (state) {
    if (!ready(state)) return false;
    await H.push(state);
    return H.pull(state);
  };

  H.leave = async function (state) {
    if (state.sync && MP.account && MP.account.enabled) {
      await F().httpsCallable(MP.account.functions(), 'leaveHousehold')({ hid: state.sync.hid }).catch(() => {});
    }
    delete state.sync;
    for (const m of state.members) delete m.uid;
  };

  H.SHARED = SHARED;
  MP.household = H;
})(typeof window !== 'undefined' ? window : globalThis);
