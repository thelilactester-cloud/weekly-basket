# Weekly Basket

A weekly meal planner and shopping list for **your supermarket**, **where you live**, **your diet** and **your family**.
Made to be used every week to take the pressure off shopping.

**27 languages · 58 countries · 67 recipes from 12 cuisines · per-person diets · encrypted on the device · subscription with a 7-day free trial**

## How it works for the user

**First time (about 2 minutes):**
1. **Where:** language, country and (where relevant) state / province / region. Units and currency follow automatically.
2. **Supermarket:** only the chains that operate there are shown (Florida: Publix, Winn-Dixie, Sedano's + Walmart, Costco, Aldi…;
   Lagos: Ebeano, Hubmart, Shoprite…). Anything else: **Other shop…** and type its name.
3. **Who for:** just me, or my family. If family, how many people.
4. **Diets and needs, per person:** age, sex, height, weight, activity, goal, diet (everything, vegetarian, vegan,
   pescatarian, low-carb/keto, Mediterranean, high protein), allergies and foods to avoid (gluten, dairy, eggs,
   peanuts, tree nuts, fish, shellfish, soy, sesame, beef) and anything else they don't eat, in any language.
5. **Taste:** the cuisines you like (Romanian & Eastern European, Mediterranean, Italian, American & British,
   Mexican & Latin, Middle Eastern & Turkish, African, Indian, Chinese, Japanese & Korean, Thai & Vietnamese,
   Everyday & healthy), meals per day, cooking time, budget.
6. **Choose this week's recipes:** for each meal the app suggests recipes everyone can eat first, ranked by
   your cuisines. Add a dish and pick on how many days to have it; each person's week fills up
   (e.g. *Ana 5/7 days*). **Auto-fill** completes the rest.
7. **Shopping list:** everything combined for the week, grouped by shop section, in packs (*1.05 kg needed · 3 × 500 g*),
   with an estimated total.

**Every week after that:** Week tab → **Start a new week** (or **Repeat last week**) → choose recipes → shopping list.

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

- **Everything the user types stays on the device, encrypted.** AES-256-GCM via Web Crypto. The key is generated
  on the device as *non-extractable* (it can't be read or copied out) and stored in IndexedDB (`js/storage.js`).
  Data from older versions is migrated and the plain copy deleted.
- **No accounts, no server, no analytics, no ads, no tracking.** The only network calls are product searches
  (search word, country, shop name) and, in the native apps, subscription checks with Apple/Google via RevenueCat.
- **Strict Content Security Policy:** only the app's own code runs. Connections are allowed only to the product and
  price databases and RevenueCat. Product images load only from Open Food Facts' image servers, and all text from
  outside is escaped.
- **Export my data** (JSON download) and **Delete all my data** (wipes data, key, caches) are in Profile and stay free forever.
- Privacy policy: [`privacy.html`](privacy.html). App Store and Play privacy answers: [`APP_STORE.md`](APP_STORE.md).

## Subscription (paywall)

- **7-day free trial**, then **Premium**: monthly or yearly, **always cheaper than Amazon Prime** in the same
  currency (a test enforces it). For example, US $3.99/month or $29.99/year vs Prime's $14.99/month;
  UK £3.49 vs £8.99; euro area €3.99 vs €4.99 (lowest euro Prime); India ₹149 vs ₹299; Japan ¥480 vs ¥600.
- After the trial, the Week, Shopping and Store tabs need Premium. Recipes and Profile (including export and delete) stay free.
- In the iPhone and Android apps, payment goes through Apple / Google in-app purchase, managed with
  [RevenueCat](https://www.revenuecat.com) (`js/billing.js`). Receipts are verified on their servers. The paywall includes
  everything the stores require: price, period, trial length, auto-renewal terms, Restore purchases, Terms and Privacy links.
- Setup steps (accounts, product ids, keys): **[`APP_STORE.md`](APP_STORE.md)**.

## Try it

- **Download page (start here):** https://thelilactester-cloud.github.io/weekly-basket/download.html
- **Web app (any phone or computer):** https://thelilactester-cloud.github.io/weekly-basket/
  (on a phone: *Share → Add to Home Screen* on iPhone, *⋮ → Install app* on Android).
- **Android test app:** https://thelilactester-cloud.github.io/weekly-basket/download/weekly-basket.apk
  (open it on the phone and allow installing from this source). Also in the `android-test` release.
- Both are rebuilt automatically when changes reach the main branch (`.github/workflows/publish.yml`).
  The web app needs a one-time setting: repository **Settings → Pages → Source: GitHub Actions**.
- **iPhone app:** needs an Apple Developer account; then TestFlight (see `APP_STORE.md`). Until then, use the web app.

## Free access: owner, affiliates, gifts

- **Admin page:** https://thelilactester-cloud.github.io/weekly-basket/admin.html. Open your private admin key file
  (`weekly-basket-admin-key.json`, never put it in the repository), choose who the code is for (affiliate, gift,
  tester, owner), how long it's free (7 days to forever) and the last day it can be used. You get a **link**
  (opens the app and applies the code) and the **code** itself (paste in *Profile → Subscription → Have a free-access code?*
  or on the paywall). Download the list as CSV to keep track of who got which code.
- Codes are signed with your private key and checked in the app with the public key in `js/access.js`, so nobody can
  make or change one. There is no server: a code can't be "used up", so give each affiliate their own code, set an end
  date, and switch off a leaked code by adding its id to `MP.REVOKED_CODES`.
- **iPhone:** Apple doesn't allow unlocking with your own codes (App Review 3.1.1), so the iPhone app hides the code box
  and shows **Redeem an offer code** instead, using App Store offer codes (see `APP_STORE.md`).

## Run it

- **In a browser:** serve the folder (`python3 -m http.server 8000` in this folder) and open `http://localhost:8000`.
  It needs `http(s)://` for encryption and offline mode, so opening the file directly isn't supported.
- **As iPhone / Android apps:** `npm install`, then `npm run cap:add:ios` / `npm run cap:add:android`, then
  `npm run cap:open:ios` / `cap:open:android` to build in Xcode / Android Studio. See [`APP_STORE.md`](APP_STORE.md).
- **Android test app on your computer:** `npm install`, `npm run cap:add:android`, `npm run icons`, `npm run android:apk`
  (needs Android Studio / the Android SDK and Java 21).
- **Tests:** `npm test` (32 tests).

## Code map

| File | What's inside |
|---|---|
| `js/app.js` | The screens: setup steps, recipe chooser, week, shopping list, product picker, store search, recipes, profile, paywall |
| `js/planner.js` | Calorie targets, per-person diet & allergy filters, suggestions, auto-fill, the week, day-by-day schedule, shopping list, units & currency |
| `js/data.js` | 94 ingredients (pack size, base price, nutrition, allergens) and 67 recipes with cuisine, steps in English and Romanian |
| `js/regions.js` | 58 countries → regions → supermarket chains, currency, regional price level, chain price index |
| `js/products.js` | Open Food Facts / Open Prices client: search, quantity parsing, caching, rate limiting |
| `js/storage.js` | Encrypted on-device storage, migration, delete-everything |
| `js/billing.js` | Subscription config, prices per currency, Amazon Prime comparison, trial, RevenueCat bridge |
| `js/access.js`, `admin.html`, `js/admin.js` | Free-access codes: checking them in the app, and the admin page that makes them |
| `js/i18n.js` + `js/lang/*.js` | English UI text + 26 other languages (UI, ingredient and recipe names), loaded on demand; Arabic is right-to-left |
| `privacy.html` | Privacy policy (also the URL to give the app stores) |
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
  (see `APP_STORE.md`). In the iPhone / Android apps, subscriptions are verified by Apple, Google and RevenueCat.
- Calorie targets are estimates, **not medical advice**.
