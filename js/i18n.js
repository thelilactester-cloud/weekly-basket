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
    need_dash: 'DASH (heart & blood pressure)', need_blood_sugar: 'Diabetes / blood-sugar friendly', need_anti_inflammatory: 'Anti-inflammatory',
    need_halal: 'Halal', need_kosher: 'Kosher',
    needNote_low_histamine: 'Eat dishes fresh: freeze leftovers instead of keeping them in the fridge, because histamine builds up over time.',
    needNote_halal: 'Choose halal-certified meat when you shop.', needNote_kosher: 'Choose kosher-certified meat and products when you shop.',
    needNote_medical: 'This is planning help, not medical advice. If you have a medical condition, follow your doctor’s or dietitian’s advice.',
    newIdeas: 'New ideas',
    // appearance
    theme: 'Appearance', theme_system: 'Automatic', theme_light: 'Light', theme_dark: 'Dark',
    tabJournal: 'Journal', premiumTrialLeft: (n) => `Premium free for ${n} more ${n === 1 ? 'day' : 'days'}`,
    premiumFeature: 'Premium', seePremium: 'See Premium',
    upsellLine: (price) => `Free for the first month, then ${price} a month for the whole family.`,
    freeForever: 'Planning, recipes, every diet, drinks and the shopping list are free for everyone, for any number of people. Premium adds:',
    familyPlan: 'One subscription for the whole family, every adult and child.',
    feat_compareShops: 'Compare prices across your shops', feat_budget: 'Budget checker: weekly budget, what you spent, cheaper swaps',
    feat_orderOnline: 'Order your list online with delivery services', feat_diary: 'A private food diary for each adult, with photos and goals',
    feat_childDiary: 'Track a child’s food, for example a diet the doctor recommended',
    budgetTitle: 'Budget', budgetSet: 'Set a weekly budget', budgetLeft: (m) => `${m} left this week`, budgetOver: (m) => `${m} over budget`,
    spentThisWeek: 'What I spent this week', saveBtn: 'Save', saved: 'Saved', last8Weeks: 'Spending in the last 8 weeks',
    monthLine: (spent, budget) => `This month: ${spent} of ${budget}`, avgLine: (m) => `Average week: ${m}`,
    cheaperTitle: 'Cheaper swaps', swapBtn: 'Swap', swapped: 'Swapped',
    orderOnline: 'Order online', otherProducts: 'Other products',
    orderHint: 'Send your list to a delivery service and finish the order in their app.', orderWith: 'Order with',
    noPartners: (c) => `No delivery partner is set up for ${c} yet. Copy the list and paste it into your shop’s app or website.`,
    sendWhole: (p) => `Send the whole list to ${p}`, copyForApp: 'Copy the list for any shop app', itemByItem: (p) => `Item by item at ${p}`,
    findBtn: 'Find', wholeUnavailable: 'Sending the whole list isn’t available yet. Use the item links below.',
    orderNote: 'Prepcart may earn a small commission from these shops, at no extra cost to you.',
    copyFailed: 'Couldn’t copy. Select the text and copy it by hand.',
    journalTitle: 'Food journal', diaryPrivateNote: 'Only on this phone, never shared with your household. Add a PIN below to keep it private on a shared phone.',
    childDiaryNote: 'For the parents: everyone who uses this phone can see a child’s journal.',
    diaryLocked: (n) => `${n}’s journal is locked.`, pinLabel: 'PIN', unlockBtn: 'Unlock', wrongPin: 'Wrong PIN',
    pinSet: 'Lock with a PIN (optional)', pinChange: 'Change or remove the PIN (leave empty to remove)', pinHint: '4 to 8 digits',
    pinSaved: 'PIN saved', pinRemoved: 'PIN removed', today: 'Today', prevDay: 'Previous day', nextDay: 'Next day',
    goal_kcal: (v, tg) => `Calories: ${v} of ${tg}`, goal_protein: (v, tg) => `Protein: ${v} of ${tg} g`,
    goal_veg: (v, tg) => `Vegetables: ${v} of ${tg} portions`, goal_fruit: (v, tg) => `Fruit: ${v} of ${tg} portions`,
    goal_water: (v, tg) => `Water: ${v} of ${tg} glasses`, goal_no_sugary_drinks: 'No sugary drinks',
    streak: (n) => `${n} ${n === 1 ? 'day' : 'days'} in a row with every goal met`,
    addFood: 'Add what was eaten', photoBtn: 'Photo', waterBtn: 'Glass of water', sugaryBtn: 'Sugary drink', otherFood: 'Something else',
    whatWasIt: 'What was it?', howMuch: 'How much?', size_snack: 'Snack', size_small: 'Small plate', size_medium: 'Medium plate', size_large: 'Large plate',
    kcalOptional: 'Calories, if you know them', addBtn: 'Add', cancelBtn: 'Cancel', eatenTitle: 'Eaten', nothingYet: 'Nothing added yet.',
    goalsTitle: 'Goals', doctorNotes: 'Doctor’s or dietitian’s advice', goalTypeLabel: 'Goal',
    goalType_kcal: 'Calories a day', goalType_protein: 'Protein a day (g)', goalType_veg: 'Vegetable portions a day',
    goalType_fruit: 'Fruit portions a day', goalType_water: 'Glasses of water a day', goalType_no_sugary_drinks: 'No sugary drinks',
    goalType_custom: 'My own goal', customGoalHint: 'For example: no sweets after 6 pm', photoFailed: 'That photo couldn’t be opened.',
    tipsTitle: 'Saving tips', tipsDelivery: 'Order online and compare delivery offers:',
    tip_loyalty: (shop) => `Get ${shop}’s app or loyalty card: members’ prices and digital coupons often take 5–10 % off the bill.`,
    tip_ownBrand: 'Choose the shop’s own brand for basics (rice, pasta, tins, frozen veg): usually the same quality for less.',
    tip_unitPrice: 'Compare the price per kg or litre on the shelf label, not the pack price.',
    tip_frozen: 'Frozen vegetables and berries cost less, keep for months and are just as nutritious.',
    tip_seasonal: 'Fruit and vegetables in season are cheaper and taste better.',
    tip_batch: 'Cook a dish once and eat it on two days: less waste, less time, fewer packs to buy.',
    tip_leftovers: 'Freeze leftovers in portions for busy days instead of buying ready meals.',
    tip_deliveryOffers: 'Delivery services often give a discount on the first order or a free-delivery pass: compare them before you order.',
    tip_clickCollect: 'Click and collect is often free and avoids impulse buys in the shop.',
    tip_pantryFirst: 'Check your cupboard before you go: the pantry list below shows what you might already have.',
    sharingTitle: 'Household sharing', sharingNeedsSetup: 'Household sharing works once accounts are switched on in this app.',
    sharingWhy: 'Each adult can use Prepcart on their own phone and set their own preferences; the plan and the shopping list add everyone up. Free.',
    signUpToShare: 'Create a free account to share', inviteAdult: 'Invite another adult',
    sharedWith: (n) => `Shared by ${n} ${n === 1 ? 'adult' : 'adults'}`, syncedAt: (tm) => `synced ${tm}`, syncNow: 'Sync now', synced: 'Synced',
    stopSharing: 'Stop sharing', leaveHousehold: 'Leave this household', inviteLinkLabel: 'Invite link (valid for 7 days)',
    inviteHint: 'Send it only to people in your household: anyone with the link can join.', inviteMessage: 'Join our household on Prepcart',
    sharingPrivacy: 'Shared plans are encrypted on your phones; the key is only in the invite link, so not even Prepcart can read them. Food journals are never shared.',
    editsOwn: (n) => `${n} sets their own preferences on their phone.`, householdEnded: 'You’re no longer in the shared household.',
    joinReplace: 'Join the shared household? The plan on this phone will be replaced by the household’s plan.',
    joinFailed: 'Couldn’t join: the invite may have expired. Ask for a new link.', shareFailed: 'Couldn’t start sharing. Check your connection and try again.',
    whoAreYou: 'Which person are you?', whoAreYouHint: 'You’ll set your own preferences; everyone else’s come from their phones.',
    newAdult: 'I’m not on the list yet', leaveConfirm: 'Stop sharing? This phone keeps a copy of the plan.',
    typeToSearch: 'Type to search or choose', noMatches: 'No matches', secDiet: 'Diet and health', secAvoid: 'Allergies and foods to avoid',
    secDrinks: 'Drinks', nothingToAvoid: 'Nothing to avoid', noDrinks: 'No drinks added', addDrink: 'Add a drink',
    drinksHint: 'Add the drinks this person has each day and they go on the shopping list.',
    drinkUnit_glass: 'glass', drinkUnit_cup: 'cup', drinkUnit_can: 'can', perDayShort: '/ day', cat_drinks: 'Drinks',
    need_low_salt: 'Low salt (blood pressure, heart, kidneys)', need_heart: 'Heart-healthy / low cholesterol',
    need_kidney: 'Kidney-friendly (CKD)', need_gout: 'Gout (low purine)', need_reflux: 'Reflux / heartburn (GERD)',
    need_low_fat: 'Low fat (gallbladder, pancreas)', need_high_fibre: 'High fibre', need_low_fibre: 'Low fibre / low residue',
    need_pregnancy: 'Pregnancy', need_lactose_free: 'Lactose-free', need_coeliac: 'Coeliac (gluten-free)', need_iron_rich: 'Iron-rich (anaemia)',
    needNote_kidney: 'Kidney diets differ a lot from person to person: check the list with your renal dietitian, and ask about portion sizes of protein.',
    needNote_pregnancy: 'Choose pasteurised cheese and milk, cook eggs, meat and fish through, and keep tuna to a few cans a week.',
    needNote_lactose_free: 'You can also buy lactose-free milk, yogurt and cream and keep the dishes that use them.',
    needNote_reflux: 'Onion, garlic, coffee and chocolate bother some people too: add them to the foods to avoid if they do.',
    adults: 'Adults', children: 'Children', adultN: (n) => `Adult ${n}`, childN: (n) => `Child ${n}`,
    fewer: (what) => `Fewer: ${what}`, more: (what) => `More: ${what}`, optional: 'Optional',
    childPortion: 'Portion size', portion_small: 'Small', portion_medium: 'Medium', portion_large: 'Large',
    childPortionHint: 'Small for toddlers, medium for school-age children, large for teenagers.',
    adultDetails: 'Details for portion sizes (optional)', adultDetailsHint: 'Leave empty to use typical adult portions.',
    notSay: 'Prefer not to say', need_mild: 'Mild (not spicy)',
    localDishes: (country) => `Traditional dishes from ${country}`, localShort: (country) => `${country}`,
    compareShops: 'Compare prices at other shops (optional)',
    compareShopsHint: 'The shopping list then shows each product at the shop where it is the best value.',
    listBest: 'Best prices', listOne: (shop) => `Only ${shop}`, shoppingPlan: 'Shopping list by shop',
    planSaves: (amount, shop) => `Saves ${amount} compared with buying everything at ${shop}.`,
    planSame: (shop) => `Everything is best value at ${shop} this week.`,
    itemsCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`, nothingHere: 'Nothing to buy here this week.',
    planNote: 'Each product goes to the shop with the best price, a little in favour of better Nutri-Scores; a shop is only added if it saves at least 3 %.',
    cuisine_french: 'French & Belgian', cuisine_iberian: 'Spanish & Portuguese', cuisine_central_european: 'German, Austrian & Swiss',
    cuisine_nordic: 'Nordic',
    mealsTitle: 'Meals at home', mealsHint: 'Only these meals are planned and shopped for. Leave out meals eaten at nursery, school or work, meals out, and fasting days.',
    mealsSame: 'Same every day', mealsSplit: 'Weekdays / weekend', mealsEach: 'Day by day',
    everyDay: 'Every day', monFri: 'Monday to Friday', satSun: 'Saturday and Sunday',
    mealCount: 'Meals', mealsNone: 'None', snacks: 'Snacks',
    mealsSummary: (n, snacks) => `${n} ${n === 1 ? 'meal' : 'meals'}${snacks ? ' + snacks' : ''}`,
    noMealsDay: 'No meals at home (eating out or fasting)',
    homeMealsOnly: (kcal) => `Meals at home only. Full day: ${kcal} kcal.`,
    displayTitle: 'Display and reading', displaySummary: 'Dark mode, larger text, dyslexia-friendly font', textSize: 'Text size', text_normal: 'Normal', text_large: 'Large', text_xl: 'Extra large',
    dyslexiaMode: 'Dyslexia-friendly', dyslexiaHint: 'A font made for dyslexia, with more space between letters, words and lines.',
    moreReading: 'More reading options', readingFont: 'Font', font_standard: 'Standard', font_dyslexic: 'For dyslexia (OpenDyslexic)', font_legible: 'Atkinson Hyperlegible (low vision)',
    spacing: 'Letter and line spacing', spacing_normal: 'Normal', spacing_wide: 'Wide',
    contrast: 'High contrast', motion: 'Reduce motion', on: 'On', off: 'Off',
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
