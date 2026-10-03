# Launch guide: App Store, Google Play, accounts, payments and affiliates

Everything in the code is ready. What's left needs **your own accounts and decisions**, which can't be made from code.
Do the steps in order; each one says where to click and what to copy where. Rough time: two to three evenings,
plus waiting for Apple / Google approvals.

> Wherever you see `[your name or company]`, `[address]`, `[support email]` or `[your country]`, replace it in
> `privacy.html`, `terms.html` and `delete-account.html` before you submit.

## 0. Before you start

| You need | Cost | Notes |
|---|---|---|
| A support email address | free | e.g. support@yourdomain or a dedicated Gmail. Shown in the stores and the privacy policy. |
| A bank account | – | Apple and Google pay your earnings here every month. |
| For a company account: a D-U-N-S number | free | Apple needs it for organisations (dnb.com, takes ~1–2 weeks). As an individual you don't need it, but your own name is shown as the seller. |
| A Mac with Xcode, **or** a cloud Mac build service (Codemagic, Ionic Appflow) | free / from ~$0 | Only needed to build the iPhone app. |

## 1. Firebase (accounts and the server part)

1. Go to <https://console.firebase.google.com> → **Add project** (e.g. `prepcart`). Google Analytics: **off** (we don't track).
2. **Build → Authentication → Get started → Sign-in method**, enable:
   - **Email/Password**
   - **Google**
   - **Apple**. Needs an Apple Services ID and key, see step 3.6. Firebase shows the exact fields.
   - **Facebook**. Needs a Meta app id and secret, see section 6.
3. **Authentication → Settings → Authorized domains** → add `thelilactester-cloud.github.io`.
4. **Build → Firestore Database → Create database** → *Production mode* → location **eur3 (Europe)** (or nam5 if most users are in the US).
5. **Project settings → General → Your apps → Web (</>)** → register a web app → copy the `apiKey`, `authDomain`, `projectId`,
   `appId` into **`js/config.js`** → `firebase`. These values are public; that's normal.
6. Switch the project to the **Blaze (pay as you go)** plan (Project overview → Upgrade). The functions need it; at your size
   it stays within the free allowance (2 million function calls per month). Set a **budget alert** of e.g. $5.
7. On your computer (one time): install Node.js 22, then in this folder:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # pick your project
   cd functions && npm install && cd ..
   firebase functions:secrets:set REVENUECAT_WEBHOOK_AUTH   # type any long random text, keep it for step 5.6
   firebase functions:secrets:set REVENUECAT_SECRET_KEY     # from step 5.5
   firebase deploy --only firestore:rules,functions
   ```
   The deploy prints the URL of `revenuecatWebhook`. Keep it for step 5.6.
8. **Make yourself admin:** open the app, create your account (thelilactester@gmail.com) → Firebase console → Authentication →
   copy your **User UID** → Firestore → **Start collection** `admins` → Document ID = your UID → add a field `email` = your email.

## 2. Choose final prices (already set in the app)

| Market | Monthly | Yearly | Amazon Prime monthly |
|---|---|---|---|
| United States | $7.99 | $59.99 | $14.99 |
| United Kingdom | £5.99 | £44.99 | £8.99 |
| Germany / Austria | €6.99 | €54.99 | €8.99 |
| France | €5.99 | €44.99 | €6.99 |
| Other euro countries (IT, ES, NL…) | €4.49 | €34.99 | €4.99 |
| Canada / Australia | 7.99 | 59.99 | 9.99 |
| India | ₹249 | ₹1,899 | ₹299 |
| Japan | ¥550 | ¥4,400 | ¥600 |
| Romania (no Prime) | 24.99 lei | 189.99 lei | – |

All currencies are in `js/billing.js` (`MP.PRICES`, `MP.COUNTRY_PRICES`). A test fails if any price is not below Prime.
Enter the same prices in both stores (they let you set a price per country).

Everyone gets **1 month free** (the stores' *introductory offer / free trial*). People who come through an affiliate's link get
**2 months free** (steps 3.5 and 4.4).

## 3. Apple App Store

1. Join the **Apple Developer Program** (<https://developer.apple.com/programs/>, $99/year).
2. In **App Store Connect → Agreements, Tax and Banking**: accept the **Paid Apps** agreement, add your bank and tax forms.
   Join the **App Store Small Business Program** so Apple keeps 15% instead of 30%.
3. **Certificates, IDs & Profiles → Identifiers → App IDs** → `com.prepcart.app` (or your own id; change `appId` in
   `capacitor.config.json` and `androidPackage` in `js/config.js` to match) → tick **Sign in with Apple**.
4. **App Store Connect → My Apps → +** → new app, bundle id from step 3. Copy its **Apple ID** (a number, App Information page)
   into `js/config.js` → `appleAppId`.
5. **Monetization → Subscriptions** → subscription group **Premium** → add two subscriptions:
   - `prepcart_premium_monthly`, 1 month, prices from section 2
   - `prepcart_premium_yearly`, 1 year
   - For each, add an **Introductory Offer**: *Free*, **1 month**, all countries.
   - **Affiliate offer:** on each subscription → **Offer Codes → Create** → *Free*, **2 months**, customer eligibility
     *New subscribers*, then **Custom codes** → one code per affiliate (e.g. `MARIA2M`, with a redemption limit and an end date). Put that code in the admin page → affiliate → *App Store offer code*. Their invite link then opens the
     App Store with the offer filled in.
6. **Sign in with Apple for Firebase:** Identifiers → **Services IDs** → new (e.g. `com.prepcart.signin`) → enable Sign in
   with Apple → domain `YOUR-PROJECT.firebaseapp.com`, return URL `https://YOUR-PROJECT.firebaseapp.com/__/auth/handler`.
   Keys → new key with *Sign in with Apple* → download. Enter Services ID, Team ID, Key ID and the key in Firebase → Apple provider.
7. **Firebase → Project settings → Add app → iOS** with your bundle id → download `GoogleService-Info.plist` (keep it out of GitHub).
8. **Build** (on a Mac):
   ```bash
   npm install && npm run build
   npx cap add ios && npx cap sync ios
   npm run icons -- --ios
   npx cap open ios
   ```
   In Xcode: drag `GoogleService-Info.plist` into `App/App`, **Signing & Capabilities** → your team, add **Sign in with Apple**
   and **In-App Purchase**; **Info → URL Types** → add the `REVERSED_CLIENT_ID` from the plist (for Google sign-in) and
   `fb<FACEBOOK_APP_ID>` (for Facebook); add `FacebookAppID`, `FacebookClientToken`, `FacebookDisplayName` keys to Info.plist.
   Then **Product → Archive → Distribute → App Store Connect**.
   No Mac? Codemagic or Ionic Appflow can build and upload from this GitHub repository.
9. **TestFlight** → install on your iPhone and test buying (TestFlight purchases are free).
10. **App Privacy** answers and reviewer notes: section 7. Then **Submit for review**.

## 4. Google Play

1. **Play Console** (<https://play.google.com/console>, $25 once) → create an account. Choose *Organisation* if you have a company
   (a new *Personal* account has to run a **closed test with at least 12 testers for 14 days** before it can publish).
2. **Payments profile** → add your bank. Google keeps 15% of subscriptions.
3. **Create app** → package name `com.prepcart.app`. Then:
   **Upload key:** on your computer (once), keep the file and passwords safe:
   ```bash
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks    # copy the output
   ```
   GitHub → this repository → **Settings → Secrets and variables → Actions** → add:
   `ANDROID_KEYSTORE_BASE64` (the base64 text), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`.
   Every push to `main` then builds **prepcart-play.aab** (Actions → latest run → Artifacts). Upload that to Play.
   Use **Play App Signing** (the default).
4. **Monetize → Subscriptions** → create `prepcart_premium_monthly` and `prepcart_premium_yearly`, each with a base plan
   (auto-renewing, 1 month / 1 year, prices from section 2). On each base plan add two **offers**:
   - `free-month`: *New customer acquisition*, phase **Free trial 1 month**.
   - `affiliate`: eligibility **Developer determined**, phase **Free trial 2 months**, and the tag **`affiliate`**. The app picks
     this offer automatically for people with an affiliate code.
5. **Firebase → Project settings → Add app → Android** → package name → add the **SHA-1** fingerprints from Play Console →
   *App integrity* (both the *upload* and the *app signing* keys) → download `google-services.json` → GitHub secret
   **`GOOGLE_SERVICES_JSON`** = the whole file contents.
6. Store listing, content rating (Everyone), target audience (**18+** or **16+**, not children), **Data safety** (section 7),
   **Account deletion** URL: `https://thelilactester-cloud.github.io/weekly-basket/delete-account.html`.
7. **Testing → Internal testing** → upload the `.aab` → install from the Play link and test buying with a **license tester**
   (Settings → License testing). Then Closed testing (if a personal account), then **Production**.
8. When the app is live, set `playStoreLive: true` in `js/config.js` so invite links point to Google Play.

## 5. RevenueCat (checks subscriptions on every device)

1. Sign up at <https://www.revenuecat.com> (free up to $2,500/month revenue, then 1%).
2. New project → add **App Store** app (bundle id + In-App Purchase key from App Store Connect → Users and Access → Integrations)
   and **Play Store** app (package name + a Google Cloud service-account JSON, RevenueCat shows how).
3. **Entitlements** → `premium` → attach both products of both stores.
4. **Offerings** → `default` → packages *Monthly* and *Annual* with the products.
5. **API keys** → copy the two **public** keys into `js/billing.js` → `revenuecat.ios` / `.android`. Copy the **secret** key
   (v1) for `REVENUECAT_SECRET_KEY` in step 1.7.
6. **Integrations → Webhooks** → URL = the `revenuecatWebhook` URL from step 1.7, **Authorization header** = the same text
   as `REVENUECAT_WEBHOOK_AUTH`. Events: all.
7. **Your own free access in the store apps:** RevenueCat → Customers → find your account id (= your Firebase UID) →
   **Grant promotional entitlement** → `premium` → lifetime. (Your owner code also works on the web and Android.)

## 6. Facebook login

1. <https://developers.facebook.com> → **Create app** → use case *Authenticate and request data from users with Facebook Login*.
2. **App settings → Basic:** privacy policy URL `…/weekly-basket/privacy.html`, terms URL `…/terms.html`, **User data deletion**
   → *Data deletion instructions URL* `…/delete-account.html`, app icon, category. Copy **App ID** and **App secret** into
   Firebase → Facebook provider; copy Firebase's **OAuth redirect URI** into Facebook Login → Settings → *Valid OAuth Redirect URIs*.
3. **App settings → Advanced → Client token** → GitHub secrets `FACEBOOK_APP_ID` and `FACEBOOK_CLIENT_TOKEN`.
4. Add the Android platform (package name, key hashes) and iOS platform (bundle id). Switch the app to **Live**.
   Only `email` and `public_profile` are used, which don't need Meta's app review.

## 7. Store privacy answers

**Data that leaves the device:** account email and name, account id, purchase history, the affiliate code. Diets, health
details, family members and lists stay on the device (encrypted) and are **not collected**.

**Apple, App Privacy:**
- Data used to track you: **None**. No App Tracking Transparency prompt needed.
- Data linked to you (App Functionality only): **Contact info → Email address, Name**; **Identifiers → User ID**;
  **Purchases → Purchase history**.
- Not collected: Health & Fitness (stays on device), Location (the country is chosen by hand, stays on device), Search history
  (product searches go to Open Food Facts without any identifier).

**Google Play, Data safety:**
- Collected: **Personal info → Email address, Name, User IDs**; **Financial info → Purchase history**. All for *App functionality*
  and *Account management*, not shared, encrypted in transit.
- Users can delete their account: **yes** (in the app, and the web page above).
- Not collected: Health and fitness, location, app activity.

**Health data:** the app doesn't use HealthKit or Health Connect, shows estimates only and says "not medical advice". Keep it that way.

**Notes for Apple's reviewer:** *"Sign-in is optional; the app works without an account. A 1-month free trial starts after setup.
Paywall: Profile → See plans. Account deletion: Profile → Delete my account. Test account: [email] / [password]."* Create that test
account first.

## 8. Things App Review checks (built in)

- Paywall shows price, period, free-trial length, auto-renewal and how to cancel; **Restore purchases** button. ✓
- Links to **Terms of Use** (`terms.html`, includes Apple's required terms) and **Privacy Policy**. ✓
- **Sign in with Apple** offered next to Google and Facebook (guideline 4.8). ✓
- Account can be **deleted in the app** (5.1.1(v)); data deletion page for Google Play and Facebook. ✓
- Digital subscriptions only through Apple / Google in the store apps; no web payment links. ✓
- The iPhone app hides our own unlock codes and uses Apple offer codes (3.1.1). ✓
- The app works without an account. ✓ Users can delete all their data. ✓

**Accessibility (Apple's Accessibility Nutrition Labels, App Store Connect → App Accessibility):** the app supports
**Dark Interface**, **Larger Text** (in-app text size up to 132%, and it follows the phone's text size on Android),
**Sufficient Contrast** (WCAG AA, checked with axe-core, plus a high-contrast mode) and **Reduced Motion** (follows the phone,
plus an in-app switch). Claim **VoiceOver** only after you have tried the main tasks (setup, choosing recipes, shopping list)
with VoiceOver on an iPhone yourself. Store listing text and screenshots: `store/`.

## 9. Affiliates: day to day

- **Add an affiliate:** `…/weekly-basket/admin.html` → sign in as admin → *Add or change an affiliate* → code (e.g. `MARIA`),
  name, payout email, App Store offer code (step 3.5). Send them their **link to share**: `…/weekly-basket/join.html?ref=MARIA`.
- **What their followers get:** 2 months free (instead of 1). On iPhone the link opens the App Store with the offer code;
  on Android the code is entered in the app (or picked up from the link) and the Play `affiliate` offer is used.
- **Commission:** 20% of what you receive (after the store fee and sales tax) for every payment in a subscriber's first 12 months.
  Refunds are taken back automatically. Rate and period: `functions/commission.js`.
- **Monthly payout:** admin page → *Commissions* → pick the month → **Download month (CSV)** → pay each affiliate (PayPal/bank)
  → **Mark paid**. Apple and Google pay you about 30–45 days after the month ends, so pay affiliates after that.
- Have each affiliate accept simple written terms (commission, payment timing, no spam or fake reviews, they must say the
  post is sponsored, e.g. #ad).

## 10. Other app stores

- **Samsung Galaxy Store / Huawei AppGallery / Amazon Appstore** need their own payment systems instead of Google Play Billing,
  and Huawei phones can't use Google sign-in. Start with Apple + Google (≈95% of phones); add these later if there's demand.
  RevenueCat supports the Amazon Appstore.
- **Microsoft Store:** the web app can be packaged with <https://www.pwabuilder.com> (free).
- **Web:** the web app is live on GitHub Pages. Signed-in users who subscribed in a store app get Premium on the web too.

## 11. Before every release

- `npm test` and `cd functions && npm test` pass (GitHub runs them on every push).
- Recheck Amazon Prime prices once a year (`MP.PRIME_MONTHLY`, `MP.COUNTRY_PRICES` in `js/billing.js`).
- Have native speakers check the translations for your main markets.
- Update exchange rates in `js/regions.js` now and then (especially NGN, ARS, EGP, TRY).
