/*
 * UI. Screens are rendered from `state`, which is kept encrypted on this device (see storage.js).
 *
 * First run:  place (language, country, region) → supermarket → household (solo / family, how many)
 *             → people (each person's diet and needs) → taste (cuisines) → choose this week's recipes
 *             → shopping list.
 * Every week: Week tab → "Start a new week" → choose recipes (or repeat last week) → shopping list.
 */
(async function () {
  const MP = window.MP;
  const t = (...a) => MP.t(...a);
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toast = document.getElementById('toast');
  try { // show the chosen light/dark theme straight away
    const theme = localStorage.getItem('prepcart-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (e) { /* private mode */ }
  const DAY = 864e5;

  // ---------- state ----------
  // Guess language and country from the device (e.g. es-US → Spanish, United States).
  const newSeed = () => Math.floor(Math.random() * 1e9);

  function defaultState() {
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    const lang = MP.detectLanguage(prefs);
    const region = prefs.map((l) => (String(l).split('-')[1] || '').toUpperCase()).find((c) => MP.COUNTRIES[c]);
    const byLang = Object.entries(MP.COUNTRIES).find(([, c]) => c.lang === lang);
    const country = region || (byLang && byLang[0]) || 'US';
    return {
      v: 2, lang, onboarded: false, step: 0, tab: 'week',
      country, region: '', store: MP.storesFor(country, '')[0].id, customStore: '',
      units: MP.COUNTRIES[country].units || 'metric', household: 'solo',
      members: [MP.newMember()],
      prefs: { mealsPerDay: 3, maxTime: 60, budget: 'balanced', weeklyBudget: '', cuisines: [] },
      week: { startedAt: Date.now(), items: [], seed: newSeed() }, lastWeek: null, recentWeeks: [],
      favorites: [], checked: {}, products: {}, extras: [],
      trialStart: null, premiumCachedUntil: 0, access: null, referral: null, theme: 'system',
    };
  }

  // Bring saved data from older versions forward.
  function migrate(s) {
    if (!s) return null;
    if (s.country === 'UK') s.country = 'GB';
    if (!MP.COUNTRIES[s.country]) s.country = 'RO';
    const oldIds = { mega: 'mega-image', leclerc: 'e-leclerc', sainsburys: 'sainsbury-s', traderjoes: 'trader-joe-s', wholefoods: 'whole-foods', nr1: 'nr-1', greenhills: 'green-hills' };
    if (oldIds[s.store]) s.store = oldIds[s.store];
    const out = Object.assign(defaultState(), s, { v: 2 });
    out.prefs = Object.assign(defaultState().prefs, s.prefs || {});
    if (!out.week || !Array.isArray(out.week.items)) out.week = { startedAt: Date.now(), items: [] };
    if (!out.week.seed) out.week.seed = newSeed();
    if (s.v === 1 && s.onboarded) { out.tab = 'week'; out.trialStart = out.trialStart || Date.now(); }
    delete out.plan; delete out.swipes; delete out.dirty;
    return out;
  }

  let state = defaultState();
  try { state = migrate(await MP.secureStore.load()) || defaultState(); } catch (e) { state = defaultState(); }
  MP.lang = state.lang;
  await MP.loadLanguage(state.lang);

  function save() { MP.secureStore.save(state); }

  // UI-only state (not saved)
  const ui = { member: 0, slot: 'dinner', weekView: 'plan', sugLimit: 12, plan: 'yearly', recipeQuery: '', cuisineFilter: '' };

  // ---------- premium ----------
  // Order: a store subscription, then a free-access code (js/access.js), then the free trial.
  let grant = null;
  const withGrant = (p) => (p.reason !== 'store' && grant && grant.active ? { active: true, reason: 'code' } : p);
  let premium = MP.trialStatus(state);
  try { grant = await MP.access.grant(state); } catch (e) { grant = null; }
  premium = withGrant(premium);
  async function refreshPremium() {
    let p = await MP.billing.status(state);
    // Signed in on the web (or before the store answers): Premium bought on another device counts too.
    if (p.reason !== 'store' && MP.account && MP.account.user && MP.billing.provider !== 'store') {
      const ent = await MP.account.entitlement();
      if (ent && ent.active) p = { active: true, reason: 'store' };
    }
    premium = withGrant(p);
    if (premium.active && premium.reason === 'store') { state.premiumCachedUntil = Date.now() + 3 * DAY; save(); }
    render();
  }

  // Apple doesn't allow unlocking with our own codes in the iPhone app; there, Apple offer codes are used instead.
  const isIOSApp = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.getPlatform() === 'ios');

  async function redeemCode(text) {
    if (!MP.access.extract(text) && /^\s*[A-Za-z0-9_-]{2,32}\s*$/.test(text || '')) return applyReferral(text, true);
    const res = await MP.access.check(text);
    if (!res.ok) return toast(t(res.reason === 'expired' || res.reason === 'revoked' ? 'codeExpired' : 'codeBad'));
    state.access = { code: res.code, redeemedAt: Date.now() };
    save();
    grant = await MP.access.grant(state);
    toast(t('codeOk'));
    if (state.tab === 'paywall') state.tab = 'week';
    return refreshPremium();
  }

  function codeBox() {
    if (isIOSApp()) {
      return MP.billing.provider === 'store' ? `<button type="button" class="btn ghost wide" data-offer-code>${t('redeemOffer')}</button>` : '';
    }
    return `
      <details class="code-box"><summary>${t('haveCode')}</summary>
        <div class="code-row">
          <input type="text" data-code-input placeholder="${esc(t('codePlaceholder'))}" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr">
          <button type="button" class="btn primary" data-redeem>${t('redeem')}</button>
        </div>
      </details>`;
  }

  // ---------- affiliates ----------
  // Someone arriving through an affiliate's link (…?ref=CODE) or typing the code gets the affiliate offer.
  async function applyReferral(code, typed) {
    if (state.referral && state.referral.code === String(code).trim().toUpperCase()) { if (typed) toast(t('referralJoined', state.referral.name)); return; }
    if (state.referral || premium.reason === 'store') { if (typed) toast(t('referralAlready')); return; }
    const aff = MP.account && (await MP.account.affiliate(code));
    if (!aff) { if (typed) toast(t('referralBad')); return; }
    state.referral = { code: aff.code, name: aff.name, appleOfferCode: aff.appleOfferCode, at: Date.now() };
    save();
    if (MP.account.user) {
      await MP.account.addReferral(state.referral).catch(() => {});
      MP.billing.identify(MP.account.user.uid, { affiliate: aff.code });
    }
    toast(t('referralBanner', aff.name, Math.round(MP.BILLING_CONFIG.affiliateTrialDays / 30)));
    refreshPremium();
  }

  // ---------- account ----------
  const acct = () => (MP.account && MP.account.enabled ? MP.account : null);

  async function onAccountChange(a) {
    if (a.user) {
      // The account remembers the affiliate code, so it follows the person to a new phone.
      if (a.profile && a.profile.referral && !state.referral) {
        const aff = await a.affiliate(a.profile.referral.code);
        state.referral = { code: a.profile.referral.code, name: aff ? aff.name : a.profile.referral.code, appleOfferCode: aff ? aff.appleOfferCode : '', at: Date.now() };
        save();
      } else if (state.referral && a.profile && !a.profile.referral) {
        await a.addReferral(state.referral).catch(() => {});
      }
      await MP.billing.identify(a.user.uid, state.referral ? { affiliate: state.referral.code } : null);
    }
    refreshPremium();
  }

  function accountCard() {
    const a = acct();
    if (!a) return '';
    const u = a.user;
    if (!u) {
      return `
      <h2>${t('account')}</h2>
      <div class="card form">
        <p class="muted small">${t('accountWhy')}</p>
        <button type="button" class="btn primary wide" data-account="signup">${t('signUp')}</button>
        <button type="button" class="btn ghost wide" data-account="signin">${t('signIn')}</button>
      </div>`;
    }
    const unverified = !u.emailVerified && (u.providerData || []).some((p) => p.providerId === 'password');
    return `
      <h2>${t('account')}</h2>
      <div class="card form">
        <p>👤 ${esc(t('signedInAs', u.email || u.displayName || ''))}</p>
        ${unverified ? `<p class="small bad">${t('verifyEmail')}</p><button type="button" class="btn ghost wide" data-resend>${t('resend')}</button>` : ''}
        ${state.referral ? `<p class="small good">🎁 ${esc(t('referralJoined', state.referral.name))}</p>` : ''}
        <button type="button" class="btn ghost wide" data-signout>${t('signOut')}</button>
        <button type="button" class="btn ghost wide danger" data-delete-account>🗑 ${t('deleteAccount')}</button>
      </div>`;
  }

  // Sign in / create account / forgot password, in a sheet.
  function openAccount(mode, opts) {
    opts = opts || {};
    const a = acct();
    if (!a) return;
    let error = '';
    let info = '';
    let busy = false;
    const P = MP.CONFIG.providers || {};
    const providers = [['apple', '', 'Apple'], ['google', 'G', 'Google'], ['facebook', 'f', 'Facebook']].filter(([k]) => P[k]);
    const draw = () => {
      $modal.innerHTML = `
        <div class="sheet account-sheet" role="dialog" aria-modal="true" aria-label="${esc(t(mode === 'signin' ? 'signIn' : mode === 'reset' ? 'forgotPassword' : 'signUp'))}">
          <button type="button" class="icon-btn close" data-close aria-label="${t('close')}">✕</button>
          <div class="logo center"><img class="logo-img" src="icon.svg" alt=""></div>
          <h2 class="center">${t(mode === 'signin' ? 'signIn' : mode === 'reset' ? 'forgotPassword' : 'signUp')}</h2>
          ${mode === 'signup' && opts.intro ? `<p class="muted small center">${t('accountWhy')}</p>` : ''}
          ${state.referral && mode === 'signup' ? `<p class="good small center">🎁 ${esc(t('referralBanner', state.referral.name, Math.round(MP.BILLING_CONFIG.affiliateTrialDays / 30)))}</p>` : ''}
          ${mode !== 'reset' ? `
          <div class="providers">
            ${providers.map(([k, ic, label]) => `<button type="button" class="btn wide provider provider-${k}" data-provider="${k}" ${busy ? 'disabled' : ''}><span class="pico">${ic}</span>${esc(t('continueWith', label))}</button>`).join('')}
          </div>
          <p class="or"><span>${t('orEmail')}</span></p>` : ''}
          <form class="form" data-account-form novalidate>
            ${mode === 'signup' ? `<label class="field"><span>${t('yourName')}</span><input name="name" autocomplete="name" maxlength="60"></label>` : ''}
            <label class="field"><span>${t('email')}</span><input name="email" type="email" autocomplete="email" required dir="ltr"></label>
            ${mode !== 'reset' ? `<label class="field"><span>${t('password')}</span><input name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="8" required dir="ltr">
              ${mode === 'signup' ? `<small class="muted">${t('passwordHint')}</small>` : ''}</label>` : ''}
            ${error ? `<p class="bad small" role="alert">${esc(error)}</p>` : ''}
            ${info ? `<p class="good small" role="status">${esc(info)}</p>` : ''}
            <button type="submit" class="btn primary wide" ${busy ? 'disabled' : ''}>${busy ? '…' : t(mode === 'signin' ? 'signIn' : mode === 'reset' ? 'sendReset' : 'signUp')}</button>
          </form>
          <p class="center small">
            ${mode === 'signin' ? `<button type="button" class="link" data-mode="reset">${t('forgotPassword')}</button><br><button type="button" class="link" data-mode="signup">${t('noAccount')}</button>`
              : `<button type="button" class="link" data-mode="signin">${t('haveAccount')}</button>`}
          </p>
          ${opts.intro ? `<button type="button" class="btn ghost wide" data-close>${t('skipForNow')}</button>` : ''}
          <p class="legal">${t('consentLine')}<br><a href="terms.html" target="_blank" rel="noopener">${t('terms')}</a> · <a href="privacy.html" target="_blank" rel="noopener">${t('privacyPolicy')}</a></p>
        </div>`;
      $modal.classList.add('open');
    };
    const done = (user) => {
      if (!user) return;
      closeModal();
      toast(t('welcomeBack'));
    };
    const fail = (e) => {
      busy = false;
      if (a.cancelled(e)) { draw(); return; }
      error = t(a.errorKey(e));
      draw();
    };
    $modal.onclick = async (e) => {
      const b = e.target.closest('button');
      if (e.target === $modal || (b && b.hasAttribute('data-close'))) return closeModal();
      if (!b) return undefined;
      if (b.dataset.mode) { mode = b.dataset.mode; error = ''; info = ''; return draw(); }
      if (b.dataset.provider && !busy) {
        busy = true; error = ''; draw();
        try { done(await a.signInWith(b.dataset.provider, { referral: state.referral })); } catch (err) { fail(err); }
      }
      return undefined;
    };
    $modal.onsubmit = async (e) => {
      e.preventDefault();
      if (busy) return;
      const f = e.target;
      const email = f.email.value;
      const password = f.password ? f.password.value : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { error = t('errEmail'); return draw(); }
      if (mode === 'signup' && password.length < 8) { error = t('errWeakPassword'); return draw(); }
      busy = true; error = ''; info = ''; draw();
      try {
        if (mode === 'reset') { await a.resetPassword(email); busy = false; info = t('resetSent'); mode = 'signin'; return draw(); }
        if (mode === 'signup') return done(await a.signUp(email, password, f.name ? f.name.value : '', { referral: state.referral }));
        return done(await a.signIn(email, password, { referral: state.referral }));
      } catch (err) {
        return fail(err);
      }
    };
    delete $modal.dataset.pick;
    draw();
  }

  // ---------- small helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rName = (r) => MP.recipeName(r, state.lang);
  const iName = (id) => MP.ingName(id, state.lang);
  const money = (v) => MP.formatMoney(v, MP.storeOf(state).country.currency, state.lang, state.country);
  const qty = (q, u) => MP.formatQty(q, u, state.lang, state.units, state.country);
  const imperial = () => state.units === 'imperial';
  const members = () => MP.activeMembers(state);
  const memberName = (m) => {
    const i = state.members.indexOf(m);
    return esc(m.name || (i === 0 ? t('you') : t('personN', i + 1)));
  };
  const nameById = (id) => { const m = state.members.find((x) => x.id === id); return m ? memberName(m) : ''; };
  const round = (v) => Math.round(v);
  // Only show product photos from Open Food Facts' own image servers.
  const safeImg = (url) => (/^https:\/\/(images|static)\.openfoodfacts\.org\//.test(url || '') ? url : '');
  // Search term for an ingredient: its name without "(bunch)", "(can)" etc.
  const searchTerm = (id, lang) => MP.ingName(id, lang).replace(/\s*[(（].*?[)）]/g, '').split('/')[0].trim();
  const CUISINE_ICON = { international: '🌍', eastern_european: '🥟', mediterranean: '🫒', italian: '🍝', western: '🍔', latin: '🌮',
    middle_eastern: '🧆', african: '🍲', indian: '🍛', chinese: '🥢', japanese_korean: '🍱', southeast_asian: '🍜' };

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove('show'), 2200);
  }

  function select(field, value, options, attrs) {
    return `<select ${attrs || ''} data-f="${field}">${options.map(([v, label]) =>
      `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
  }

  function segmented(field, value, options) {
    return `<div class="seg" role="radiogroup">${options.map(([v, label]) =>
      `<button type="button" role="radio" aria-checked="${String(v) === String(value)}" class="${String(v) === String(value) ? 'on' : ''}" data-set="${field}" data-v="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
  }

  // ---------- setup screens (also reused on the Profile tab) ----------
  function placeFields() {
    const c = MP.COUNTRIES[state.country];
    const countries = Object.keys(MP.COUNTRIES)
      .map((k) => [k, MP.countryName(k, state.lang)])
      .sort((x, y) => x[1].localeCompare(y[1], state.lang))
      .map(([k, n]) => [k, `${MP.flag(k)} ${n}`]);
    return `
      <label class="field"><span>🌐 ${t('language')}</span>${select('lang', state.lang, MP.LANGUAGES, 'data-scope="root"')}</label>
      <label class="field"><span>${t('country')}</span>${select('country', state.country, countries, 'data-scope="root"')}</label>
      ${c.regions ? `<label class="field"><span>${t('region_' + (c.regionLabel || 'region'))}</span>
        ${select('region', state.region || '', [...Object.entries(c.regions).map(([k, r]) => [k, r.name]), ['', t('otherRegion')]], 'data-scope="root"')}
      </label>` : ''}
      <div class="field"><span>${t('units')}</span>${segmented('units', state.units, [['metric', t('metric')], ['imperial', t('imperial')]])}</div>`;
  }

  function shopFields() {
    const stores = MP.storesFor(state.country, state.region);
    return `
      <div class="stores">${stores.map((st) => `
        <button type="button" class="store ${st.id === state.store ? 'on' : ''}" data-store="${st.id}">${esc(st.name)}</button>`).join('')}
        <button type="button" class="store other ${state.store === MP.CUSTOM_STORE_ID ? 'on' : ''}" data-store="${MP.CUSTOM_STORE_ID}">${t('otherStore')}</button>
      </div>
      ${state.store === MP.CUSTOM_STORE_ID ? `<label class="field top"><span>${t('customStoreName')}</span>
        <input data-root="customStore" value="${esc(state.customStore)}" autocomplete="off" maxlength="60"><small class="muted">${t('customStoreHint')}</small></label>` : ''}`;
  }

  function householdFields() {
    const n = state.household === 'family' ? state.members.length : 1;
    return `
      ${segmented('household', state.household, [['solo', '🙋 ' + t('justMe')], ['family', '👨‍👩‍👧 ' + t('family')]])}
      ${state.household === 'family' ? `
        <div class="field top"><span>${t('howMany')}</span>
          <div class="stepper big"><button type="button" data-count="-1" aria-label="−">−</button><b>${n}</b><button type="button" data-count="1" aria-label="+">＋</button></div>
        </div>
        <p class="note">${t('peopleHint')}</p>` : ''}`;
  }

  function memberFields(m, i) {
    const target = MP.memberTargets(m);
    const isChild = MP.isChild(m);
    const opt = (prefix, keys) => keys.map((k) => [k, t(prefix + k)]);
    return `
      <div class="member" data-m="${i}">
        <div class="member-head">
          <strong data-member-name>${memberName(m)}</strong>
          <span class="pill">${t('daily')}: ${target.kcal} ${t('kcal')}</span>
        </div>
        <div class="grid2">
          <label class="field"><span>${t('name')}</span><input data-f="name" value="${esc(m.name)}" autocomplete="off" maxlength="40"></label>
          <label class="field"><span>${t('sex')}</span>${select('sex', m.sex, [['f', t('female')], ['m', t('male')]])}</label>
          <label class="field"><span>${t('age')}</span><input data-f="age" type="number" inputmode="numeric" min="1" max="110" value="${esc(m.age)}"></label>
          ${imperial() ? `
          <label class="field"><span>${t('heightIn')}</span><input data-f="height" data-conv="in" type="number" inputmode="numeric" min="20" max="90" value="${m.height === '' ? '' : Math.round(m.height / 2.54)}"></label>
          <label class="field"><span>${t('weightLb')}</span><input data-f="weight" data-conv="lb" type="number" inputmode="decimal" min="10" max="660" value="${m.weight === '' ? '' : Math.round(m.weight * 2.20462)}"></label>` : `
          <label class="field"><span>${t('height')}</span><input data-f="height" type="number" inputmode="numeric" min="50" max="230" value="${esc(m.height)}"></label>
          <label class="field"><span>${t('weight')}</span><input data-f="weight" type="number" inputmode="decimal" min="5" max="300" value="${esc(m.weight)}"></label>`}
          <label class="field"><span>${t('activity')}</span>${select('activity', m.activity, opt('activity_', Object.keys(MP.ACTIVITY)))}</label>
        </div>
        <p class="note" data-child-note ${isChild ? '' : 'hidden'}>${t('childNote')}</p>
        <label class="field" data-goal ${isChild ? 'hidden' : ''}><span>${t('goal')}</span>${select('goal', m.goal, opt('goal_', MP.GOALS))}</label>
        <label class="field"><span>${t('diet')}</span>${select('diet', m.diet, opt('diet_', MP.DIETS))}</label>
        <div class="field"><span>${t('needs')}</span>
          <div class="chips">${MP.NEEDS.map((n) => `
            <button type="button" class="chip ${(m.needs || []).includes(n) ? 'on' : ''}" data-need="${n}">${t('need_' + n)}</button>`).join('')}
          </div>
          ${needNotes(m.needs || [])}
        </div>
        <div class="field"><span>${t('allergies')}</span>
          <div class="chips">${MP.ALLERGENS.map((a) => `
            <button type="button" class="chip ${m.allergies.includes(a) ? 'on' : ''}" data-allergy="${a}">${t('al_' + a)}</button>`).join('')}
          </div>
        </div>
        <label class="field"><span>${t('dislikes')}</span><input data-f="dislikes" value="${esc(m.dislikes)}" placeholder="${t('dislikesHint')}" autocomplete="off" maxlength="200"></label>
      </div>`;
  }

  // Short practical notes for the needs a person has ticked.
  function needNotes(needs) {
    const notes = [];
    if (needs.includes('low_histamine')) notes.push(t('needNote_low_histamine'));
    if (needs.includes('halal')) notes.push(t('needNote_halal'));
    if (needs.includes('kosher')) notes.push(t('needNote_kosher'));
    if (needs.some((n) => ['low_histamine', 'low_fodmap', 'blood_sugar', 'dash'].includes(n))) notes.push(t('needNote_medical'));
    return notes.map((x) => `<p class="note">${esc(x)}</p>`).join('');
  }

  function peopleFields() {
    const ms = members();
    if (ui.member >= ms.length) ui.member = 0;
    return `
      ${ms.length > 1 ? `<div class="member-tabs">${ms.map((m, i) => `
        <button type="button" class="chip ${i === ui.member ? 'on' : ''}" data-member-tab="${i}">${memberName(m)} · ${t('diet_' + m.diet)}</button>`).join('')}</div>` : ''}
      ${memberFields(ms[ui.member], ui.member)}`;
  }

  function tasteFields() {
    const p = state.prefs;
    return `
      <div class="field"><span>${t('cuisinesTitle')}</span><p class="muted small">${t('cuisinesHint')}</p>
        <div class="cuisines">${MP.CUISINES.map((c) => `
          <button type="button" class="cuisine ${p.cuisines.includes(c) ? 'on' : ''}" data-cuisine="${c}"><span>${CUISINE_ICON[c]}</span>${t('cuisine_' + c)}</button>`).join('')}
        </div>
      </div>
      <div class="field"><span>${t('mealsPerDay')}</span>${segmented('mealsPerDay', p.mealsPerDay, [[3, t('meals3')], [4, t('meals4')]])}</div>
      <div class="field"><span>${t('maxTime')}</span>${segmented('maxTime', p.maxTime, [[20, t('minutes', 20)], [40, t('minutes', 40)], [60, t('minutes', 60)], [999, t('anyTime')]])}</div>
      <div class="field"><span>${t('budget')}</span>${segmented('budget', p.budget, [['save', t('budget_save')], ['balanced', t('budget_balanced')], ['any', t('budget_any')]])}</div>
      <label class="field"><span>${t('weeklyBudget')} (${MP.storeOf(state).country.currency})</span>
        <input data-pref="weeklyBudget" type="number" inputmode="decimal" min="0" value="${esc(p.weeklyBudget)}"></label>`;
  }

  // ---------- choosing the week's recipes ----------
  function builder() {
    const slots = MP.slotsFor(state.prefs.mealsPerDay);
    if (!slots.includes(ui.slot)) ui.slot = slots.includes('dinner') ? 'dinner' : slots[0];
    const ms = members();
    const cov = MP.coverage(state);
    const slotCov = cov[ui.slot];
    const items = state.week.items.filter((it) => it.slot === ui.slot);
    const sugg = MP.suggestRecipes(state, ui.slot);
    const missing = ms.filter((m) => !sugg.some((s) => s.eaters.includes(m.id)));
    const slotDone = (sl) => ms.every((m) => cov[sl][m.id] >= MP.DAYS);
    return `
      <div class="slot-tabs">${slots.map((sl) => `
        <button type="button" class="${sl === ui.slot ? 'on' : ''}" data-slot="${sl}">${t('slot_' + sl)}${slotDone(sl) ? ' ✓' : ''}</button>`).join('')}
      </div>
      <div class="coverage">${ms.map((m) => {
        const n = slotCov[m.id];
        return `<span class="cov ${n >= MP.DAYS ? 'full' : ''}"><b>${memberName(m)}</b> ${t('coverageLabel', Math.min(n, MP.DAYS), MP.DAYS)}<i style="width:${Math.min(100, (n / MP.DAYS) * 100)}%"></i></span>`;
      }).join('')}</div>
      ${missing.length ? `<p class="bad small">${esc(t('noFit', missing.map(memberName).join(', ')))}</p>` : ''}
      ${items.length ? `<div class="chosen">${items.map(chosenCard).join('')}</div>` : ''}
      <div class="row">
        ${slotDone(ui.slot) ? `<span class="good small">${t('allCovered')}</span>` : `<button type="button" class="btn small primary" data-autofill>✨ ${t('autoFill')}</button>`}
        ${items.length ? `<button type="button" class="btn small ghost" data-clear-slot>${t('clearWeek')}</button>` : ''}
      </div>
      <div class="row between"><h3>${t('suggestions')}</h3><button type="button" class="btn small ghost" data-shuffle>🔀 ${t('newIdeas')}</button></div>
      <div class="suggestions">${sugg.slice(0, ui.sugLimit).map(suggestionCard).join('')}</div>
      ${sugg.length > ui.sugLimit ? `<button type="button" class="btn ghost wide" data-more>${t('showMore')}</button>` : ''}`;
  }

  function fitsLine(eaterIds) {
    const ms = members();
    if (ms.length < 2) return '';
    if (eaterIds.length === ms.length) return `<small class="good">✓ ${t('fitsAll')}</small>`;
    const no = ms.filter((m) => !eaterIds.includes(m.id)).map(memberName).join(', ');
    return `<small>${esc(t('fitsSome', eaterIds.map(nameById).join(', ')))} · <span class="bad">${esc(t('notFor', no))}</span></small>`;
  }

  function suggestionCard(s) {
    const r = s.recipe;
    const n = MP.recipeNutrition(r);
    const inWeek = state.week.items.some((it) => it.slot === ui.slot && it.recipeId === r.id);
    return `
      <div class="sugg">
        <button type="button" class="sugg-main" data-recipe="${r.id}">
          <span class="emoji tone-${r.tags[0]}">${r.emoji}</span>
          <span class="sugg-text">
            <span class="meal-name">${esc(rName(r))}</span>
            <small class="muted">${CUISINE_ICON[r.cuisine]} ${t('cuisine_' + r.cuisine)} · ⏱ ${r.time}′ · ${round(n.kcal)} ${t('kcal')}</small>
            ${fitsLine(s.eaters)}
          </span>
        </button>
        <button type="button" class="add-btn ${inWeek ? 'on' : ''}" data-add-recipe="${r.id}" aria-label="${t('addDish')}">＋</button>
      </div>`;
  }

  function chosenCard(it) {
    const r = MP.RECIPE_BY_ID[it.recipeId];
    const ms = members();
    const can = MP.whoCanEat(r, ms).map((m) => m.id);
    const sv = MP.itemServings(state, it);
    return `
      <div class="chosen-card">
        <div class="chosen-top">
          <span class="emoji">${r.emoji}</span>
          <button type="button" class="link-name" data-recipe="${r.id}" data-servings="${sv.all / it.days}">${esc(rName(r))}</button>
          <button type="button" class="icon-btn small" data-remove-item="${it.key}" aria-label="${t('remove')}">✕</button>
        </div>
        <div class="chosen-controls">
          <div class="stepper"><button type="button" data-days="${it.key}:-1" aria-label="−">−</button><span>${esc(t('daysCount', it.days))}</span><button type="button" data-days="${it.key}:1" aria-label="+">＋</button></div>
          <small class="muted">${esc(t('cookServings', Math.round(sv.all * 2) / 2))}</small>
        </div>
        ${ms.length > 1 ? `<div class="chips eaters">${ms.map((m) => {
          const ok = can.includes(m.id);
          return `<button type="button" class="chip small ${it.eaters.includes(m.id) ? 'on' : ''}" data-eater="${it.key}:${m.id}" ${ok ? '' : 'disabled'}>${memberName(m)}</button>`;
        }).join('')}</div>` : ''}
      </div>`;
  }

  // ---------- onboarding ----------
  const STEPS = ['place', 'shop', 'household', 'people', 'taste', 'choose'];

  function renderOnboarding() {
    const step = STEPS[state.step] || 'place';
    const titles = { place: t('placeTitle'), shop: t('shopTitle'), household: t('householdTitle'), people: t('peopleTitle'), taste: t('tasteTitle'), choose: t('chooseTitle') };
    const hints = { place: t('placeHint'), shop: '', household: '', people: members().length > 1 ? t('peopleHint') : '', taste: '', choose: t('chooseHint') };
    const body = { place: placeFields, shop: shopFields, household: householdFields, people: peopleFields, taste: tasteFields, choose: builder }[step]();
    const last = state.step === STEPS.length - 1;
    $app.innerHTML = `
      <div class="screen onboarding">
        ${state.step === 0 ? `<div class="hero"><div class="logo"><img class="logo-img" src="icon.svg" alt=""></div><h1>${t('appName')}</h1><p>${t('tagline')}</p></div>` : ''}
        ${progress(state.step + 1, STEPS.length)}
        <h2>${esc(titles[step])}</h2>
        ${hints[step] ? `<p class="muted">${hints[step]}</p>` : ''}
        <form class="${step === 'choose' ? '' : 'card form'}">${body}</form>
        <div class="actions sticky">
          ${state.step > 0 ? `<button type="button" class="btn ghost" data-step="-1">${t('back')}</button>` : '<span></span>'}
          ${last ? `<button type="button" class="btn primary" data-finish>🛒 ${t('createList')}</button>`
            : `<button type="button" class="btn primary" data-step="1">${t('next')}</button>`}
        </div>
        ${state.step === 0 ? `<p class="fine">🔒 ${t('privacy')}</p>` : ''}
      </div>`;
  }

  function progress(a, b) {
    return `<div class="progress" aria-label="${t('stepOf', a, b)}">${[...Array(b)].map((_, i) => `<i class="${i < a ? 'on' : ''}"></i>`).join('')}<small>${t('stepOf', a, b)}</small></div>`;
  }

  function go(delta) {
    const step = STEPS[state.step];
    if (delta > 0 && step === 'shop' && state.store === MP.CUSTOM_STORE_ID && !state.customStore.trim()) return toast(t('customStoreName'));
    state.step = Math.max(0, Math.min(STEPS.length - 1, state.step + delta));
    if (STEPS[state.step] === 'people') ui.member = 0;
    save(); render(); window.scrollTo(0, 0);
  }

  function finishOnboarding() {
    if (!state.week.items.length) MP.autoFillWeek(state);
    state.onboarded = true;
    state.trialStart = state.trialStart || Date.now();
    state.tab = 'list';
    save();
    refreshPremium();
    window.scrollTo(0, 0);
    if (acct() && !acct().user) openAccount('signup', { intro: true });
  }

  // ---------- main app ----------
  function renderMain() {
    const { store } = MP.storeOf(state);
    const locked = !premium.active && MP.PREMIUM_TABS.includes(state.tab);
    const view = locked ? paywallView : ({ week: weekView, list: listView, store: storeView, recipes: recipesView, profile: profileView, paywall: paywallView }[state.tab] || weekView);
    const daysLeft = premium.reason === 'trial' && premium.trialEndsAt ? Math.max(0, Math.ceil((premium.trialEndsAt - Date.now()) / DAY)) : null;
    $app.innerHTML = `
      <header class="topbar">
        <div class="brand"><img class="brand-logo" src="icon.svg" alt="">${t('appName')}</div>
        <button type="button" class="pill" data-tab="profile">${MP.flag(state.country)} ${esc(store.name)}</button>
      </header>
      ${daysLeft !== null && !locked ? `<button type="button" class="trial-bar" data-tab="paywall">⏳ ${esc(t('trialLeft', daysLeft))} · ${t('seePlans')}</button>` : ''}
      <main class="screen">${view()}</main>
      <nav class="tabs">
        ${[['week', '📅', t('tabWeek')], ['list', '🛒', t('tabList')], ['store', '🏪', t('tabStore')], ['recipes', '📖', t('tabRecipes')], ['profile', '👤', t('tabProfile')]].map(([k, ic, label]) =>
          `<button type="button" data-tab="${k}" class="${state.tab === k ? 'on' : ''}"><span>${ic}</span>${label}</button>`).join('')}
      </nav>`;
  }

  function weekView() {
    const items = state.week.items;
    const head = `
      <div class="section-head"><h2>${t('yourWeek')}</h2>
        ${segmented('weekView', ui.weekView, [['plan', t('viewPlan')], ['choose', t('viewChoose')]])}</div>`;
    if (ui.weekView === 'choose') {
      return `${head}<p class="muted">${t('chooseHint')}</p>${builder()}
        <button type="button" class="btn primary wide" data-tab="list">🛒 ${t('createList')}</button>`;
    }
    if (!items.length) {
      return `${head}
        <div class="card empty-state"><p>${t('emptyWeek')}</p>
          <button type="button" class="btn primary wide" data-set="weekView" data-v="choose">${t('chooseRecipes')}</button>
          ${state.lastWeek && state.lastWeek.length ? `<button type="button" class="btn ghost wide" data-repeat-week>↻ ${t('repeatLastWeek')}</button>` : ''}
        </div>`;
    }
    const ms = members();
    const sched = MP.schedule(state);
    const summary = ms.map((m) => {
      const tg = MP.memberTargets(m);
      const tot = sched.reduce((acc, d) => { const n = MP.memberDayNutrition(state, d, m); acc.k += n.kcal; acc.p += n.protein; return acc; }, { k: 0, p: 0 });
      const avg = tot.k / MP.DAYS;
      return `<div class="target">
        <div class="target-row"><strong>${memberName(m)}</strong><span>${round(avg)} / ${tg.kcal} ${t('kcal')}${t('perDay')}</span></div>
        <div class="bar"><i style="width:${Math.min(100, (avg / tg.kcal) * 100)}%"></i></div>
        <small class="muted">${t('diet_' + m.diet)} · ${round(tot.p / MP.DAYS)} g ${t('protein')} (${t('target').toLowerCase()} ${tg.protein} g)</small>
      </div>`;
    }).join('');
    const prep = items.map((it) => {
      const r = MP.RECIPE_BY_ID[it.recipeId];
      const sv = MP.itemServings(state, it);
      return `<li><button type="button" class="link-name" data-recipe="${r.id}" data-servings="${sv.all}">${r.emoji} ${esc(rName(r))}</button>
        <small class="muted">${t('slot_' + it.slot)} · ${esc(t('daysCount', it.days))} · ${esc(t('cookServings', Math.round(sv.all * 2) / 2))}${ms.length > 1 ? ' · ' + it.eaters.map(nameById).join(', ') : ''}</small></li>`;
    }).join('');
    const days = MP.dayNames();
    return `${head}
      <div class="card">${summary}</div>
      <details class="card prep"><summary><strong>🔪 ${t('mealPrep')}</strong> <small class="muted">(${items.length})</small></summary><ul>${prep}</ul></details>
      ${sched.map((d, di) => `
        <section class="day"><h3>${esc(days[di])}</h3>
          ${Object.entries(d).map(([slot, entries]) => entries.map((e) => dayEntry(slot, e, ms)).join('') || `<div class="meal empty"><span class="slot">${t('slot_' + slot)}</span> <small class="muted">—</small></div>`).join('')}
        </section>`).join('')}
      <button type="button" class="btn ghost wide" data-new-week>🗓 ${t('newWeek')}</button>`;
  }

  function dayEntry(slot, e, ms) {
    const r = e.recipe;
    const portions = e.eaters.map((id) => {
      const m = ms.find((x) => x.id === id);
      const p = MP.portionFor(r, m, slot, state.prefs.mealsPerDay);
      return `${memberName(m)} ×${p}${m.diet === 'keto' && r.ing.some((x) => x[2]) ? ` <em>(${t('noSides')})</em>` : ''}`;
    });
    const total = e.eaters.reduce((s, id) => s + MP.portionFor(r, ms.find((x) => x.id === id), slot, state.prefs.mealsPerDay), 0);
    return `
      <div class="meal">
        <button type="button" class="meal-main" data-recipe="${r.id}" data-servings="${total}">
          <span class="emoji">${r.emoji}</span>
          <span class="meal-text">
            <span class="slot">${t('slot_' + slot)} · ⏱ ${r.time}′</span>
            <span class="meal-name">${esc(rName(r))}</span>
            <span class="portions">${portions.join(' · ')}</span>
          </span>
        </button>
      </div>`;
  }

  function listView() {
    if (!state.week.items.length) {
      return `<div class="card empty-state"><p>${t('emptyWeek')}</p>
        <button type="button" class="btn primary wide" data-go-choose>${t('chooseRecipes')}</button></div>`;
    }
    const L = MP.buildShoppingList(state);
    const budget = Number(state.prefs.weeklyBudget) || 0;
    const groups = MP.CATEGORIES.map((c) => [c, L.groceries.filter((x) => x.cat === c)]).filter(([, xs]) => xs.length);
    const done = L.groceries.filter((x) => state.checked[x.id]).length + L.extras.filter((x) => state.checked['x:' + x.key]).length;
    const count = L.groceries.length + L.extras.length;
    return `
      <div class="section-head"><h2>${esc(t('shoppingAt', L.store))}</h2></div>
      <div class="card total">
        <div><small class="muted">${t('estTotal')}</small><div class="big">${money(L.total)}</div></div>
        <div class="right">
          <div class="mono">${done}/${count} ✓</div>
          ${budget ? `<small class="${L.total > budget ? 'bad' : 'good'}">${L.total > budget ? t('overBudget') : t('underBudget')} ${money(Math.abs(budget - L.total))}</small>` : ''}
        </div>
      </div>
      <div class="list-actions">
        <button type="button" class="btn small" data-copy>📋 ${t('copy')}</button>
        ${navigator.share ? `<button type="button" class="btn small" data-share>📤 ${t('share')}</button>` : ''}
        <button type="button" class="btn small" data-print>🖨 ${t('print')}</button>
        <button type="button" class="btn small ghost" data-clear-checks>${t('clearChecks')}</button>
      </div>
      ${groups.map(([c, xs]) => `
        <section class="group"><h3>${t('cat_' + c)}</h3>${xs.map(itemRow).join('')}</section>`).join('')}
      ${L.extras.length ? `<section class="group"><h3>${t('extras')}</h3>${L.extras.map(extraRow).join('')}</section>` : ''}
      <section class="group pantry"><h3>${t('pantryTitle')}</h3><p class="muted small">${t('pantryHint')}</p>${L.pantry.map(itemRow).join('')}</section>
      <p class="fine">${t('priceNote')}</p>`;
  }

  function itemRow(x) {
    const on = !!state.checked[x.id];
    const p = x.product;
    return `
      <div class="item ${on ? 'done' : ''}">
        <input type="checkbox" data-check="${x.id}" ${on ? 'checked' : ''} aria-label="${esc(iName(x.id))}">
        <button type="button" class="item-main" data-pick="${x.id}">
          <span class="item-name">${esc(iName(x.id))}
            ${p ? `<span class="prod">${p.brand ? esc(p.brand) + ' · ' : ''}${esc(p.name)}</span>` : ''}
            <small>${qty(x.qty, x.unit)} ${t('needed')} · ${t('packs', x.packs, qty(x.pack, x.unit))}</small>
          </span>
          <span class="item-cost">${x.staple ? '' : `${money(x.cost)}<small class="src src-${x.priceSource}">${t('src_' + x.priceSource)}</small>`}<i class="chev">›</i></span>
        </button>
      </div>`;
  }

  function extraRow(x) {
    const on = !!state.checked['x:' + x.key];
    return `
      <div class="item ${on ? 'done' : ''}">
        <input type="checkbox" data-check="x:${esc(x.key)}" ${on ? 'checked' : ''} aria-label="${esc(x.name)}">
        <span class="item-main static"><span class="item-name">${esc(x.name)}<small>${esc([x.brand, x.quantity].filter(Boolean).join(' · '))}</small></span>
          <span class="item-cost">${x.price ? money(x.cost) : '—'}</span></span>
        <button type="button" class="icon-btn small" data-remove-extra="${esc(x.key)}" aria-label="${t('remove')}">✕</button>
      </div>`;
  }

  function listText() {
    const L = MP.buildShoppingList(state);
    const lines = [`🛒 ${t('shoppingAt', L.store)}`, ''];
    for (const c of MP.CATEGORIES) {
      const xs = L.groceries.filter((x) => x.cat === c);
      if (!xs.length) continue;
      lines.push(t('cat_' + c).toUpperCase());
      for (const x of xs) {
        const prod = x.product ? ` [${[x.product.brand, x.product.name].filter(Boolean).join(' ')}]` : '';
        lines.push(`${state.checked[x.id] ? '☑' : '☐'} ${iName(x.id)}${prod} — ${qty(x.qty, x.unit)} (${t('packs', x.packs, qty(x.pack, x.unit))})`);
      }
      lines.push('');
    }
    if (L.extras.length) {
      lines.push(t('extras').toUpperCase());
      for (const x of L.extras) lines.push(`${state.checked['x:' + x.key] ? '☑' : '☐'} ${[x.brand, x.name, x.quantity].filter(Boolean).join(' ')}`);
      lines.push('');
    }
    lines.push(`${t('estTotal')}: ${money(L.total)}`);
    lines.push('', t('pantryTitle').toUpperCase(), ...L.pantry.map((x) => `☐ ${iName(x.id)}`));
    return lines.join('\n');
  }

  function recipesView() {
    const ms = members();
    const q = MP.normalize(ui.recipeQuery);
    const match = (r) => (!ui.cuisineFilter || r.cuisine === ui.cuisineFilter) &&
      (!q || MP.normalize([r.name.en, r.name.ro, rName(r), ...r.ing.map(([id]) => `${MP.INGREDIENTS[id].name.en} ${iName(id)}`)].join(' ')).includes(q));
    const tile = (r) => {
      const fits = MP.whoCanEat(r, ms).length > 0;
      const fav = state.favorites.includes(r.id);
      return `<button type="button" class="tile ${fits ? '' : 'dim'}" data-recipe="${r.id}">
        <span class="emoji">${r.emoji}</span><span class="tile-name">${esc(rName(r))}</span>
        <small>${CUISINE_ICON[r.cuisine]} · ⏱ ${r.time}′ · ${round(MP.recipeNutrition(r).kcal)} ${t('kcal')}${fav ? ' · ♥' : ''}</small></button>`;
    };
    const list = MP.RECIPES.filter(match);
    return `
      <input class="search" type="search" placeholder="${t('search')}" value="${esc(ui.recipeQuery)}" data-search>
      <div class="chips scroll">
        <button type="button" class="chip small ${ui.cuisineFilter ? '' : 'on'}" data-cuisine-filter="">${t('allRecipes')}</button>
        ${MP.CUISINES.map((c) => `<button type="button" class="chip small ${ui.cuisineFilter === c ? 'on' : ''}" data-cuisine-filter="${c}">${CUISINE_ICON[c]} ${t('cuisine_' + c)}</button>`).join('')}
      </div>
      <div class="tiles">${list.map(tile).join('')}</div>`;
  }

  function profileView() {
    const sub = premium.reason === 'store' ? `<p class="good">✓ ${t('premiumActive')}</p>`
      : premium.reason === 'code' ? `<p class="good">✓ ${esc(t('freeAccess', grant.data.n))}</p>${grant.until ? `<p class="muted small">${esc(t('freeUntil', new Date(grant.until).toLocaleDateString(state.lang)))}</p>` : ''}`
      : premium.active ? `<p>⏳ ${esc(t('trialLeft', Math.max(0, Math.ceil(((premium.trialEndsAt || Date.now()) - Date.now()) / DAY))))}</p>`
        : `<p class="bad">${t('trialOver')}</p>`;
    const manage = MP.billing.manageUrl();
    return `
      ${accountCard()}
      <h2>${t('placeTitle')}</h2><form class="card form">${placeFields()}</form>
      <h2>${t('shopTitle')}</h2><form class="card form">${shopFields()}</form>
      <h2>${t('householdTitle')}</h2><form class="card form">${householdFields()}</form>
      <h2>${t('peopleTitle')}</h2><form class="card form">${peopleFields()}</form>
      <h2>${t('tasteTitle')}</h2><form class="card form">${tasteFields()}</form>
      <h2>${t('subscription')}</h2>
      <div class="card form">${sub}
        ${premium.reason !== 'store' && premium.reason !== 'code' ? `<button type="button" class="btn primary wide" data-tab="paywall">${t('seePlans')}</button>` : ''}
        ${premium.reason !== 'store' ? codeBox() : ''}
        ${manage ? `<a class="btn ghost wide" href="${esc(manage)}" target="_blank" rel="noopener">${t('manageSub')}</a>` : ''}
        ${MP.billing.provider === 'store' ? `<button type="button" class="btn ghost wide" data-restore>${t('restore')}</button>` : ''}
      </div>
      <h2>${t('theme')}</h2>
      <div class="card form">${segmented('theme', state.theme || 'system', [['system', t('theme_system')], ['light', t('theme_light')], ['dark', t('theme_dark')]])}</div>
      <h2>${t('privacyTitle')}</h2>
      <div class="card form">
        <p>${MP.secureStore.encrypted ? '🔒 ' + t('encryptedOn') : '⚠ ' + t('encryptedOff')}</p>
        <p class="muted small">${t('privacy')}</p>
        <a class="btn ghost wide" href="privacy.html" target="_blank" rel="noopener">${t('privacyPolicy')}</a>
        <button type="button" class="btn ghost wide" data-export>⬇ ${t('exportData')}</button>
        <button type="button" class="btn ghost wide danger" data-reset>🗑 ${t('deleteData')}</button>
      </div>
      <p class="fine">${t('disclaimer')}</p>`;
  }

  // ---------- paywall ----------
  let plansCache = null;
  function paywallView() {
    if (!plansCache) {
      MP.billing.plans(state).then((p) => { plansCache = p; render(); });
      return `<p class="muted center">…</p>`;
    }
    const { currency, prime } = MP.priceFor(state.country);
    const monthly = plansCache.find((p) => p.id === 'monthly');
    const yearly = plansCache.find((p) => p.id === 'yearly');
    const save = monthly && yearly ? Math.round((1 - yearly.price / (monthly.price * 12)) * 100) : 0;
    const trialOver = !premium.active;
    const days = MP.trialDaysFor(state);
    return `
      <div class="paywall">
        <div class="logo"><img class="logo-img" src="icon.svg" alt=""></div>
        <h2>${t('premiumTitle')}</h2>
        ${trialOver ? `<p class="bad">${t('trialOver')}</p>` : ''}
        <p class="muted">${t('premiumPitch')}</p>
        ${state.referral && !trialOver ? `<p class="good center">🎁 ${esc(t('referralBanner', state.referral.name, Math.round(MP.BILLING_CONFIG.affiliateTrialDays / 30)))}</p>` : ''}
        <ul class="perks"><li>👨‍👩‍👧 ${t('perk1')}</li><li>🛒 ${t('perk2')}</li><li>🏷 ${t('perk3')}</li><li>🌍 ${t('perk4')}</li></ul>
        <div class="plans">
          ${plansCache.map((p) => `
            <button type="button" class="plan ${ui.plan === p.id ? 'on' : ''}" data-plan="${p.id}">
              ${p.id === 'yearly' && save > 0 ? `<span class="badge on">${esc(t('savePct', save))}</span>` : ''}
              <strong>${p.id === 'yearly' ? t('planYearly') : t('planMonthly')}</strong>
              <span class="price ${p.priceString.length > 13 ? 'xlong' : p.priceString.length > 9 ? 'long' : ''}">${esc(p.priceString)}<small>${p.id === 'yearly' ? t('perYear') : t('perMonth')}</small></span>
            </button>`).join('')}
        </div>
        ${prime && monthly ? `<p class="good small center">✓ ${esc(t('primeCompare', MP.formatMoney(prime, currency, state.lang, state.country)))}</p>` : ''}
        <button type="button" class="btn primary wide" data-subscribe>${trialOver ? t('subscribe') : esc(t('trialLine', days))}</button>
        ${MP.billing.provider === 'store' ? `<button type="button" class="btn ghost wide" data-restore>${t('restore')}</button>` : ''}
        ${codeBox()}
        <p class="legal">${t('legal')}</p>
        <p class="legal"><a href="${esc(MP.BILLING_CONFIG.termsUrl)}" target="_blank" rel="noopener">${t('terms')}</a> · <a href="privacy.html" target="_blank" rel="noopener">${t('privacyPolicy')}</a></p>
      </div>`;
  }

  // ---------- real products (Open Food Facts / Open Prices) ----------
  function productCard(p, price, action) {
    const img = safeImg(p.image);
    const { store } = MP.storeOf(state);
    return `
      <div class="product">
        ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span class="noimg">🛒</span>'}
        <div class="product-text">
          <strong>${esc(p.name)}</strong>
          <small>${esc([p.brand, p.quantity].filter(Boolean).join(' · '))}</small>
          <span class="badges">
            ${p.nutriscore ? `<span class="ns ns-${p.nutriscore}" title="Nutri-Score">${p.nutriscore.toUpperCase()}</span>` : ''}
            ${p.atStore ? `<span class="badge">✓ ${esc(t('atStore', store.name))}</span>` : ''}
          </span>
          ${price ? `<small class="good">${esc(t('recentPrice', money(price.price), price.where || '—', price.date || ''))}</small>` : ''}
        </div>
        ${action}
      </div>`;
  }

  // Look up recent prices one by one (Open Prices) and redraw as they arrive.
  async function loadPrices(products, prices, redraw, isCurrent) {
    const { country, countryCode, store } = MP.storeOf(state);
    for (const p of products.slice(0, 8)) {
      if (!isCurrent()) return;
      if (p.code in prices) continue;
      try {
        prices[p.code] = await MP.latestPrice({ code: p.code, currency: country.currency, countryCode, store });
      } catch (e) {
        prices[p.code] = null;
      }
      if (isCurrent()) redraw();
    }
  }

  function resultsHTML(res, prices, actionFor) {
    const { store } = MP.storeOf(state);
    if (res.loading) return `<p class="muted center">${t('lookingUp')}</p>`;
    if (res.error) return `<p class="bad">${t('offline')}</p>`;
    if (!res.products.length) return `<p class="muted">${t('noProducts')}</p>`;
    return `${res.scope === 'country' && !store.custom ? `<p class="note">${esc(t('scopeCountry', store.name))}</p>` : ''}
      ${res.products.map((p, i) => productCard(p, prices[p.code], actionFor(p, i))).join('')}`;
  }

  // Store tab: search anything the shop sells and add it to the list.
  const storeSearch = { q: '', res: null, prices: {}, seq: 0 };
  function storeView() {
    const { store } = MP.storeOf(state);
    const res = storeSearch.res;
    return `
      <div class="section-head"><h2>${esc(t('storeTitle', store.name))}</h2></div>
      <form class="searchbar" data-store-search>
        <input type="search" name="q" placeholder="${t('storeSearch')}" value="${esc(storeSearch.q)}" enterkeyhint="search">
        <button class="btn primary small" type="submit">${t('searchBtn')}</button>
      </form>
      ${res ? resultsHTML(res, storeSearch.prices, (p, i) => `<button type="button" class="btn small" data-add-extra="${i}">＋</button>`)
        : `<p class="muted">${t('storeEmpty')}</p>`}
      <p class="fine">${t('storeHint')}<br><a href="${MP.offAddUrl()}" target="_blank" rel="noopener">${t('contribute')}</a></p>`;
  }

  async function runStoreSearch(q) {
    storeSearch.q = q.trim();
    if (!storeSearch.q) return;
    const seq = ++storeSearch.seq;
    const isCurrent = () => seq === storeSearch.seq && state.tab === 'store';
    storeSearch.res = { loading: true };
    render();
    const { countryCode, store } = MP.storeOf(state);
    try {
      const r = await MP.searchProducts({ query: storeSearch.q, countryCode, store, lang: state.lang });
      if (seq !== storeSearch.seq) return;
      storeSearch.res = r;
    } catch (e) {
      if (seq !== storeSearch.seq) return;
      storeSearch.res = { error: true };
    }
    if (isCurrent()) render();
    if (storeSearch.res.products) loadPrices(storeSearch.res.products, storeSearch.prices, () => isCurrent() && render(), isCurrent);
  }

  function addExtra(p) {
    const price = storeSearch.prices[p.code];
    state.extras.push({
      key: MP.uid(), code: p.code, name: p.name, brand: p.brand, quantity: p.quantity,
      price: price ? price.price : null, count: 1,
    });
    save();
    toast(t('added'));
  }

  // Sheet for one shopping-list ingredient: pick a real product and/or set your own price.
  function openProductPicker(id) {
    const ing = MP.INGREDIENTS[id];
    const key = MP.storeKey(state);
    const { store, countryCode } = MP.storeOf(state);
    const unitLabel = ing.unit === 'pcs' ? t('pcs') : ing.unit;
    const sheet = { q: searchTerm(id, state.lang), res: { loading: true }, prices: {}, seq: 0 };
    const isOpen = () => $modal.classList.contains('open') && $modal.dataset.pick === id;

    const draw = () => {
      const chosen = MP.chosenProduct(state, id);
      const est = MP.estimatedUnitPrice(state, id);
      const pack = chosen && chosen.pack > 0 ? chosen.pack : (chosen ? '' : ing.pack);
      const price = chosen && chosen.price > 0 ? chosen.price : '';
      $modal.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(iName(id))}">
          <button type="button" class="icon-btn close" data-close aria-label="${t('close')}">✕</button>
          <h2 class="sheet-title">${esc(iName(id))}</h2>
          <p class="muted">${esc(t('findAt', store.name))}</p>
          <form class="card form price-form" data-price-form>
            ${chosen && chosen.code ? productCard(chosen, null, `<span class="badge on">${t('chosen')}</span>`) : ''}
            ${chosen && !(chosen.pack > 0) ? `<p class="bad small">${t('packUnknown')}</p>` : ''}
            <div class="grid2">
              <label class="field"><span>${t('packSize')} (${esc(unitLabel)})</span>
                <input name="pack" type="number" inputmode="decimal" min="0" step="any" value="${esc(pack)}"></label>
              <label class="field"><span>${t('myPrice')} (${MP.storeOf(state).country.currency})</span>
                <input name="price" type="number" inputmode="decimal" min="0" step="any" value="${esc(price)}"
                  placeholder="≈ ${esc((est * (Number(pack) || ing.pack)).toFixed(2))}"></label>
            </div>
            <div class="row">
              <button type="submit" class="btn primary small">${t('saveProduct')}</button>
              ${chosen ? `<button type="button" class="btn ghost small" data-clear-product>${t('clearProduct')}</button>` : ''}
            </div>
          </form>
          <form class="searchbar" data-sheet-search>
            <input type="search" name="q" value="${esc(sheet.q)}" enterkeyhint="search">
            <button class="btn small" type="submit">${t('searchBtn')}</button>
          </form>
          ${resultsHTML(sheet.res, sheet.prices, (p, i) => `<button type="button" class="btn small" data-use="${i}">${t('useThis')}</button>`)}
          <p class="fine">${t('storeHint')}<br><a href="${MP.offAddUrl()}" target="_blank" rel="noopener">${t('contribute')}</a></p>
        </div>`;
      $modal.classList.add('open');
    };

    const search = async () => {
      const seq = ++sheet.seq;
      const isCurrent = () => seq === sheet.seq && isOpen();
      sheet.res = { loading: true };
      draw();
      try {
        const fallback = state.lang === 'en' ? '' : searchTerm(id, 'en');
        sheet.res = await MP.searchProducts({ query: sheet.q, fallbackQuery: fallback, countryCode, store, lang: state.lang });
      } catch (e) {
        sheet.res = { error: true };
      }
      if (!isCurrent()) return;
      draw();
      if (sheet.res.products) loadPrices(sheet.res.products, sheet.prices, draw, isCurrent);
    };

    const setChosen = (value) => {
      state.products[key] = state.products[key] || {};
      if (value) state.products[key][id] = value; else delete state.products[key][id];
      save();
    };

    $modal.dataset.pick = id;
    $modal.onclick = (e) => {
      const b = e.target.closest('button');
      if (e.target === $modal || (b && b.hasAttribute('data-close'))) return closeModal();
      if (!b) return;
      if (b.hasAttribute('data-clear-product')) { setChosen(null); return draw(); }
      if (b.dataset.use) {
        const p = sheet.res.products[Number(b.dataset.use)];
        const reported = sheet.prices[p.code];
        setChosen({
          code: p.code, name: p.name, brand: p.brand, quantity: p.quantity, image: p.image, nutriscore: p.nutriscore,
          pack: MP.packInUnit(p.parsed, ing.unit), price: reported ? reported.price : null,
          priceSource: reported ? 'open' : 'mine',
        });
        draw();
        $modal.querySelector('.sheet').scrollTop = 0;
      }
    };
    $modal.onsubmit = (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.hasAttribute('data-sheet-search')) { sheet.q = f.q.value.trim() || sheet.q; return search(); }
      if (f.hasAttribute('data-price-form')) {
        const chosen = MP.chosenProduct(state, id) || { name: iName(id) };
        const pack = Number(f.pack.value);
        const price = Number(f.price.value);
        const priceChanged = price > 0 && price !== chosen.price;
        setChosen(Object.assign({}, chosen, {
          pack: pack > 0 ? pack : null,
          price: price > 0 ? price : null,
          priceSource: priceChanged ? 'mine' : chosen.priceSource || 'mine',
        }));
        closeModal();
      }
    };
    search();
  }

  // ---------- recipe modal ----------
  function openRecipe(id, servings) {
    const r = MP.RECIPE_BY_ID[id];
    let sv = Math.max(0.5, Math.round((Number(servings) || 1) * 2) / 2);
    const draw = () => {
      const n = MP.recipeNutrition(r);
      const fav = state.favorites.includes(r.id);
      const eaters = MP.whoCanEat(r, members());
      $modal.innerHTML = `
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(rName(r))}">
          <button type="button" class="icon-btn close" data-close aria-label="${t('close')}">✕</button>
          <div class="sheet-hero tone-${r.tags[0]}"><span>${r.emoji}</span></div>
          <h2>${esc(rName(r))}</h2>
          <div class="chips"><span class="chip small">${CUISINE_ICON[r.cuisine]} ${t('cuisine_' + r.cuisine)}</span>${r.tags.map((x) => `<span class="chip small">${t('tag_' + x)}</span>`).join('')}</div>
          <p class="muted">⏱ ${r.time} min · ${t('perServing')}: ${round(n.kcal)} ${t('kcal')} · ${round(n.protein)} g ${t('protein')} · ${round(n.carbs)} g ${t('carbs')} · ${round(n.fat)} g ${t('fat')}</p>
          ${members().length > 1 ? `<p class="small">${fitsLine(eaters.map((m) => m.id)) || ''}</p>` : ''}
          ${eaters.length ? '' : `<p class="bad small">⚠ ${t('notForHousehold')}</p>`}
          <div class="row">
            <button type="button" class="btn small ${fav ? 'primary' : ''}" data-fav="${r.id}">♥ ${t('favorite')}</button>
            <div class="stepper"><button type="button" data-sv="-0.5">−</button><span>${t('cookFor', sv)}</span><button type="button" data-sv="0.5">＋</button></div>
          </div>
          <h3>${t('ingredients')}</h3>
          <ul class="ing">${r.ing.map(([iid, q, side]) => `<li><span>${esc(iName(iid))}${side ? ` <em class="muted">(${t('side')})</em>` : ''}</span><b>${qty(q * sv, MP.INGREDIENTS[iid].unit)}</b></li>`).join('')}</ul>
          <h3>${t('method')}</h3>
          ${r.steps[state.lang] ? '' : `<p class="muted small">${t('stepsInEnglish')}</p>`}
          <ol class="steps">${(r.steps[state.lang] || r.steps.en).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        </div>`;
      $modal.classList.add('open');
    };
    $modal.onsubmit = null;
    delete $modal.dataset.pick;
    $modal.onclick = (e) => {
      const b = e.target.closest('button');
      if (e.target === $modal || (b && b.hasAttribute('data-close'))) return closeModal();
      if (!b) return;
      if (b.dataset.sv) { sv = Math.max(0.5, sv + Number(b.dataset.sv)); draw(); }
      if (b.dataset.fav) {
        const i = state.favorites.indexOf(r.id);
        if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(r.id);
        save(); draw();
      }
    };
    draw();
  }

  function closeModal() {
    $modal.classList.remove('open');
    $modal.innerHTML = '';
    $modal.onsubmit = null;
    delete $modal.dataset.pick;
    render();
  }

  // ---------- events ----------
  function memberAt(el) {
    const box = el.closest('[data-m]');
    return box ? state.members[Number(box.dataset.m)] : null;
  }
  const itemByKey = (key) => state.week.items.find((it) => it.key === key);

  function setMemberCount(n) {
    n = Math.max(1, Math.min(12, n));
    while (state.members.length < n) state.members.push(MP.newMember({ age: '', height: '', weight: '' }));
    if (state.members.length > n) {
      const removed = state.members.splice(n).map((m) => m.id);
      for (const it of state.week.items) it.eaters = it.eaters.filter((id) => !removed.includes(id));
      state.week.items = state.week.items.filter((it) => it.eaters.length);
    }
  }

  $app.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('[data-search]')) {
      ui.recipeQuery = el.value;
      const pos = el.selectionStart;
      render();
      const s = $app.querySelector('[data-search]');
      s.focus(); s.setSelectionRange(pos, pos);
      return;
    }
    if (el.dataset.root === 'customStore') { state.customStore = el.value; save(); return; }
    const m = memberAt(el);
    if (m && el.dataset.f && el.tagName === 'INPUT') {
      let v = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      if (v !== '' && el.dataset.conv === 'in') v = Math.round(v * 2.54 * 10) / 10; // inches → cm
      if (v !== '' && el.dataset.conv === 'lb') v = Math.round((v / 2.20462) * 10) / 10; // pounds → kg
      m[el.dataset.f] = v;
      save();
      // Update this person's card in place. Re-rendering here would swallow the tap on "Next"
      // when someone types and then taps a button straight away.
      const box = el.closest('.member');
      box.querySelector('.pill').textContent = `${t('daily')}: ${MP.memberTargets(m).kcal} ${t('kcal')}`;
      box.querySelector('[data-child-note]').hidden = !MP.isChild(m);
      box.querySelector('[data-goal]').hidden = MP.isChild(m);
      if (el.dataset.f === 'name') {
        box.querySelector('[data-member-name]').textContent = m.name || memberName(m);
        const tab = $app.querySelector(`[data-member-tab="${box.dataset.m}"]`);
        if (tab) tab.textContent = `${m.name || memberName(m)} · ${t('diet_' + m.diet)}`;
      }
    }
    if (el.dataset.pref) { state.prefs[el.dataset.pref] = el.value; save(); }
  });

  $app.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.matches('[data-check]')) {
      if (el.checked) state.checked[el.dataset.check] = true; else delete state.checked[el.dataset.check];
      save(); render();
      return;
    }
    if (el.dataset.scope === 'root') {
      if (el.dataset.f === 'lang') { await MP.loadLanguage(el.value); state.lang = el.value; MP.lang = el.value; plansCache = null; }
      if (el.dataset.f === 'country') {
        state.country = el.value;
        state.region = '';
        state.units = MP.COUNTRIES[el.value].units || 'metric';
        state.store = MP.storesFor(el.value, '')[0].id;
        plansCache = null;
      }
      if (el.dataset.f === 'region') {
        state.region = el.value;
        const ids = MP.storesFor(state.country, el.value).map((x) => x.id);
        if (state.store !== MP.CUSTOM_STORE_ID && !ids.includes(state.store)) state.store = ids[0];
      }
      storeSearch.res = null;
      save(); render();
      return;
    }
    const m = memberAt(el);
    if (m && el.tagName === 'SELECT' && el.dataset.f) {
      m[el.dataset.f] = el.value;
      save(); render();
    }
  });

  $app.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.hasAttribute('data-store-search')) runStoreSearch(e.target.q.value);
  });

  $app.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.step) return go(Number(d.step));
    if (b.hasAttribute('data-finish')) return finishOnboarding();
    if (d.store) { state.store = d.store; storeSearch.res = null; save(); return render(); }
    if (d.set) return setOption(d.set, d.v);
    if (d.count) { setMemberCount(state.members.length + Number(d.count)); save(); return render(); }
    if (d.memberTab) { ui.member = Number(d.memberTab); return render(); }
    if (d.need) {
      const m = memberAt(b);
      m.needs = m.needs || [];
      const i = m.needs.indexOf(d.need);
      if (i >= 0) m.needs.splice(i, 1); else m.needs.push(d.need);
      save(); return render();
    }
    if (d.allergy) {
      const m = memberAt(b);
      const i = m.allergies.indexOf(d.allergy);
      if (i >= 0) m.allergies.splice(i, 1); else m.allergies.push(d.allergy);
      save(); return render();
    }
    if (d.cuisine) {
      const c = state.prefs.cuisines;
      const i = c.indexOf(d.cuisine);
      if (i >= 0) c.splice(i, 1); else c.push(d.cuisine);
      save(); return render();
    }
    if (d.slot) { ui.slot = d.slot; ui.sugLimit = 12; return render(); }
    if (d.addRecipe) {
      MP.addToWeek(state, d.addRecipe, ui.slot);
      save(); render();
      return toast(t('addedToWeek'));
    }
    if (d.removeItem) { MP.removeFromWeek(state, d.removeItem); save(); return render(); }
    if (d.days) {
      const [key, delta] = d.days.split(':');
      const it = itemByKey(key);
      it.days = Math.max(1, Math.min(MP.DAYS, it.days + Number(delta)));
      save(); return render();
    }
    if (d.eater) {
      const [key, id] = d.eater.split(':');
      const it = itemByKey(key);
      if (it.eaters.includes(id)) { if (it.eaters.length > 1) it.eaters = it.eaters.filter((x) => x !== id); } else it.eaters.push(id);
      save(); return render();
    }
    if (b.hasAttribute('data-autofill')) {
      fillSlot(ui.slot);
      save(); render();
      return toast(t('addedToWeek'));
    }
    if (b.hasAttribute('data-clear-slot')) { state.week.items = state.week.items.filter((it) => it.slot !== ui.slot); save(); return render(); }
    if (b.hasAttribute('data-shuffle')) { state.week.seed = newSeed(); ui.sugLimit = 12; save(); return render(); }
    if (b.hasAttribute('data-more')) { ui.sugLimit += 12; return render(); }
    if (b.hasAttribute('data-go-choose')) { state.tab = 'week'; ui.weekView = 'choose'; save(); return render(); }
    if (b.hasAttribute('data-new-week')) {
      if (!confirm(t('newWeekConfirm'))) return;
      // Remember the last weeks' dishes so the new week suggests different ones.
      if (state.lastWeek && state.lastWeek.length) state.recentWeeks = [state.lastWeek.map((it) => it.recipeId)].concat(state.recentWeeks || []).slice(0, 3);
      state.lastWeek = state.week.items.map((it) => Object.assign({}, it));
      state.week = { startedAt: Date.now(), items: [], seed: newSeed() };
      state.checked = {};
      state.extras = [];
      ui.weekView = 'choose';
      save(); return render();
    }
    if (b.hasAttribute('data-repeat-week')) {
      const ids = new Set(members().map((m) => m.id));
      state.week.items = (state.lastWeek || []).map((it) => Object.assign({}, it, { key: MP.uid(), eaters: it.eaters.filter((id) => ids.has(id)) }))
        .filter((it) => it.eaters.length && MP.RECIPE_BY_ID[it.recipeId]);
      save(); return render();
    }
    if (d.tab) { state.tab = d.tab; save(); render(); return window.scrollTo(0, 0); }
    if (d.pick) return openProductPicker(d.pick);
    if (d.addExtra) return addExtra(storeSearch.res.products[Number(d.addExtra)]);
    if (d.removeExtra) {
      state.extras = state.extras.filter((x) => x.key !== d.removeExtra);
      delete state.checked['x:' + d.removeExtra];
      save(); return render();
    }
    if (d.recipe) return openRecipe(d.recipe, d.servings);
    if (d.cuisineFilter !== undefined) { ui.cuisineFilter = d.cuisineFilter; return render(); }
    if (d.plan) { ui.plan = d.plan; return render(); }
    if (b.hasAttribute('data-subscribe')) {
      const plan = (plansCache || []).find((p) => p.id === ui.plan);
      if (!plan) return;
      const res = await MP.billing.purchase(plan, state.referral);
      if (res === 'purchased') { toast(t('purchased')); return refreshPremium(); }
      if (res === 'unavailable') return toast(t(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? 'subscribeSoon' : 'subscribeInApp'));
      return undefined;
    }
    if (d.account) return openAccount(d.account);
    if (b.hasAttribute('data-signout')) { await MP.account.signOut(); await MP.billing.logOut(); toast(t('signedOut')); return refreshPremium(); }
    if (b.hasAttribute('data-resend')) { await MP.account.resendVerification().catch(() => {}); return toast(t('sent')); }
    if (b.hasAttribute('data-delete-account')) {
      if (!confirm(t('deleteAccountConfirm'))) return undefined;
      try {
        await MP.account.deleteAccount();
        await MP.billing.logOut();
        toast(t('accountDeleted'));
      } catch (err) {
        toast(t(MP.account.errorKey(err)));
        if (err && err.code === 'auth/requires-recent-login') openAccount('signin');
      }
      return refreshPremium();
    }
    if (b.hasAttribute('data-redeem')) {
      const input = b.parentElement.querySelector('[data-code-input]');
      return redeemCode(input ? input.value : '');
    }
    if (b.hasAttribute('data-offer-code')) { await MP.billing.redeemOfferCode(); return refreshPremium(); }
    if (b.hasAttribute('data-restore')) {
      const ok = await MP.billing.restore();
      toast(ok ? t('restored') : t('nothingToRestore'));
      return refreshPremium();
    }
    if (b.hasAttribute('data-copy')) {
      const text = listText();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(t('copied')), () => prompt('', text));
      return undefined;
    }
    if (b.hasAttribute('data-share')) return navigator.share({ title: t('appName'), text: listText() }).catch(() => {});
    if (b.hasAttribute('data-print')) return window.print();
    if (b.hasAttribute('data-clear-checks')) { state.checked = {}; save(); return render(); }
    if (b.hasAttribute('data-export')) return exportData();
    if (b.hasAttribute('data-reset')) {
      if (!confirm(t('resetConfirm'))) return undefined;
      await MP.secureStore.wipe();
      state = defaultState(); MP.lang = state.lang; plansCache = null;
      grant = null;
      premium = MP.trialStatus(state);
      return render();
    }
    return undefined;
  });

  // Auto-fill only the meal being edited: run auto-fill on a copy and keep what it added for that meal.
  // (Items for that meal are shared with the copy, so "one more day of the same dish" updates in place.)
  function fillSlot(slot) {
    const current = state.week.items;
    const tmp = Object.assign({}, state, { week: { items: current.slice() } });
    MP.autoFillWeek(tmp);
    const added = tmp.week.items.filter((it) => it.slot === slot && !current.includes(it));
    state.week.items = current.concat(added);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prepcart-my-data.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function setOption(field, v) {
    if (field === 'units') state.units = v;
    else if (field === 'theme') { state.theme = v; applyTheme(); }
    else if (field === 'weekView') ui.weekView = v;
    else if (field === 'household') {
      state.household = v;
      if (v === 'family' && state.members.length < 2) setMemberCount(2);
    } else {
      state.prefs[field] = ['mealsPerDay', 'maxTime'].includes(field) ? Number(v) : v;
    }
    save(); render();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $modal.classList.contains('open')) closeModal();
  });

  // Light / dark / follow the phone. Also remembered outside the encrypted store so the next start
  // shows the right colours before the data is decrypted.
  function applyTheme() {
    const theme = state.theme || 'system';
    if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('prepcart-theme', theme); } catch (e) { /* private mode */ }
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#14121a' : '#7e5bc2';
  }

  function render() {
    applyTheme();
    document.documentElement.lang = state.lang;
    document.documentElement.dir = MP.RTL_LANGUAGES.includes(state.lang) ? 'rtl' : 'ltr';
    document.title = t('appName');
    if (!state.onboarded) renderOnboarding(); else renderMain();
  }

  render();
  await MP.billing.init();
  refreshPremium();

  if (MP.account) {
    MP.account.onChange((a) => { onAccountChange(a); });
    await MP.account.init();
    if (MP.account.user) await MP.account.finishRedirect().catch(() => {});
  }

  // Affiliate links: …/?ref=CODE (or #ref=CODE)
  const refMatch = (location.search + '&' + location.hash).match(/[?&#]ref=([A-Za-z0-9_-]{2,32})/);
  if (refMatch) {
    history.replaceState(null, '', location.pathname);
    applyReferral(refMatch[1], false);
  }

  // Links like …/index.html#code=WB1.… (from admin.html) apply the code straight away.
  const linkCode = MP.access.extract(decodeURIComponent(location.hash || ''));
  if (linkCode) {
    history.replaceState(null, '', location.pathname + location.search);
    if (!isIOSApp()) redeemCode(linkCode);
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
