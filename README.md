# Prepcart

A weekly meal planner and shopping list for **your supermarket**, **where you live**, **your diet** and **your family**.
Made to be used every week to take the pressure off shopping.

**27 languages · 58 countries · 192 recipes from 16 cuisines, with traditional dishes for every country · 21 health needs (diabetes, kidney, heart, coeliac, pregnancy, low histamine…) · drinks on the list · household sharing, end-to-end encrypted · order online with delivery services · light & dark mode · dyslexia-friendly reading mode · per-person meal schedules · encrypted on the device · optional accounts · free, with a $6.99 family Premium (budget, price comparison, private food journals)**

## How it works for the user

**First time (about 2 minutes):**
1. **Where:** language, country and (where relevant) state / province / region. Units and currency follow automatically.
2. **Supermarket:** only the chains that operate there are shown (Florida: Publix, Winn-Dixie, Sedano's + Walmart, Costco, Aldi…;
   Lagos: Ebeano, Hubmart, Shoprite…). Anything else: **Other shop…** and type its name.
3. **Who for:** just me, or my family. If family, how many people.
4. **Diets and needs, per person:** age, sex, height, weight, activity, goal, diet (everything, vegetarian, vegan,
   pescatarian, low-carb/keto, Mediterranean, high protein), plus optional **health & lifestyle needs** that combine with
   the diet: **low histamine**, **low FODMAP** (sensitive gut / IBS), **MIND** (brain health), **DASH** (heart & blood
   pressure), **blood-sugar friendly**, **anti-inflammatory**, **halal**, **kosher**. Then allergies and foods to avoid
   (gluten, dairy, eggs, peanuts, tree nuts, fish, shellfish, soy, sesame, beef) and anything else they don't eat, in any language.
   **Adults and children:** say how many adults and how many children. Children need no age, height or weight: just
   their food preferences, allergies, a portion size (small / medium / large) and the meals they eat at home; they start
   with *Mild (not spicy)*. For adults, sex, age, height, weight, activity and goal are optional.
   **Meals at home, per person:** 1, 2 or 3 meals and snacks (separately), the same every day, weekdays / weekend, or day by
   day. A child who has lunch at nursery, a parent who fasts on Mondays or eats out on Fridays: only the meals eaten at
   home are planned and bought.
5. **Taste:** the cuisines you like (Romanian & Eastern European, Mediterranean, Italian, American & British,
   Mexican & Latin, Middle Eastern & Turkish, African, Indian, Chinese, Japanese & Korean, Thai & Vietnamese,
   Everyday & healthy), cooking time, budget.
**Local dishes:** every one of the 58 countries has traditional recipes (at least two). *Traditional dishes from …* is
on by default on the taste step, and the Recipes tab has a filter for them.

**Several supermarkets:** pick your main shop and, optionally, others to compare. The shopping list then puts each
product in the shop where it is the best value (price, with a small bonus for a better Nutri-Score when you chose a
product), and only adds a shop if it saves at least 3 %. Switch to *Only <shop>* at any time.

**Display and reading** (first screen, and Profile): light / dark / automatic, three text sizes, a **dyslexia-friendly**
mode (OpenDyslexic font + wider letter, word and line spacing), Atkinson Hyperlegible for low vision, high contrast and
reduced motion. Screens are checked with axe-core (WCAG 2.1 AA) in light and dark.

6. **Choose this week's recipes:** for each meal the app suggests recipes everyone can eat first, ranked by
   your cuisines. Add a dish and pick on how many days to have it; each person's week fills up
   (e.g. *Ana 5/7 days*). **Auto-fill** completes the rest.
7. **Shopping list:** everything combined for the week, grouped by shop section, in packs (*1.05 kg needed · 3 × 500 g*),
   with an estimated total.

**Every week after that:** Week tab → **Start a new week** (or **Repeat last week**) → choose recipes → shopping list.

### Free and Premium
**Free for everyone, any number of people:** planning, all recipes, every diet and health need, drinks, the shopping list,
**household sharing** (each adult sets their own preferences on their own phone and it all adds up to one list),
**Order online** (send the list to Instacart, or open each item at Tesco, Walmart, Amazon… in the shop's app) and weekly
**saving tips** with links to the shop's loyalty app and delivery services.

**Premium, one subscription for the whole family** ($6.99 / £4.99 a month, 1 month free): compare prices across shops,
the **budget checker** (weekly budget, what was really spent, the last 8 weeks, cheaper swaps when over budget), a
**private food journal for each adult** (planned meals, photos, water, goals, optional PIN; never shared) and a
**child's food journal** for a diet the doctor recommended, with a place for the doctor's or dietitian's advice.

**Health needs from medical advice:** diabetes / blood-sugar friendly, low salt, heart-healthy, kidney-friendly (CKD), gout,
reflux, low fat, high and low fibre, pregnancy, lactose-free, coeliac, iron-rich, low histamine, low FODMAP, MIND, DASH,
anti-inflammatory, mild, halal, kosher, with short notes where a dietitian's advice matters most.

**Dropdowns you can type in:** language, country, region, diet, needs, allergies, foods to avoid and drinks are all
type-to-search lists (any language, accents ignored); foods not on the list can be typed in.

### Families where people eat differently (meal prep)
Each person has their own diet. A dish is shared by everyone it suits. Anyone it doesn't suit gets their own
dish for that meal (e.g. *Chana masala for Ana and Maria · not for Ion*, while Ion, who eats low-carb, has a Greek salad).
Portions are sized to each person's calorie target. Low-carb eaters automatically skip the rice, bread or potatoes.
The Week tab shows **What to cook this week** (each dish × number of servings) and the menu **day by day** for each person.

### Real products from your supermarket
Tap any item on the shopping list to see real products sold at your chain (photo, brand, pack size, Nutri-Score,
recently reported price). Choose one and the list uses its pack size and price, or type in the price you paid.
The **Store** tab searches everything your shop sells, so you can add extras.
Data comes from [Open Food Facts](https://world.openfoodfacts.org) and [Open Prices](https://prices.openfoodfacts.org),
which are free, open and crowd-sourced. Coverage is best for big chains in Europe and the Americas.

## Privacy & security

- **Diets, weights, family details and lists stay on the device, encrypted.** AES-256-GCM via Web Crypto. The key is generated
  on the device as *non-extractable* and stored in IndexedDB (`js/storage.js`). This data is never uploaded, also with an account.
- **Optional account** (`js/account.js`, Firebase Authentication): email + password, Google, Apple or Facebook. Online we keep
  only email, name, when the terms were accepted and the affiliate code (Firestore `users/{uid}`). The database rules
  (`firestore.rules`) let people read only their own account and never change their affiliate code.
- **No analytics, no ads, no tracking.** Network calls: product searches (search word, country, shop name), sign-in,
  and subscription checks (RevenueCat).
- **Strict Content Security Policy:** only the app's own code (plus Google's sign-in helper) runs; connections only to the product
  databases, Firebase and RevenueCat; product images only from Open Food Facts; all outside text is escaped.
- **Household sharing** (`js/household.js`): the household's plan and people are encrypted on the phone (AES-256-GCM) with a
  household key that exists only in the invite link after the `#` (never sent to a server). Firestore stores ciphertext only;
  `firestore.rules` lets only members read it, and invites are accepted by the `joinHousehold` function. Food journals
  are never shared; journal photos are encrypted on the device.
- **Export my data**, **Delete all my data** (device) and **Delete my account** (online) are in Profile and always free.
- [`privacy.html`](privacy.html) (GDPR / UK GDPR / CCPA), [`terms.html`](terms.html) (incl. Apple's required terms),
  [`delete-account.html`](delete-account.html) (for Google Play and Facebook). Store privacy answers: [`LAUNCH.md`](LAUNCH.md).

## Subscription (paywall)

- **Free:** everything needed to plan and shop, for any number of people (see *Free and Premium* above).
- **Premium, for the whole family:** 1 month free (2 through an affiliate's link), then US $6.99 / $49.99 a year, UK £4.99 /
  £39.99, Germany €5.99, France €5.49, other euro countries €4.49… always below Amazon Prime in the same country (a test
  enforces it). Apple Family Sharing covers an Apple family; household sharing extends Premium to everyone in the household.
- In the iPhone and Android apps, payment goes through Apple / Google in-app purchase, managed with
  [RevenueCat](https://www.revenuecat.com) (`js/billing.js`). Apple and Google pay you monthly into your bank account.
  With an account, Premium follows the person to their other devices and the web.
- **Shop commissions:** *Order online* and the saving tips use Amazon Associates tags and affiliate links (Instacart, Walmart,
  Awin…) set in `js/config.js` → `affiliate`. Setup: [`LAUNCH.md`](LAUNCH.md) section 9b.
- Setup steps (accounts, product ids, keys, bank): **[`LAUNCH.md`](LAUNCH.md)**.

## Affiliates

- Each affiliate gets a link: `…/weekly-basket/join.html?ref=CODE`. People who join through it get **2 months free**
  (on iPhone through an App Store offer code, on Android through a Play offer tagged `affiliate`, on the web locally).
- Affiliates earn **20% of what you receive** (after store fee and tax) on each payment in a subscriber's **first 12 months**.
  `functions/` (Firebase Cloud Functions) records every payment from RevenueCat's webhook, once, and takes refunds back.
- `admin.html` (admin account): add affiliates, copy their links, see each month's commissions, download CSV, mark as paid.

## Try it

- **Download page (start here):** https://thelilactester-cloud.github.io/weekly-basket/download.html
- **Web app (any phone or computer):** https://thelilactester-cloud.github.io/weekly-basket/
  (on a phone: *Share → Add to Home Screen* on iPhone, *⋮ → Install app* on Android).
- **Android test app:** https://thelilactester-cloud.github.io/weekly-basket/download/prepcart.apk
  (open it on the phone and allow installing from this source). Also in the `android-test` release.
- Both are rebuilt automatically when changes reach the main branch (`.github/workflows/publish.yml`).
  The web app needs a one-time setting: repository **Settings → Pages → Source: GitHub Actions**.
- **iPhone app:** needs an Apple Developer account; then TestFlight (see `LAUNCH.md`). Until then, use the web app.

## Free-access codes: owner, testers, gifts

- **Admin page:** https://thelilactester-cloud.github.io/weekly-basket/admin.html. Open your private admin key file
  (`weekly-basket-admin-key.json`, never put it in the repository), choose who the code is for (affiliate, gift,
  tester, owner), how long it's free (7 days to forever) and the last day it can be used. You get a **link**
  (opens the app and applies the code) and the **code** itself (paste in *Profile → Subscription → Have a free-access code?*
  or on the paywall). Download the list as CSV to keep track of who got which code.
- Codes are signed with your private key and checked in the app with the public key in `js/access.js`, so nobody can
  make or change one. There is no server: a code can't be "used up", so give each affiliate their own code, set an end
  date, and switch off a leaked code by adding its id to `MP.REVOKED_CODES`.
- **iPhone:** Apple doesn't allow unlocking with your own codes (App Review 3.1.1), so the iPhone app hides the code box
  and shows **Redeem an offer code** instead, using App Store offer codes (see `LAUNCH.md`).

## Run it

- **In a browser:** serve the folder (`python3 -m http.server 8000` in this folder) and open `http://localhost:8000`.
  It needs `http(s)://` for encryption and offline mode, so opening the file directly isn't supported.
- **As iPhone / Android apps:** `npm install`, then `npm run cap:add:ios` / `npm run cap:add:android`, then
  `npm run cap:open:ios` / `cap:open:android` to build in Xcode / Android Studio. See [`LAUNCH.md`](LAUNCH.md).
- **Android test app on your computer:** `npm install`, `npm run cap:add:android`, `npm run icons`, `npm run android:apk`
  (needs Android Studio / the Android SDK and Java 21).
- **Tests:** `npm test` (32 tests) and `cd functions && npm test` (commission rules).
- **Accounts locally:** `firebase emulators:start --project demo-weekly-basket`, then set `emulators: true` in `js/config.js`.

## Code map

| File | What's inside |
|---|---|
| `js/app.js` | The screens: setup steps, recipe chooser, week, shopping list, product picker, store search, recipes, profile, paywall |
| `js/planner.js` | Calorie targets, per-person diet, health-need (`NEED_RULES`) & allergy filters, suggestions, auto-fill, the week, day-by-day schedule, shopping list, units & currency |
| `js/data.js` | 106 ingredients (pack size, base price, nutrition, allergens) and 192 recipes with cuisine, the countries where they are traditional, steps in English and Romanian |
| `js/regions.js` | 58 countries → regions → supermarket chains, currency, regional price level, chain price index |
| `js/products.js` | Open Food Facts / Open Prices client: search, quantity parsing, caching, rate limiting |
| `js/storage.js` | Encrypted on-device storage, migration, delete-everything |
| `js/billing.js` | Subscription config, prices per currency, Amazon Prime comparison, trial, RevenueCat bridge |
| `js/access.js`, `admin.html`, `js/admin.js` | Free-access codes: checking them in the app, and the admin page that makes them |
| `js/account.js`, `js/config.js`, `js/vendor/firebase.js` | Accounts (Firebase), settings for the online services, bundled Firebase SDK (`npm run vendor`) |
| `js/admin-affiliates.js`, `join.html`, `js/join.js` | Affiliate admin (affiliates, commissions, payouts) and the invite landing page |
| `functions/` | Server: RevenueCat webhook → commissions, delete account, Premium check for the web |
| `firestore.rules`, `firebase.json` | Database access rules and Firebase project settings |
| `scripts/configure-native.mjs` | Adds Google / Facebook sign-in settings to the generated Android project |
| `js/i18n.js` + `js/lang/*.js` | English UI text + 26 other languages (UI, ingredient and recipe names), loaded on demand; Arabic is right-to-left |
| `privacy.html`, `terms.html`, `delete-account.html` | Privacy policy, terms of use, account deletion (URLs for the stores) |
| `package.json`, `capacitor.config.json`, `scripts/build.mjs`, `assets/` | Packaging as native iOS / Android apps, app icon and splash screen |

## Extending

- **Shop:** add `s('Chain name', priceIndex)` to a country (nationwide) or a region in `js/regions.js`.
- **Country:** ISO code, `currency`, `priceFactor` (cost of 1 RON of groceries in local currency, adjusted for price level),
  default `lang`, optional `regions`, `regionLabel`, `units: 'imperial'`. Add a price for its currency in `js/billing.js`.
- **Language:** copy `js/lang/es.js`, translate, add to `MP.LANGUAGES` (and `MP.RTL_LANGUAGES` if right-to-left) and to `sw.js`.
  The tests check that every language has every string, ingredient and recipe name.
- **Recipe:** add to `MP.RECIPES` in `js/data.js` (quantities per serving, `cuisine`, `'side'` on carb sides, steps in en + ro),
  then its name in each `js/lang/*.js`.

## Limitations

- **Translations were written by AI.** They're complete and consistent, but have a native speaker review each language
  before launching in that market. Recipe steps exist in English and Romanian; other languages show the English steps.
- **Product coverage depends on Open Food Facts.** It's thinner for small chains and in parts of Africa and Asia.
  The app then shows country-wide products and lets people type prices.
- **Estimated prices** are a model (base price × country × region × chain), not quotes. Exchange rates in
  `js/regions.js` are 2026 approximations; update them periodically, especially NGN, ARS, EGP and TRY.
- **On the web**, the free trial is tracked on the device. Selling subscriptions on the web securely needs a small server
  (see `LAUNCH.md`). In the iPhone / Android apps, subscriptions are verified by Apple, Google and RevenueCat.
- Calorie targets are estimates, **not medical advice**.
