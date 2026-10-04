/*
 * Subscription ("Premium") and the paywall rules.
 *
 * How it works in each place the app runs:
 *  - iOS / Android app (Capacitor): real in-app subscriptions through Apple / Google, managed with
 *    RevenueCat (https://www.revenuecat.com). Apple and Google require their own payment systems for
 *    digital subscriptions; RevenueCat checks receipts on its servers, so Premium can't be faked.
 *    Fill in the two public SDK keys below once you have created the app in RevenueCat.
 *  - Web: the free trial runs on this device. Optional Stripe Payment Links can be added below, but
 *    selling on the web securely needs a small server to confirm payments (see LAUNCH.md).
 *
 * Pricing rule: Premium must never cost more than Amazon Prime in the same currency.
 * `MP.PRIME_MONTHLY` / `MP.COUNTRY_PRICES` hold Prime's monthly price (2026) and a test checks every price.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  MP.BILLING_CONFIG = {
    entitlement: 'premium',
    trialDays: 30, // one month free for everyone (the stores' introductory offer)
    affiliateTrialDays: 60, // two months free when someone joins through an affiliate's link
    // Product ids to create in App Store Connect / Google Play Console (and attach in RevenueCat).
    products: { monthly: 'prepcart_premium_monthly', yearly: 'prepcart_premium_yearly' },
    // Public SDK keys from RevenueCat → Project → API keys (safe to ship in the app).
    revenuecat: { ios: '', android: '' },
    // Optional, web only: Stripe Payment Links. Leave empty to show "available in the app" instead.
    web: { monthly: '', yearly: '', manage: '' },
    termsUrl: 'terms.html', // our Terms of Use (includes Apple's required EULA terms)
    privacyUrl: 'privacy.html',
  };

  // One Premium subscription covers the whole family (Family Sharing in the stores, and every adult in a shared
  // household). Prices per currency [monthly, yearly]: affordable (about $7 a month or less), and below Amazon Prime's
  // monthly price wherever Prime is sold. The stores show their own localised price once loaded;
  // these are what the paywall shows before that, and what you enter in the store consoles.
  MP.PRICES = {
    USD: [6.99, 49.99], EUR: [4.49, 34.99], GBP: [4.99, 39.99], CHF: [5.99, 44.99], CAD: [7.99, 59.99],
    AUD: [7.99, 59.99], NZD: [8.99, 69.99], RON: [24.99, 189.99], MDL: [99, 799], HUF: [1990, 14990],
    PLN: [9.99, 74.99], CZK: [129, 999], SEK: [49, 379], NOK: [59, 449], DKK: [45, 349], RSD: [599, 4590],
    TRY: [59.99, 459.99], RUB: [299, 2290], UAH: [129, 999], AED: [14.99, 109.99], SAR: [14.99, 109.99],
    EGP: [27.99, 219.99], MAD: [39.99, 299.99], NGN: [2500, 19000], GHS: [39.99, 299.99], KES: [399, 2990],
    ZAR: [79.99, 599.99], INR: [249, 1899], PKR: [699, 4999], BDT: [299, 2299], CNY: [28, 198],
    JPY: [550, 4400], KRW: [6900, 52000], IDR: [49000, 379000], PHP: [199, 1490], VND: [79000, 599000],
    THB: [129, 990], MYR: [14.9, 109.9], SGD: [2.79, 21.98], MXN: [89, 699], BRL: [17.9, 139.9],
    ARS: [4999, 38999], COP: [14900, 119900], CLP: [3990, 29900], PEN: [14.9, 119.9],
  };

  // Countries whose Prime price differs from the rest of their currency area get their own price
  // (set these as country prices in App Store Connect / Play Console).
  MP.COUNTRY_PRICES = {
    DE: { price: [5.99, 44.99], prime: 8.99 }, AT: { price: [5.99, 44.99], prime: 8.99 },
    FR: { price: [5.49, 39.99], prime: 6.99 },
  };

  // Amazon Prime monthly price in each currency where Prime is sold (approx. 2026).
  MP.PRIME_MONTHLY = {
    USD: 14.99, GBP: 8.99, EUR: 4.99 /* lowest euro-area Prime: IT/ES/NL */, CAD: 9.99, AUD: 9.99,
    JPY: 600, INR: 299, BRL: 19.9, MXN: 99, SEK: 59, PLN: 10.99, TRY: 69.9, AED: 16, SAR: 16,
    EGP: 29, SGD: 2.99, ZAR: 99,
  };

  // Price for a country: { currency, monthly, yearly, prime } (prime = Prime's monthly price, or null).
  MP.priceFor = function (countryCode) {
    const c = MP.COUNTRIES[countryCode] || MP.COUNTRIES.US;
    const own = MP.COUNTRY_PRICES[countryCode];
    const currency = MP.PRICES[c.currency] ? c.currency : 'USD';
    const [monthly, yearly] = own ? own.price : MP.PRICES[currency];
    return { currency, monthly, yearly, prime: own ? own.prime : MP.PRIME_MONTHLY[currency] || null };
  };

  const C = MP.BILLING_CONFIG;
  const DAY = 864e5;

  function native() {
    const cap = g.Capacitor;
    return cap && cap.isNativePlatform && cap.isNativePlatform() ? cap : null;
  }

  let purchases = null; // RevenueCat plugin, when running as a native app
  let lastInfo = null;

  const billing = {
    provider: 'none',

    async init() {
      const cap = native();
      const key = cap && (cap.getPlatform() === 'ios' ? C.revenuecat.ios : C.revenuecat.android);
      if (cap && key && cap.registerPlugin) {
        try {
          purchases = cap.registerPlugin('Purchases');
          await purchases.configure({ apiKey: key });
          billing.provider = 'store';
          return;
        } catch (e) {
          purchases = null;
        }
      }
      billing.provider = C.web.monthly || C.web.yearly ? 'web' : 'trial-only';
    },

    // { active, reason: 'store' | 'trial' | 'none', trialEndsAt }
    async status(state) {
      if (purchases) {
        try {
          const res = await purchases.getCustomerInfo();
          lastInfo = res.customerInfo || res;
          if (lastInfo.entitlements && lastInfo.entitlements.active && lastInfo.entitlements.active[C.entitlement]) {
            return { active: true, reason: 'store' };
          }
        } catch (e) { /* offline: fall through to the stored flag */ }
        if (state.premiumCachedUntil && Date.now() < state.premiumCachedUntil) return { active: true, reason: 'store' };
      }
      return MP.trialStatus(state);
    },

    // Plans to show on the paywall: [{ id: 'monthly'|'yearly', price, priceString, pkg }]
    async plans(state) {
      const p = MP.priceFor(state.country);
      const fallback = [
        { id: 'monthly', price: p.monthly, priceString: MP.formatMoney(p.monthly, p.currency, state.lang, state.country) },
        { id: 'yearly', price: p.yearly, priceString: MP.formatMoney(p.yearly, p.currency, state.lang, state.country) },
      ];
      if (!purchases) return fallback;
      try {
        const off = await purchases.getOfferings();
        const pkgs = (off.current && off.current.availablePackages) || [];
        const pick = (type) => pkgs.find((x) => x.packageType === type || x.identifier === `$rc_${type.toLowerCase()}`);
        const out = [];
        for (const [id, type] of [['monthly', 'MONTHLY'], ['yearly', 'ANNUAL']]) {
          const pkg = pick(type);
          if (pkg) out.push({ id, price: pkg.product.price, priceString: pkg.product.priceString, pkg });
        }
        return out.length ? out : fallback;
      } catch (e) {
        return fallback;
      }
    },

    // Link purchases to the signed-in account, so Premium follows the person to other devices.
    // attributes: { affiliate: 'CODE' } — used to work out affiliate commissions.
    async identify(uid, attributes) {
      if (!purchases) return;
      try {
        if (uid) await purchases.logIn({ appUserID: uid });
        if (attributes) await purchases.setAttributes(attributes);
      } catch (e) { /* offline: RevenueCat retries on the next start */ }
    },
    async logOut() {
      if (!purchases) return;
      try { await purchases.logOut(); } catch (e) { /* already anonymous */ }
    },

    // Returns 'purchased' | 'cancelled' | 'web' | 'unavailable'
    // affiliate: { code, appleOfferCode } when the person came through an affiliate's link.
    async purchase(plan, affiliate) {
      const cap = native();
      // iPhone: affiliate offers are App Store offer codes. Open Apple's redeem page with the code filled in.
      if (purchases && affiliate && affiliate.appleOfferCode && cap.getPlatform() === 'ios' && MP.CONFIG && MP.CONFIG.appleAppId) {
        g.open(`https://apps.apple.com/redeem?ctx=offercodes&id=${encodeURIComponent(MP.CONFIG.appleAppId)}&code=${encodeURIComponent(affiliate.appleOfferCode)}`, '_blank');
        return 'web';
      }
      // Android: the affiliate offer is a Play Console offer tagged "affiliate" (2 months free).
      if (purchases && plan.pkg && affiliate && cap.getPlatform() === 'android') {
        const options = (plan.pkg.product && plan.pkg.product.subscriptionOptions) || [];
        const offer = options.find((o) => (o.tags || []).includes('affiliate'));
        if (offer) {
          try {
            const res = await purchases.purchaseSubscriptionOption({ subscriptionOption: offer });
            lastInfo = res.customerInfo;
            return lastInfo.entitlements.active[C.entitlement] ? 'purchased' : 'cancelled';
          } catch (e) {
            return 'cancelled';
          }
        }
      }
      if (purchases && plan.pkg) {
        try {
          const res = await purchases.purchasePackage({ aPackage: plan.pkg });
          lastInfo = res.customerInfo;
          return lastInfo.entitlements.active[C.entitlement] ? 'purchased' : 'cancelled';
        } catch (e) {
          return 'cancelled';
        }
      }
      const link = C.web[plan.id];
      if (link) {
        g.open(link, '_blank', 'noopener');
        return 'web';
      }
      return 'unavailable';
    },

    async restore() {
      if (!purchases) return false;
      try {
        const res = await purchases.restorePurchases();
        lastInfo = res.customerInfo || res;
        return !!lastInfo.entitlements.active[C.entitlement];
      } catch (e) {
        return false;
      }
    },

    // iPhone app: Apple's sheet for App Store offer codes (how affiliates / gifts work on iOS).
    async redeemOfferCode() {
      if (!purchases || !purchases.presentCodeRedemptionSheet) return false;
      try {
        await purchases.presentCodeRedemptionSheet();
        return true;
      } catch (e) {
        return false;
      }
    },

    manageUrl() {
      const cap = native();
      if (cap && cap.getPlatform() === 'ios') return 'https://apps.apple.com/account/subscriptions';
      if (cap) return 'https://play.google.com/store/account/subscriptions';
      return C.web.manage || '';
    },
  };

  // The free trial starts when onboarding is finished and lasts `trialDays` days, or
  // `affiliateTrialDays` when the person came through an affiliate's link (state.referral).
  MP.trialDaysFor = (state) => (state.referral && state.referral.code ? C.affiliateTrialDays : C.trialDays);
  MP.trialStatus = function (state, now) {
    now = now || Date.now();
    if (!state.trialStart) return { active: true, reason: 'trial', trialEndsAt: null };
    const ends = state.trialStart + MP.trialDaysFor(state) * DAY;
    return now < ends ? { active: true, reason: 'trial', trialEndsAt: ends } : { active: false, reason: 'none', trialEndsAt: ends };
  };

  // Prepcart is free: planning for any number of people, every diet, recipes, drinks, the shopping list and
  // household sharing, ordering online and saving tips. Premium (free for the first month) adds these features:
  MP.PREMIUM_FEATURES = ['compareShops', 'budget', 'diary', 'childDiary'];
  MP.PREMIUM_TABS = ['journal'];

  MP.billing = billing;
})(typeof window !== 'undefined' ? window : globalThis);
