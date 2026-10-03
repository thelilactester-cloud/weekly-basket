/*
 * Encrypted on-device storage for the user's profile, family, week and list.
 *
 * - Data is encrypted with AES-GCM (256-bit) using the browser's Web Crypto API.
 * - The key is generated on the device as NON-EXTRACTABLE: scripts can use it to encrypt and
 *   decrypt, but can never read the raw key bytes, so it can't be copied off the device.
 * - Key and encrypted data live in IndexedDB, which is private to this app.
 * - Nothing here is sent anywhere. There are no accounts and no server.
 *
 * Older versions kept data as plain JSON in localStorage; it is migrated and the plain copy deleted.
 * If Web Crypto or IndexedDB is unavailable (very old browsers, some private modes), it falls back
 * to localStorage and reports `encrypted: false` so the app can say so.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});
  const DB = 'weekly-basket';
  const LEGACY_KEY = 'weekly-basket-v1';
  const FALLBACK_KEY = 'weekly-basket-plain';

  function idb() {
    return new Promise((resolve, reject) => {
      const req = g.indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('keys');
        req.result.createObjectStore('data');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function tx(db, store, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  let dbPromise = null;
  let keyPromise = null;

  async function getKey() {
    const db = await dbPromise;
    let key = await tx(db, 'keys', 'readonly', (s) => s.get('main'));
    if (!key) {
      key = await g.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await tx(db, 'keys', 'readwrite', (s) => s.put(key, 'main'));
    }
    return key;
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const store = {
    encrypted: false,
    ready: null,

    async init() {
      try {
        if (!g.indexedDB || !g.crypto || !g.crypto.subtle) throw new Error('unsupported');
        dbPromise = idb();
        keyPromise = getKey();
        await keyPromise;
        store.encrypted = true;
      } catch (e) {
        store.encrypted = false;
      }
    },

    async load() {
      await store.ready;
      let legacy = null;
      try { legacy = JSON.parse(g.localStorage.getItem(LEGACY_KEY)); } catch (e) { /* none */ }
      if (!store.encrypted) {
        try { return JSON.parse(g.localStorage.getItem(FALLBACK_KEY)) || legacy; } catch (e) { return legacy; }
      }
      const db = await dbPromise;
      const rec = await tx(db, 'data', 'readonly', (s) => s.get('state'));
      if (rec) {
        const key = await keyPromise;
        const plain = await g.crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, key, rec.ct);
        return JSON.parse(dec.decode(plain));
      }
      if (legacy) {
        await store.save(legacy); // migrate, then remove the unencrypted copy
        try { g.localStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
      }
      return legacy;
    },

    // Writes are queued so the newest state always wins.
    _queue: Promise.resolve(),
    save(obj) {
      const json = JSON.stringify(obj);
      store._queue = store._queue.then(async () => {
        await store.ready;
        if (!store.encrypted) {
          try { g.localStorage.setItem(FALLBACK_KEY, json); } catch (e) { /* storage full / blocked */ }
          return;
        }
        const key = await keyPromise;
        const iv = g.crypto.getRandomValues(new Uint8Array(12));
        const ct = await g.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json));
        const db = await dbPromise;
        await tx(db, 'data', 'readwrite', (s) => s.put({ iv, ct, savedAt: Date.now() }, 'state'));
      }).catch(() => { /* keep the queue alive */ });
      return store._queue;
    },

    // "Delete all my data": encrypted data, the key, cached product searches and offline files.
    async wipe() {
      await store._queue;
      try {
        Object.keys(g.localStorage).filter((k) => k.startsWith('weekly-basket') || k.startsWith('prepcart') || k.startsWith('wb-cache:'))
          .forEach((k) => g.localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
      try {
        if (dbPromise) (await dbPromise).close();
        await new Promise((res) => {
          const r = g.indexedDB.deleteDatabase(DB);
          r.onsuccess = r.onerror = r.onblocked = () => res();
        });
      } catch (e) { /* ignore */ }
      try {
        if (g.caches) for (const k of await g.caches.keys()) await g.caches.delete(k);
      } catch (e) { /* ignore */ }
      dbPromise = null;
      keyPromise = null;
      store.ready = store.init();
    },
  };

  store.ready = store.init();
  MP.secureStore = store;
})(typeof window !== 'undefined' ? window : globalThis);
