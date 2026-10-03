/*
 * Free-access codes: the owner, affiliates and gifts get Premium without paying.
 *
 * A code is signed with the admin's private key (made and kept in admin.html, never in the app) and
 * checked here with the matching public key. Anyone can read a code, but nobody can make or change
 * one without the private key.
 *
 *   WB1.<details>.<signature>   details = base64url JSON { k: key id, t: type, n: name or email,
 *                                         d: free days (0 = no end), e: last day to redeem ('' = none), i: code id }
 *
 * Codes work on the web and Android. Apple doesn't allow unlocking features with your own codes in
 * iPhone apps (App Review 3.1.1): there, use App Store offer codes, redeemed through Apple (see LAUNCH.md).
 * There is no server, so a code can't be "used up". Give each affiliate their own code, set an end
 * date, and add the id of any code that leaks to MP.REVOKED_CODES (it stops working after the next update).
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  // Public keys that sign codes (safe to publish). To replace a lost or leaked admin key, make a new one
  // in admin.html, add it here with a new id and remove the old one (all its codes then stop working).
  MP.ACCESS_KEYS = {
    k1: { kty: 'EC', crv: 'P-256', x: 'fjciNhM7UN5d-uQp-RPopE8KATAA6yvpa635tpf1ovE', y: '6g2fsneu5NaUAcddN0Zo2zanbAVfDUdg3D9bFMSokTU' },
  };

  // Ids of codes that should no longer work.
  MP.REVOKED_CODES = [];

  MP.ACCESS_TYPES = ['owner', 'affiliate', 'gift', 'tester'];

  const DAY = 864e5;
  const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
  const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
  const subtle = () => (g.crypto && g.crypto.subtle) || null;

  function b64url(bytes) {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  }

  // Finds a code in pasted text or a link (…#code=WB1.…).
  function extract(text) {
    const m = String(text || '').match(/WB1\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{40,}/);
    return m ? m[0] : '';
  }

  function decode(code) {
    try {
      const [, body, sig] = code.split('.');
      const data = JSON.parse(new TextDecoder().decode(unb64url(body)));
      if (!data || typeof data !== 'object' || !MP.ACCESS_TYPES.includes(data.t)) return null;
      return { body, sig: unb64url(sig), data };
    } catch (e) {
      return null;
    }
  }

  const keyCache = {};
  async function publicKey(kid) {
    if (!MP.ACCESS_KEYS[kid]) return null;
    if (!keyCache[kid]) keyCache[kid] = subtle().importKey('jwk', MP.ACCESS_KEYS[kid], ALG, false, ['verify']);
    return keyCache[kid];
  }

  // Last moment the code can be redeemed (end of its "e" day, UTC), or Infinity.
  function redeemBy(data) {
    return data.e ? Date.parse(data.e + 'T23:59:59Z') : Infinity;
  }

  const access = {
    extract,

    // Checks a code. `at` is when it was (or is being) redeemed.
    // → { ok: true, data } or { ok: false, reason: 'invalid' | 'expired' | 'revoked' | 'unsupported' }
    async check(text, at) {
      at = at || Date.now();
      if (!subtle()) return { ok: false, reason: 'unsupported' };
      const code = extract(text);
      const parts = code && decode(code);
      if (!parts) return { ok: false, reason: 'invalid' };
      let valid = false;
      try {
        const key = await publicKey(parts.data.k);
        valid = !!key && (await subtle().verify(SIGN, key, parts.sig, new TextEncoder().encode(parts.body)));
      } catch (e) {
        valid = false;
      }
      if (!valid) return { ok: false, reason: 'invalid' };
      if (MP.REVOKED_CODES.includes(parts.data.i)) return { ok: false, reason: 'revoked' };
      if (at > redeemBy(parts.data)) return { ok: false, reason: 'expired' };
      return { ok: true, data: parts.data, code };
    },

    // The free access saved on this device: state.access = { code, redeemedAt }.
    // → { active, data, until } (until = null when it never ends) or null
    async grant(state, now) {
      now = now || Date.now();
      const saved = state && state.access;
      if (!saved || !saved.code) return null;
      const res = await access.check(saved.code, saved.redeemedAt);
      if (!res.ok) return null;
      const until = res.data.d > 0 ? saved.redeemedAt + res.data.d * DAY : null;
      return { active: until === null || now < until, data: res.data, until };
    },

    // Admin side (admin.html): make a signed code with the private key (JWK).
    async sign(privateJwk, details) {
      const kid = privateJwk.kid || 'k1';
      const data = {
        k: kid, t: details.t, n: String(details.n || '').trim().slice(0, 80),
        d: Math.max(0, Math.round(Number(details.d) || 0)), e: details.e || '',
        i: details.i || b64url(g.crypto.getRandomValues(new Uint8Array(6))),
      };
      const jwk = Object.assign({}, privateJwk);
      delete jwk.kid; delete jwk.key_ops; delete jwk.ext;
      const key = await subtle().importKey('jwk', jwk, ALG, false, ['sign']);
      const body = b64url(new TextEncoder().encode(JSON.stringify(data)));
      const sig = new Uint8Array(await subtle().sign(SIGN, key, new TextEncoder().encode(body)));
      return { code: `WB1.${body}.${b64url(sig)}`, data };
    },

    // Admin side: a new key pair. The private key goes in a file the admin keeps; the public key goes in MP.ACCESS_KEYS.
    async newKeyPair(kid) {
      const pair = await subtle().generateKey(ALG, true, ['sign', 'verify']);
      const priv = await subtle().exportKey('jwk', pair.privateKey);
      const pub = await subtle().exportKey('jwk', pair.publicKey);
      priv.kid = kid;
      return { privateKey: priv, publicKey: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y } };
    },
  };

  MP.access = access;
})(typeof window !== 'undefined' ? window : globalThis);
