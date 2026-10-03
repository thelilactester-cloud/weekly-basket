/*
 * UI text. English lives here; every other language is in js/lang/<code>.js and is loaded on demand.
 * Use MP.t('key') in the app. Missing keys fall back to English.
 * Ingredient / recipe names: data.js has English (and Romanian); js/lang/*.js add MP.NAMES[lang].
 * Recipe steps exist in English and Romanian; other languages show the English steps.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});
  MP.STRINGS = MP.STRINGS || {};
  MP.NAMES = MP.NAMES || {};

  MP.STRINGS.en = {
    appName: 'Prepcart', tagline: 'Your supermarket, your diet, your family. Planned every week.',
    next: 'Next', back: 'Back', close: 'Close', remove: 'Remove', stepOf: (a, b) => `${a} of ${b}`,
    // setup steps
    placeTitle: 'Where do you shop?', placeHint: 'Shops, prices, language and units follow your choice.',
    language: 'Language', country: 'Country', units: 'Units', metric: 'Metric (g, kg, l)', imperial: 'US (oz, lb)',
    region_state: 'State', region_province: 'Province', region_region: 'Region', region_emirate: 'Emirate',
    region_county: 'County', region_department: 'Department', otherRegion: 'Other / not listed',
    shopTitle: 'Choose your supermarket', otherStore: 'Other shop…', customStoreName: 'Your shop’s name',
    customStoreHint: 'Prices start as estimates; set real ones from the shopping list.',
    householdTitle: 'Who are you shopping for?', justMe: 'Just me', family: 'My family', howMany: 'How many people?',
    peopleTitle: 'Diets and needs',
    peopleHint: 'Each person can have their own diet. Dishes that suit everyone are shared; anyone they don’t suit gets their own.',
    you: 'You', personN: (n) => `Person ${n}`, daily: 'Daily target',
    name: 'Name', sex: 'Sex', female: 'Female', male: 'Male', age: 'Age', height: 'Height (cm)', weight: 'Weight (kg)',
    heightIn: 'Height (in)', weightLb: 'Weight (lb)', activity: 'Activity level', goal: 'Goal', diet: 'Diet',
    allergies: 'Allergies & foods to avoid', dislikes: 'Other foods they don’t eat', dislikesHint: 'Comma separated, e.g. mushrooms, fish',
    childNote: 'Under 18: we use age-based energy needs and never plan a calorie deficit.',
    activity_sedentary: 'Sedentary (desk job, little exercise)', activity_light: 'Light (1–3 workouts/week)',
    activity_moderate: 'Moderate (3–5 workouts/week)', activity_active: 'Active (6–7 workouts/week)', activity_very_active: 'Very active (physical job + training)',
    goal_lose: 'Lose weight', goal_maintain: 'Stay where I am', goal_gain: 'Gain weight / muscle',
    diet_omnivore: 'Everything', diet_vegetarian: 'Vegetarian', diet_vegan: 'Vegan', diet_pescatarian: 'Pescatarian',
    diet_keto: 'Low-carb / keto', diet_mediterranean: 'Mediterranean', diet_high_protein: 'High protein',
    al_gluten: 'Gluten', al_dairy: 'Dairy', al_egg: 'Eggs', al_peanuts: 'Peanuts', al_treenuts: 'Tree nuts', al_fish: 'Fish',
    al_shellfish: 'Shellfish', al_soy: 'Soy', al_sesame: 'Sesame', al_beef: 'Beef',
    tasteTitle: 'What do you like to eat?', cuisinesTitle: 'Cuisines you enjoy', cuisinesHint: 'Pick as many as you like. Recipes from these come first.',
    cuisine_international: 'Everyday & healthy', cuisine_eastern_european: 'Romanian & Eastern European', cuisine_mediterranean: 'Mediterranean & Greek',
    cuisine_italian: 'Italian', cuisine_western: 'American & British', cuisine_latin: 'Mexican & Latin American',
    cuisine_middle_eastern: 'Middle Eastern & Turkish', cuisine_african: 'African', cuisine_indian: 'Indian',
    cuisine_chinese: 'Chinese', cuisine_japanese_korean: 'Japanese & Korean', cuisine_southeast_asian: 'Thai & Vietnamese',
    mealsPerDay: 'Meals per day', meals3: '3 meals', meals4: '3 meals + snack', maxTime: 'Max cooking time',
    minutes: (n) => `${n} min`, anyTime: 'Any', budget: 'Budget', budget_save: 'Save money', budget_balanced: 'Balanced',
    budget_any: 'Don’t mind', weeklyBudget: 'Weekly budget (optional)',
    // choosing recipes
    chooseTitle: 'Choose this week’s recipes', chooseHint: 'Add dishes for each meal. Everyone’s week fills up as you go; Auto-fill does the rest.',
    suggestions: 'Suggestions for you', showMore: 'Show more', addDish: 'Add', addedToWeek: 'Added to your week',
    autoFill: 'Auto-fill the rest', clearWeek: 'Clear this meal', allCovered: 'Everyone is covered for this meal ✓',
    coverageLabel: (n, total) => `${n}/${total} days`, noFit: (names) => `No recipe fits ${names} for this meal. Try changing their filters.`,
    fitsAll: 'Suits everyone', fitsSome: (names) => `For ${names}`, notFor: (names) => `not for ${names}`,
    daysCount: (n) => (n === 1 ? '1 day' : `${n} days`), cookServings: (n) => `cook ${n} servings`,
    createList: 'Create my shopping list',
    // week tab
    tabWeek: 'Week', tabList: 'Shopping', tabStore: 'Store', tabRecipes: 'Recipes', tabProfile: 'Profile',
    yourWeek: 'Your week', viewPlan: 'Day by day', viewChoose: 'Recipes', emptyWeek: 'No recipes chosen for this week yet.',
    chooseRecipes: 'Choose recipes', repeatLastWeek: 'Repeat last week', mealPrep: 'What to cook this week',
    newWeek: 'Start a new week', newWeekConfirm: 'Start a new week? This week’s recipes, ticks and extra items will be cleared.',
    perDay: '/day', target: 'Target', kcal: 'kcal', protein: 'protein', carbs: 'carbs', fat: 'fat',
    slot_breakfast: 'Breakfast', slot_lunch: 'Lunch', slot_dinner: 'Dinner', slot_snack: 'Snack', noSides: 'without side', side: 'side',
    tag_spicy: 'Spicy', tag_quick: 'Quick', tag_comfort: 'Comfort food', tag_fresh: 'Fresh', tag_romanian: 'Traditional',
    tag_mediterranean: 'Mediterranean', tag_sweet: 'Sweet', tag_batch: 'Cook once, eat twice',
    // shopping list
    shoppingAt: (s) => `Shopping list · ${s}`, estTotal: 'Estimated total', overBudget: 'Over your budget by', underBudget: 'Under budget by',
    pantryTitle: 'Check your pantry', pantryHint: 'Basics you probably have; not included in the total.',
    packs: (n, size) => `${n} × ${size}`, needed: 'needed', copy: 'Copy list', share: 'Share', print: 'Print', copied: 'Copied!',
    clearChecks: 'Uncheck all', extras: 'Extra items', pcs: 'pcs',
    priceNote: 'Prices are estimates for your shop and area, unless you choose a product with a reported price or type in your own.',
    cat_produce: 'Fruit & vegetables', cat_bakery: 'Bakery', cat_meat: 'Meat', cat_fish: 'Fish', cat_dairy: 'Dairy, eggs & chilled',
    cat_frozen: 'Frozen', cat_pantry: 'Pantry & cans', cat_spices: 'Spices',
    src_estimate: 'estimate', src_mine: 'your price', src_open: 'reported price',
    // real products
    storeTitle: (s) => `Products at ${s}`, storeSearch: 'Search products, e.g. yogurt', searchBtn: 'Search',
    storeHint: 'Product data from Open Food Facts, a free database anyone can add to.',
    storeEmpty: 'Search what your shop sells, then tap a product to add it to your list.',
    addToList: 'Add to list', added: 'Added to your list', findAt: (s) => `Choose product at ${s}`, useThis: 'Use this', chosen: 'Chosen',
    myPrice: 'Price for one pack', packSize: 'Pack size', saveProduct: 'Save', clearProduct: 'Back to estimate',
    recentPrice: (p, where, date) => `Reported ${p} at ${where} (${date})`, lookingUp: 'Searching…',
    offline: 'Couldn’t reach the product database. Check your connection and try again.',
    scopeCountry: (s) => `No products tagged with ${s} yet, so these are sold elsewhere in your country.`,
    noProducts: 'No products found. Try another word.', atStore: (s) => `Sold at ${s}`,
    contribute: 'Missing a product? Add it on Open Food Facts →', packUnknown: 'Set the pack size to use this product.',
    // recipes
    search: 'Search recipes…', allRecipes: 'All', ingredients: 'Ingredients', method: 'Method', perServing: 'Per serving',
    cookFor: (n) => `Quantities for ${n} servings`, favorite: 'Favourite', notForHousehold: 'Doesn’t suit anyone’s diet or allergies',
    stepsInEnglish: 'Recipe steps are shown in English.',
    // subscription
    premiumTitle: 'Prepcart Premium', premiumPitch: 'Take the pressure off shopping, every week.',
    perk1: 'Weekly plans for the whole family, with each person’s diet', perk2: 'Shopping lists for your supermarket, with quantities',
    perk3: 'Real products and prices from your shop', perk4: 'Recipes from the cuisines you love',
    planMonthly: 'Monthly', planYearly: 'Yearly', perMonth: '/month', perYear: '/year', savePct: (n) => `Save ${n}%`,
    trialLine: (n) => `Start ${n}-day free trial`, subscribe: 'Subscribe', restore: 'Restore purchases',
    restored: 'Purchases restored', nothingToRestore: 'No previous purchase found', purchased: 'Welcome to Premium!',
    legal: 'Payment is charged to your App Store or Google Play account. The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel it any time in your account settings.',
    terms: 'Terms of Use', privacyPolicy: 'Privacy Policy', primeCompare: (p) => `Costs less than Amazon Prime (${p}/month)`,
    trialLeft: (n) => (n === 1 ? 'Free trial: 1 day left' : `Free trial: ${n} days left`), seePlans: 'See plans',
    // free-access codes (js/access.js)
    haveCode: 'Have a free-access code?',
    codePlaceholder: 'Paste your code or link',
    redeem: 'Use code',
    codeOk: 'Code accepted. Enjoy free access!',
    codeBad: 'This code isn’t valid. Check that you copied all of it.',
    codeExpired: 'This code has expired or was withdrawn.',
    freeAccess: (n) => (n ? `Free access (${n})` : 'Free access'),
    freeUntil: (d) => `Free until ${d}`,
    redeemOffer: 'Redeem an offer code',
    subscribeSoon: 'Subscriptions aren’t switched on yet in this test version.',
    // accounts (js/account.js)
    account: 'Account', signIn: 'Sign in', signUp: 'Create account', signOut: 'Sign out', signedOut: 'You’re signed out.',
    accountWhy: 'Create a free account to keep your subscription on all your devices. Your diets and lists stay private on this device.',
    continueWith: (p) => `Continue with ${p}`, orEmail: 'or with email', email: 'Email', password: 'Password', yourName: 'Your name',
    passwordHint: 'At least 8 characters', forgotPassword: 'Forgot password?', sendReset: 'Send reset link',
    resetSent: 'Check your email for a link to choose a new password.',
    haveAccount: 'Already have an account? Sign in', noAccount: 'New here? Create an account', skipForNow: 'Not now',
    consentLine: 'By continuing you confirm you are 16 or older and agree to the Terms of Use and the Privacy Policy.',
    signedInAs: (e) => `Signed in as ${e}`, welcomeBack: 'You’re signed in.',
    verifyEmail: 'Please confirm your email address. We sent you a link.', resend: 'Send the link again', sent: 'Sent',
    deleteAccount: 'Delete my account', accountDeleted: 'Your account was deleted.',
    deleteAccountConfirm: 'Delete your account and everything stored online for it? This can’t be undone. If you subscribed, also cancel the subscription in the App Store or Google Play.',
    errEmail: 'Please enter a valid email address.', errEmailUsed: 'There is already an account with this email. Sign in instead.',
    errWeakPassword: 'Please choose a password with at least 8 characters.', errLogin: 'Wrong email or password.',
    errTooMany: 'Too many attempts. Please wait a few minutes and try again.', errNetwork: 'No connection. Check your internet and try again.',
    errRecentLogin: 'For your security, please sign in again first.', errOtherMethod: 'This email is already used with another sign-in method. Use that one.',
    errMethodOff: 'This sign-in method isn’t available yet.', errGeneric: 'Something went wrong. Please try again.',
    // health and lifestyle needs (planner.js NEED_RULES)
    needs: 'Health & lifestyle needs (optional, combine with the diet)',
    need_low_histamine: 'Low histamine', need_low_fodmap: 'Low FODMAP (sensitive gut / IBS)', need_mind: 'MIND (brain health)',
    need_dash: 'DASH (heart & blood pressure)', need_blood_sugar: 'Blood-sugar friendly', need_anti_inflammatory: 'Anti-inflammatory',
    need_halal: 'Halal', need_kosher: 'Kosher',
    needNote_low_histamine: 'Eat dishes fresh: freeze leftovers instead of keeping them in the fridge, because histamine builds up over time.',
    needNote_halal: 'Choose halal-certified meat when you shop.', needNote_kosher: 'Choose kosher-certified meat and products when you shop.',
    needNote_medical: 'This is planning help, not medical advice. If you have a medical condition, follow your doctor’s or dietitian’s advice.',
    newIdeas: 'New ideas',
    // appearance
    theme: 'Appearance', theme_system: 'Automatic', theme_light: 'Light', theme_dark: 'Dark',
    // affiliates
    referralBanner: (name, months) => `${name}’s link: ${months} months free`, referralJoined: (name) => `Joined with ${name}’s link`,
    referralBad: 'This referral code isn’t valid.', referralAlready: 'A referral offer is already applied.',
    trialOver: 'Your free trial has ended. Subscribe to keep planning your weeks.',
    subscribeInApp: 'Subscriptions are available in the Prepcart app for iPhone and Android.',
    premiumActive: 'Premium is active', subscription: 'Subscription', manageSub: 'Manage subscription',
    // privacy
    privacyTitle: 'Privacy & your data', encryptedOn: 'Your data is encrypted and stored only on this device.',
    encryptedOff: 'This browser can’t encrypt data; it is stored only on this device.',
    privacy: 'Your details stay on this device. Product searches go to Open Food Facts without any personal data.',
    exportData: 'Export my data', deleteData: 'Delete all my data', resetConfirm: 'Delete your profile, plans and lists from this device? This can’t be undone.',
    disclaimer: 'Calorie targets are estimates (Mifflin-St Jeor). This is not medical advice; talk to a doctor or dietitian about medical diets, pregnancy or children’s nutrition.',
  };

  // Native names; right-to-left languages are flagged in MP.RTL_LANGUAGES.
  MP.LANGUAGES = [
    ['en', 'English'], ['ar', 'العربية'], ['bn', 'বাংলা'], ['bg', 'Български'], ['cs', 'Čeština'], ['de', 'Deutsch'],
    ['el', 'Ελληνικά'], ['es', 'Español'], ['fr', 'Français'], ['hi', 'हिन्दी'], ['hu', 'Magyar'], ['id', 'Bahasa Indonesia'],
    ['it', 'Italiano'], ['ja', '日本語'], ['ko', '한국어'], ['nl', 'Nederlands'], ['pl', 'Polski'], ['pt', 'Português'],
    ['ro', 'Română'], ['ru', 'Русский'], ['sv', 'Svenska'], ['sw', 'Kiswahili'], ['th', 'ไทย'], ['tr', 'Türkçe'],
    ['uk', 'Українська'], ['vi', 'Tiếng Việt'], ['zh', '中文'],
  ];
  MP.RTL_LANGUAGES = ['ar'];

  // First supported language from the browser settings, else English.
  MP.detectLanguage = function (prefs) {
    const codes = MP.LANGUAGES.map((l) => l[0]);
    for (const p of prefs || []) {
      const c = String(p).toLowerCase().split('-')[0];
      if (codes.includes(c)) return c;
    }
    return 'en';
  };

  // Load js/lang/<code>.js once (browser only; Node tests require the files directly).
  const loading = {};
  MP.loadLanguage = function (lang) {
    if (lang === 'en' || MP.STRINGS[lang] || typeof document === 'undefined') return Promise.resolve();
    if (!MP.LANGUAGES.some((l) => l[0] === lang)) return Promise.resolve();
    return (loading[lang] = loading[lang] || new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `js/lang/${lang}.js`;
      s.onload = s.onerror = () => resolve();
      document.head.appendChild(s);
    }));
  };

  // Localised ingredient / recipe names: lang file → data.js → English.
  MP.ingName = (id, lang) => {
    const n = MP.NAMES[lang] && MP.NAMES[lang].ing && MP.NAMES[lang].ing[id];
    return n || MP.INGREDIENTS[id].name[lang] || MP.INGREDIENTS[id].name.en;
  };
  MP.recipeName = (r, lang) => {
    const n = MP.NAMES[lang] && MP.NAMES[lang].recipe && MP.NAMES[lang].recipe[r.id];
    return n || r.name[lang] || r.name.en;
  };

  MP.lang = 'en';
  MP.t = function (key, ...args) {
    const v = (MP.STRINGS[MP.lang] || MP.STRINGS.en)[key];
    const out = v === undefined ? MP.STRINGS.en[key] : v;
    if (out === undefined) return key;
    return typeof out === 'function' ? out(...args) : out;
  };
  MP.dayNames = function () {
    // 2024-01-01 was a Monday
    return [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(MP.lang, { weekday: 'long' }));
  };
})(typeof window !== 'undefined' ? window : globalThis);
