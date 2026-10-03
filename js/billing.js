/*
 * Subscription ("Premium") and the paywall rules.
 *
 * How it works in each place the app runs:
 *  - iOS / Android app (Capacitor): real in-app subscriptions through Apple / Google, managed with
 *    RevenueCat (https://www.revenuecat.com). Apple and Google require their own payment systems for
 *    digital subscriptions; RevenueCat checks receipts on its servers, so Premium can't be faked.
 *    Fill in the two public SDK keys below once you have created the app in RevenueCat.
 *  - Web: the free trial runs on this device. Optional Stripe Payment Links can be added below, but
 *    selling on the web securely needs a small server to confirm payments (see APP_STORE.md).
 *
 * Pricing rule: Premium must never cost more than Amazon Prime in the same currency.
 * `MP.PRIME_MONTHLY` holds Prime's monthly price per currency (2026) and a test checks every price.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  MP.BILLING_CONFIG = {
    entitlement: 'premium',
    trialDays: 7,
    // Product ids to create in App Store Connect / Google Play Console (and attach in RevenueCat).
    products: { monthly: 'weeklybasket_premium_monthly', yearly: 'weeklybasket_premium_yearly' },
    // Public SDK keys from RevenueCat → Project → API keys (safe to ship in the app).
    revenuecat: { ios: '', android: '' },
    // Optional, web only: Stripe Payment Links. Leave empty to show "available in the app" instead.
    web: { monthly: '', yearly: '', manage: '' },
    termsUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', // Apple's standard EULA
    privacyUrl: 'privacy.html',
  };

  // Our prices per currency [monthly, yearly]. The stores show their own localised price once loaded;
  // these are what the paywall shows before that, and what you enter in the store consoles.
  MP.PRICES = {
    USD: [3.99, 29.99], EUR: [3.99, 29.99], GBP: [3.49, 24.99], CHF: [3.99, 29.99], CAD: [4.99, 39.99],
    AUD: [4.99, 39.99], NZD: [5.49, 42.99], RON: [17.99, 129.99], MDL: [69, 549], HUF: [1290, 9990],
    PLN: [9.99, 79.99], CZK: [89, 699], SEK: [39, 299], NOK: [39, 299], DKK: [29, 219], RSD: [399, 2990],
    TRY: [49.99, 399.99], RUB: [199, 1490], UAH: [79, 599], AED: [12.99, 99.99], SAR: [12.99, 99.99],
    EGP: [24.99, 199.99], MAD: [24.99, 199.99], NGN: [1500, 12000], GHS: [24.99, 199.99], KES: [249, 1990],
    ZAR: [39.99, 299.99], INR: [149, 1199], PKR: [399, 2999], BDT: [199, 1499], CNY: [18, 138],
    JPY: [480, 3800], KRW: [4900, 39000], IDR: [29000, 229000], PHP: [99, 799], VND: [49000, 399000],
    THB: [79, 599], MYR: [9.9, 79.9], SGD: [2.49, 19.98], MXN: [69, 549], BRL: [14.9, 119.9],
    ARS: [2999, 23999], COP: [9900, 79900], CLP: [2490, 19900], PEN: [9.9, 79.9],
  };

  // Amazon Prime monthly price in each currency where Prime is sold (approx. 2026).
  MP.PRIME_MONTHLY = {
    USD: 14.99, GBP: 8.99, EUR: 4.99 /* lowest euro-area Prime: IT/ES/NL */, CAD: 9.99, AUD: 9.99,
    JPY: 600, INR: 299, BRL: 19.9, MXN: 99, SEK: 59, PLN: 10.99, TRY: 69.9, AED: 16, SAR: 16,
    EGP: 29, SGD: 2.99, ZAR: 99,
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
      const currency = MP.storeOf(state).country.currency;
      const p = MP.PRICES[currency] || MP.PRICES.USD;
      const cur = MP.PRICES[currency] ? currency : 'USD';
      const fallback = [
        { id: 'monthly', price: p[0], priceString: MP.formatMoney(p[0], cur, state.lang, state.country) },
        { id: 'yearly', price: p[1], priceString: MP.formatMoney(p[1], cur, state.lang, state.country) },
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

    // Returns 'purchased' | 'cancelled' | 'web' | 'unavailable'
    async purchase(plan) {
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

  // The free trial starts when onboarding is finished and lasts `trialDays` days.
  MP.trialStatus = function (state, now) {
    now = now || Date.now();
    if (!state.trialStart) return { active: true, reason: 'trial', trialEndsAt: null };
    const ends = state.trialStart + C.trialDays * DAY;
    return now < ends ? { active: true, reason: 'trial', trialEndsAt: ends } : { active: false, reason: 'none', trialEndsAt: ends };
  };

  // Screens that need Premium once the trial is over. Profile (including export / delete data)
  // and browsing recipes always stay free.
  MP.PREMIUM_TABS = ['week', 'list', 'store'];

  MP.billing = billing;
})(typeof window !== 'undefined' ? window : globalThis);
