/*
 * Accounts (optional): email + password, Google, Apple and Facebook, with Firebase Authentication.
 *
 * What an account stores online (Firestore, users/{uid}): email, name, when the terms were accepted,
 * and the affiliate code the person joined with. Diets, weights, family members and lists stay
 * encrypted on the device (js/storage.js). Subscriptions are linked to the account id through
 * RevenueCat, so Premium works on every device the person signs in on.
 *
 * In the iPhone / Android app, Google, Apple and Facebook sign in with the phone's own login screens
 * (Capacitor plugin @capacitor-firebase/authentication, skipNativeAuth), then the same JS SDK is used.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});
  const TERMS_VERSION = '2026-10';

  const A = { enabled: false, ready: false, user: null, profile: null, TERMS_VERSION };
  const listeners = [];
  let F, auth, db, fns;

  const native = () => {
    const cap = g.Capacitor;
    return cap && cap.isNativePlatform && cap.isNativePlatform() ? cap : null;
  };
  const plugin = () => native() && native().registerPlugin('FirebaseAuthentication');
  const emit = () => listeners.forEach((fn) => { try { fn(A); } catch (e) { /* listener errors don't break auth */ } });

  async function loadProfile(user) {
    try {
      const snap = await F.getDoc(F.doc(db, 'users', user.uid));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      return null;
    }
  }

  // Creates users/{uid} the first time someone signs in; records consent and the affiliate code.
  async function ensureProfile(user, opts) {
    opts = opts || {};
    let profile = await loadProfile(user);
    if (!profile) {
      profile = {
        email: user.email || '',
        name: user.displayName || opts.name || '',
        createdAt: F.serverTimestamp(),
        consent: { terms: TERMS_VERSION, at: F.serverTimestamp() },
        referral: opts.referral && opts.referral.code ? { code: opts.referral.code, at: F.serverTimestamp() } : null,
      };
      await F.setDoc(F.doc(db, 'users', user.uid), profile);
      profile = await loadProfile(user);
    } else if (!profile.referral && opts.referral && opts.referral.code) {
      // An affiliate code can be added later, once, but never changed.
      await F.setDoc(F.doc(db, 'users', user.uid), { referral: { code: opts.referral.code, at: F.serverTimestamp() } }, { merge: true });
      profile = await loadProfile(user);
    }
    A.profile = profile;
    return profile;
  }

  // Error code → i18n key
  A.errorKey = function (e) {
    const code = (e && e.code) || '';
    const map = {
      'auth/invalid-email': 'errEmail', 'auth/missing-email': 'errEmail',
      'auth/email-already-in-use': 'errEmailUsed', 'auth/weak-password': 'errWeakPassword', 'auth/missing-password': 'errWeakPassword',
      'auth/invalid-credential': 'errLogin', 'auth/wrong-password': 'errLogin', 'auth/user-not-found': 'errLogin',
      'auth/invalid-login-credentials': 'errLogin', 'auth/too-many-requests': 'errTooMany',
      'auth/network-request-failed': 'errNetwork', 'auth/requires-recent-login': 'errRecentLogin',
      'auth/account-exists-with-different-credential': 'errOtherMethod', 'auth/operation-not-allowed': 'errMethodOff',
    };
    return map[code] || 'errGeneric';
  };
  // The person closed the sign-in window themselves: not an error.
  A.cancelled = (e) => /popup-closed-by-user|cancelled-popup-request|user-cancelled|canceled|cancelled/i.test(String((e && (e.code || e.message)) || ''));

  A.onChange = function (fn) { listeners.push(fn); };

  A.init = async function () {
    const C = MP.CONFIG || {};
    F = g.FirebaseSDK;
    const cfg = C.emulators
      ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: (C.firebase && C.firebase.projectId) || 'demo-weekly-basket', appId: 'demo' }
      : C.firebase;
    if (!F || !cfg || !cfg.apiKey) { A.ready = true; return false; }
    try {
      const app = F.initializeApp(cfg);
      auth = F.initializeAuth(app, {
        persistence: [F.indexedDBLocalPersistence, F.browserLocalPersistence],
        popupRedirectResolver: native() ? undefined : F.browserPopupRedirectResolver,
      });
      db = F.initializeFirestore(app, {});
      fns = F.getFunctions(app, C.functionsRegion || 'europe-west1');
      if (C.emulators) {
        F.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
        F.connectFunctionsEmulator(fns, '127.0.0.1', 5001);
      }
    } catch (e) {
      A.ready = true;
      return false;
    }
    A.enabled = true;
    if (!native()) F.getRedirectResult(auth).catch(() => {});
    await new Promise((resolve) => {
      F.onAuthStateChanged(auth, async (user) => {
        A.user = user;
        A.profile = user ? await loadProfile(user) : null;
        A.ready = true;
        emit();
        resolve();
      });
    });
    return true;
  };

  A.signUp = async function (email, password, name, opts) {
    const cred = await F.createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name) await F.updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
    F.sendEmailVerification(cred.user).catch(() => {});
    await ensureProfile(cred.user, Object.assign({ name }, opts));
    emit();
    return cred.user;
  };

  A.signIn = async function (email, password, opts) {
    const cred = await F.signInWithEmailAndPassword(auth, email.trim(), password);
    await ensureProfile(cred.user, opts);
    emit();
    return cred.user;
  };

  A.resetPassword = (email) => F.sendPasswordResetEmail(auth, email.trim());
  A.resendVerification = () => (auth.currentUser ? F.sendEmailVerification(auth.currentUser) : Promise.resolve());

  // provider: 'google' | 'apple' | 'facebook'
  A.signInWith = async function (provider, opts) {
    let cred;
    const P = plugin();
    if (P) {
      if (provider === 'google') {
        const r = await P.signInWithGoogle();
        cred = F.GoogleAuthProvider.credential(r.credential.idToken);
      } else if (provider === 'facebook') {
        const r = await P.signInWithFacebook();
        cred = F.FacebookAuthProvider.credential(r.credential.accessToken);
      } else {
        const r = await P.signInWithApple();
        cred = new F.OAuthProvider('apple.com').credential({ idToken: r.credential.idToken, rawNonce: r.credential.nonce });
      }
      const res = await F.signInWithCredential(auth, cred);
      await ensureProfile(res.user, opts);
      emit();
      return res.user;
    }
    const p = provider === 'google' ? new F.GoogleAuthProvider()
      : provider === 'facebook' ? new F.FacebookAuthProvider()
        : new F.OAuthProvider('apple.com');
    if (provider === 'apple') { p.addScope('email'); p.addScope('name'); }
    if (provider === 'facebook') p.addScope('email');
    try {
      const res = await F.signInWithPopup(auth, p);
      await ensureProfile(res.user, opts);
      emit();
      return res.user;
    } catch (e) {
      // Home-screen web apps on iPhone can't open pop-ups: continue in the same window instead.
      if (/popup-blocked|operation-not-supported/.test(e.code || '')) {
        try { sessionStorage.setItem('wb-pending-referral', JSON.stringify((opts && opts.referral) || null)); } catch (x) { /* private mode */ }
        await F.signInWithRedirect(auth, p);
        return null;
      }
      throw e;
    }
  };

  // After a redirect sign-in (see above), finish creating the profile.
  A.finishRedirect = async function () {
    if (!A.user || A.profile) return;
    let referral = null;
    try { referral = JSON.parse(sessionStorage.getItem('wb-pending-referral') || 'null'); sessionStorage.removeItem('wb-pending-referral'); } catch (e) { /* ignore */ }
    await ensureProfile(A.user, { referral });
    emit();
  };

  A.addReferral = async function (referral) {
    if (!A.user) return null;
    return ensureProfile(A.user, { referral });
  };

  A.signOut = async function () {
    const P = plugin();
    if (P) await P.signOut().catch(() => {});
    await F.signOut(auth);
    A.profile = null;
    emit();
  };

  // Deletes the account and everything stored online for it (Firestore + subscription records),
  // through the deleteAccount function. Store subscriptions must still be cancelled in the store.
  A.deleteAccount = async function () {
    if (!auth.currentUser) return;
    try {
      await F.httpsCallable(fns, 'deleteAccount')();
    } catch (e) {
      if (e && e.code === 'functions/unauthenticated') throw { code: 'auth/requires-recent-login' };
      // Functions not deployed: delete what the app itself can.
      await F.deleteUser(auth.currentUser);
    }
    const P = plugin();
    if (P) await P.signOut().catch(() => {});
    await F.signOut(auth).catch(() => {});
    A.user = null;
    A.profile = null;
    emit();
  };

  // Premium bought on another device (checked on the server with RevenueCat). → { active } or null
  A.entitlement = async function () {
    if (!A.user) return null;
    try {
      const res = await F.httpsCallable(fns, 'entitlement')();
      return res.data || null;
    } catch (e) {
      return null;
    }
  };

  // Affiliate by code → { code, name, appleOfferCode } or null (unknown / switched off / no backend).
  A.affiliate = async function (code) {
    code = String(code || '').trim().toUpperCase();
    if (!A.enabled || !/^[A-Z0-9_-]{2,32}$/.test(code)) return null;
    try {
      const snap = await F.getDoc(F.doc(db, 'affiliates', code));
      if (!snap.exists()) return null;
      const a = snap.data();
      return a.active ? { code, name: a.name || code, appleOfferCode: a.appleOfferCode || '' } : null;
    } catch (e) {
      return null;
    }
  };

  // For the admin page.
  A.db = () => db;
  A.functions = () => fns;
  A.sdk = () => F;

  MP.account = A;
})(typeof window !== 'undefined' ? window : globalThis);
