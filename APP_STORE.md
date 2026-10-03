# Launching Weekly Basket on the App Store and Google Play

This is the checklist for publishing the iPhone and Android apps with the subscription. The app code is ready.
What's left needs **your own accounts**, which can't be created from code.

## 1. Accounts you need

| What | Cost | Why |
|---|---|---|
| [Apple Developer Program](https://developer.apple.com/programs/) | US$99 / year | Publish on the App Store, sell subscriptions |
| [Google Play Console](https://play.google.com/console) | US$25 once | Publish on Google Play, sell subscriptions |
| [RevenueCat](https://www.revenuecat.com) | Free up to US$2.5k monthly revenue, then 1% | Verifies purchases, handles trials and renewals for both stores |
| A Mac with Xcode | – | Needed to build the iPhone app |
| A web address for the privacy policy | free (e.g. GitHub Pages) | Both stores require a public privacy policy URL |

Also set up: a support email address, and (Apple) the **Paid Apps agreement**, bank and tax details in App Store Connect.

## 2. Build the apps

```bash
npm install
npm run cap:add:ios        # creates ios/ (needs a Mac with Xcode + CocoaPods)
npm run cap:add:android    # creates android/
npm run cap:sync           # after every change to the web code
npm run cap:open:ios       # build & upload from Xcode
npm run cap:open:android   # build & upload from Android Studio
```

Before the first build, change `appId` in `capacitor.config.json` from `com.weeklybasket.app` to your own reverse-domain id.

## 3. Subscription products

Create **the same two products in both stores** (in App Store Connect, put them in one subscription group, e.g. "Premium"):

| Product id | Period | Free trial (introductory offer) | Suggested base price |
|---|---|---|---|
| `weeklybasket_premium_monthly` | 1 month | 1 week free | US$3.99 |
| `weeklybasket_premium_yearly` | 1 year | 1 week free | US$29.99 |

Then in **RevenueCat**: create the project → add the iOS and Android apps → create an entitlement called **`premium`** →
attach both products → put them in the **current offering** as the *Monthly* and *Annual* packages.
Copy the two **public SDK keys** into `js/billing.js` → `MP.BILLING_CONFIG.revenuecat.ios` / `.android`.

### Prices per country (all below Amazon Prime)

Set local prices in each store instead of relying only on automatic currency conversion. `js/billing.js` → `MP.PRICES`
has a suggested monthly and yearly price for every currency the app supports. `MP.PRIME_MONTHLY` has Prime's price where
Prime exists, and the test suite fails if any of our monthly prices isn't lower. Examples:

| Market | Weekly Basket monthly / yearly | Amazon Prime monthly |
|---|---|---|
| United States | $3.99 / $29.99 | $14.99 |
| United Kingdom | £3.49 / £24.99 | £8.99 |
| Euro area (DE, FR, IT, ES, NL…) | €3.99 / €29.99 | €4.99 – €8.99 |
| Canada | C$4.99 / C$39.99 | C$9.99 |
| Australia | A$4.99 / A$39.99 | A$9.99 |
| India | ₹149 / ₹1,199 | ₹299 |
| Japan | ¥480 / ¥3,800 | ¥600 |
| Brazil | R$14.90 / R$119.90 | R$19.90 |
| Mexico | MX$69 / MX$549 | MX$99 |
| Singapore | S$2.49 / S$19.98 | S$2.99 |
| UAE / Saudi Arabia | 12.99 AED / 12.99 SAR | 16 AED / 16 SAR |
| Romania (no Prime) | 17.99 lei / 129.99 lei | – |

Amazon changes its prices, so recheck `MP.PRIME_MONTHLY` before launch and once a year.

### Free access for you, testers, affiliates and gifts in the store apps

- **You (the owner):** in the iPhone app, TestFlight builds never charge, and App Store sandbox testers don't pay. For the
  live app, give your own account Premium in **RevenueCat → Customers → (your user) → Grant promotional entitlement**.
  On the web and Android your owner code also works (Profile → Subscription → Have a free-access code?).
- **Affiliates / gifts on iPhone:** App Store Connect → your app → Subscriptions → **Offer Codes**. Create a *custom code*
  per affiliate (e.g. `MARIA30`, used by many people) or one-time codes (up to 1 million per quarter), with 1 week to
  1 year free. People redeem them in the app (Profile → **Redeem an offer code**) or with Apple's link
  `https://apps.apple.com/redeem?ctx=offercodes&id=<your app id>&code=<CODE>`. App Store Connect and RevenueCat show how many were used.
- **Affiliates / gifts on Android:** the app's own codes from `admin.html` work. Google Play also has **promo codes**
  (Play Console → Monetize → Promo codes) if you prefer Google's.
- Don't show or accept the app's own codes in the iPhone app (App Review 3.1.1). The app already hides them there.

## 4. Privacy answers for the stores

The app collects **no personal data on any server**: profiles, health details (weight, height, age, diet), family
members and lists are encrypted and stored only on the device. Apple and Google define "collected" as *sent off the
device*, so these are not collected.

**Apple, App Privacy ("nutrition label"):**
- *Data used to track you:* **None.**
- *Data linked to you:* **None.**
- *Data not linked to you:* **Purchases** (purchase history, for App Functionality) and **Identifiers** (a random app
  user id created by RevenueCat, for App Functionality). Both come from the subscription system.
- *Search history:* product search words go to Open Food Facts without any identifier. Apple counts data the
  developer collects; we don't receive it. If you want to be cautious, declare "Search history – not linked to you –
  App Functionality".
- No App Tracking Transparency prompt is needed (no tracking, no IDFA).

**Google Play, Data safety:**
- *Data collected:* **Financial info → Purchase history** (by Google Play / RevenueCat, for App functionality, not shared,
  not optional for subscribers) and **App info → other** if you declare search words as above.
- *Data shared:* none. *Encrypted in transit:* yes (HTTPS). *Users can request deletion:* yes (in-app "Delete all my data";
  there is no server copy).
- No account system, so the account-deletion requirement doesn't apply.

**Health data:** the app doesn't use HealthKit or Health Connect. It shows estimates and the in-app disclaimer
"not medical advice". Keep it that way to avoid medical-app review requirements.

## 5. Things App Review checks (all already built in)

- Subscription terms on the paywall: price, period, free-trial length, auto-renewal and how to cancel. ✓
- **Restore purchases** button. ✓
- Links to **Terms of Use** (Apple's standard EULA by default, set in `MP.BILLING_CONFIG.termsUrl`) and **Privacy Policy**. ✓
- Digital subscription sold only through Apple / Google in-app purchase inside the apps. ✓ (Don't show web payment
  links in the iOS app.)
- The app works without an account. ✓
- Users can delete their data in the app. ✓
- Minimum functionality: the app is a full planner, not a wrapped website. ✓
- **Age rating:** 4+ / Everyone.

For the reviewer notes, write: *"No login needed. A 7-day free trial starts after setup. To see the paywall, open
Profile → See plans. Product data comes from the open Open Food Facts database."*

## 6. Before you submit

- [ ] Put `privacy.html` on a public URL (GitHub Pages works) and add it in both consoles. Fill in your support email in it.
- [ ] Fill in the RevenueCat keys in `js/billing.js` and test buying with Apple sandbox / Google license testers.
- [ ] Recheck Amazon Prime prices in `js/billing.js` and run the tests.
- [ ] Have native speakers review the translations for the markets you launch in first.
- [ ] Store listing: name, subtitle, description and screenshots (6.7" and 6.5" iPhone, Android phone) in your main languages.
- [ ] Update exchange rates in `js/regions.js` (especially NGN, ARS, EGP, TRY, which move fast).

## Selling on the web too (optional)

To sell subscriptions on the website as well, add Stripe Payment Links in `MP.BILLING_CONFIG.web`. On the web the
free trial and Premium status live on the device, so they can be bypassed. For real enforcement, add a small server
(Stripe webhook → issue a signed entitlement), or use RevenueCat's web billing so the same `premium` entitlement
works across web, iOS and Android.
