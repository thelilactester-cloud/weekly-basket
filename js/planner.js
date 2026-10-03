/*
 * Planning logic (no DOM): calorie targets, per-person diet filtering, recipe suggestions,
 * the week the user puts together, and the shopping list. Loaded in the browser and in the Node tests.
 *
 * The week is a list of items the user picked: { key, recipeId, slot, days, eaters: [memberIds] }.
 * "Cook chana masala for dinner on 2 days, for Ana and Ion" is one item. Members with different
 * diets simply get different items for the same meal, which is how mixed-diet families meal-prep.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  MP.DIETS = ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'mediterranean', 'high_protein'];
  // Allergies plus foods people avoid for other reasons ('beef'). No recipe uses pork or alcohol.
  MP.ALLERGENS = ['gluten', 'dairy', 'egg', 'peanuts', 'treenuts', 'fish', 'shellfish', 'soy', 'sesame', 'beef'];
  MP.ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  MP.GOALS = ['lose', 'maintain', 'gain'];
  MP.SLOT_SHARES = {
    3: { breakfast: 0.3, lunch: 0.4, dinner: 0.3 },
    4: { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 },
  };
  const KETO_MAX_CARBS = 25; // grams per serving, sides removed
  const KETO_MAX_CARB_ENERGY = 0.25; // and at most 25% of the serving's energy from carbs
  const MIN_PORTION = 0.5;
  const MAX_PORTION = 3;

  // ---------- helpers ----------
  MP.normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // Small deterministic RNG so a plan can be regenerated from its seed.
  MP.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  MP.uid = () => Math.random().toString(36).slice(2, 10);

  MP.newMember = (overrides) => Object.assign({
    id: MP.uid(), name: '', sex: 'f', age: 30, height: 165, weight: 65,
    activity: 'light', goal: 'maintain', diet: 'omnivore', allergies: [], needs: [], dislikes: '',
  }, overrides || {});

  // ---------- nutrition ----------
  MP.ingredientNutrition = function (id, qty) {
    const i = MP.INGREDIENTS[id];
    const grams = qty * i.g;
    const f = grams / 100;
    return { kcal: i.kcal * f, protein: i.protein * f, carbs: i.carbs * f, fat: i.fat * f };
  };

  MP.recipeNutrition = function (recipe, opts) {
    const dropSides = opts && opts.dropSides;
    const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const [id, qty, side] of recipe.ing) {
      if (dropSides && side) continue;
      const n = MP.ingredientNutrition(id, qty);
      tot.kcal += n.kcal; tot.protein += n.protein; tot.carbs += n.carbs; tot.fat += n.fat;
    }
    return tot;
  };

  // Estimated cost of one serving in RON (fraction of each pack actually used).
  MP.recipeCost = function (recipe) {
    let c = 0;
    for (const [id, qty] of recipe.ing) {
      const i = MP.INGREDIENTS[id];
      c += (qty / i.pack) * i.price;
    }
    return c;
  };

  function childKcal(age, sex) {
    if (age < 2) return 900;
    if (age < 4) return 1100;
    if (age < 9) return sex === 'm' ? 1450 : 1300;
    if (age < 14) return sex === 'm' ? 1900 : 1700;
    return sex === 'm' ? 2500 : 2000;
  }
  const CHILD_ACTIVITY = { sedentary: 0.9, light: 0.95, moderate: 1, active: 1.1, very_active: 1.2 };

  // A blank age counts as an adult (30) until it is filled in.
  MP.isChild = (m) => (Number(m.age) || 30) < 18;

  // Daily calorie & protein targets. Adults: Mifflin-St Jeor × activity, adjusted for the goal.
  // Children (< 18): age-based estimates, never a calorie deficit.
  MP.memberTargets = function (m) {
    const age = Number(m.age) || 30;
    const sex = m.sex === 'm' ? 'm' : 'f';
    const weight = Number(m.weight) || (age < 18 ? null : 70);
    if (age < 18) {
      const kcal = Math.round((childKcal(age, sex) * (CHILD_ACTIVITY[m.activity] || 1)) / 10) * 10;
      return { kcal, protein: Math.round((kcal * 0.15) / 4), isChild: true, bmr: null, tdee: kcal };
    }
    const height = Number(m.height) || 170;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'm' ? 5 : -161);
    const tdee = bmr * (MP.ACTIVITY[m.activity] || 1.375);
    let kcal = tdee;
    if (m.goal === 'lose') kcal = Math.max(tdee * 0.8, sex === 'm' ? 1500 : 1200);
    if (m.goal === 'gain') kcal = tdee + 300;
    let perKg = m.goal === 'maintain' ? 1.2 : 1.8;
    if (m.diet === 'high_protein') perKg += 0.4;
    return {
      kcal: Math.round(kcal / 10) * 10,
      protein: Math.round(perKg * weight),
      isChild: false,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    };
  };

  // ---------- filters ----------
  function animalsOf(recipe) {
    return new Set(recipe.ing.map(([id]) => MP.INGREDIENTS[id].animal).filter(Boolean));
  }

  MP.fitsDiet = function (recipe, diet) {
    const a = animalsOf(recipe);
    switch (diet) {
      case 'vegetarian': return !a.has('meat') && !a.has('fish');
      case 'vegan': return ['meat', 'fish', 'dairy', 'egg', 'honey'].every((x) => !a.has(x));
      case 'pescatarian': return !a.has('meat');
      case 'keto': {
        const n = MP.recipeNutrition(recipe, { dropSides: true });
        return n.carbs <= KETO_MAX_CARBS && (n.carbs * 4) / n.kcal <= KETO_MAX_CARB_ENERGY;
      }
      default: return true; // omnivore, mediterranean, high_protein are preferences, not restrictions
    }
  };

  MP.hasAllergen = function (recipe, allergies) {
    if (!allergies || !allergies.length) return false;
    return recipe.ing.some(([id]) => MP.INGREDIENTS[id].allergens.some((al) => allergies.includes(al)));
  };

  // Free-text dislikes, e.g. "mushrooms, ciuperci, fish" (matches English or Romanian names).
  MP.hasDisliked = function (recipe, dislikes) {
    const terms = String(dislikes || '').split(/[,;\n]/).map(MP.normalize).filter((t) => t.length > 2 || (t && /[^\x00-\x7f]/.test(t))); // CJK words are often 1–2 characters
    if (!terms.length) return false;
    return recipe.ing.some(([id]) => {
      const i = MP.INGREDIENTS[id];
      const translated = Object.values(MP.NAMES || {}).map((n) => (n.ing && n.ing[id]) || '').join(' ');
      const names = MP.normalize(i.name.en + ' ' + i.name.ro + ' ' + translated + ' ' + id.replace(/_/g, ' '));
      return terms.some((t) => names.includes(t));
    });
  };

  // ---------- health and lifestyle needs ----------
  // Ticked per person on top of their diet (e.g. vegetarian + low-histamine). `avoid`: ingredients left out;
  // `favour`: ingredients that make a recipe rank higher. Based on published guidance (SIGHI list for histamine,
  // Monash University for FODMAP, the MIND and DASH studies). Planning help, not a medical diet.
  const NEED_RULES = {
    low_histamine: {
      avoid: ['tomato', 'tomato_can', 'tomato_paste', 'spinach', 'eggplant', 'avocado', 'banana', 'berries', 'lemon', 'lime',
        'parmesan', 'cheddar', 'telemea', 'sour_cream', 'greek_yogurt', 'soy_sauce', 'miso', 'gochujang', 'curry_paste',
        'tuna_can', 'shrimp', 'walnuts', 'peanuts', 'peanut_butter', 'chili', 'chili_flakes', 'stock_cube', 'hummus',
        'chickpeas', 'red_beans', 'black_beans', 'olives'],
    },
    low_fodmap: {
      avoid: ['onion', 'garlic', 'bread', 'pasta', 'tortilla', 'pita', 'couscous', 'lentils', 'white_beans', 'chickpeas',
        'red_beans', 'black_beans', 'hummus', 'mushrooms', 'apple', 'honey', 'milk', 'greek_yogurt', 'sour_cream', 'cottage',
        'avocado', 'green_peas', 'sweet_corn', 'stock_cube', 'curry_paste', 'gochujang', 'berries', 'cabbage'],
    },
    mind: { // brain health: leafy greens, vegetables, berries, nuts, beans, whole grains, fish, poultry, olive oil
      avoid: ['ground_beef', 'butter', 'cheddar', 'parmesan', 'sour_cream', 'paneer'],
      favour: ['spinach', 'kale', 'lettuce', 'cabbage', 'broccoli', 'berries', 'walnuts', 'almonds', 'salmon', 'white_fish',
        'lentils', 'white_beans', 'chickpeas', 'black_beans', 'red_beans', 'oats', 'quinoa', 'olive_oil', 'chicken_breast'],
    },
    dash: { // heart and blood pressure: less salt and saturated fat, more vegetables, fruit, whole grains, low-fat dairy
      avoid: ['soy_sauce', 'miso', 'gochujang', 'stock_cube', 'olives', 'telemea', 'cheddar', 'parmesan', 'curry_paste',
        'ground_beef', 'butter', 'sour_cream', 'coconut_milk'],
      favour: ['spinach', 'kale', 'broccoli', 'carrot', 'sweet_potato', 'banana', 'berries', 'apple', 'oats', 'quinoa',
        'lentils', 'white_beans', 'greek_yogurt', 'milk', 'almonds', 'salmon'],
    },
    blood_sugar: { // steadier blood sugar: no added sugar, moderate carbohydrate per serving, more fibre and protein
      avoid: ['honey'], maxCarbs: 55,
      favour: ['lentils', 'chickpeas', 'white_beans', 'black_beans', 'red_beans', 'quinoa', 'oats', 'broccoli', 'spinach',
        'eggs', 'greek_yogurt', 'almonds', 'walnuts', 'chia'],
    },
    anti_inflammatory: {
      avoid: ['ground_beef', 'butter', 'sour_cream', 'cheddar'],
      favour: ['salmon', 'olive_oil', 'turmeric', 'ginger', 'berries', 'spinach', 'kale', 'broccoli', 'walnuts', 'almonds',
        'chia', 'lentils', 'oats', 'sweet_potato'],
    },
    halal: { avoid: [] }, // no pork or alcohol in any recipe; buy halal-certified meat
    kosher: { avoid: ['shrimp'], noMeatWithDairy: true }, // buy kosher-certified products
  };
  MP.NEEDS = Object.keys(NEED_RULES);
  MP.NEED_RULES = NEED_RULES;

  MP.fitsNeeds = function (recipe, needs) {
    if (!needs || !needs.length) return true;
    const ids = recipe.ing.map(([id]) => id);
    return needs.every((need) => {
      const rule = NEED_RULES[need];
      if (!rule) return true;
      if (ids.some((id) => rule.avoid.includes(id))) return false;
      if (rule.maxCarbs && MP.recipeNutrition(recipe).carbs > rule.maxCarbs) return false;
      if (rule.noMeatWithDairy) {
        const a = animalsOf(recipe);
        if (a.has('meat') && a.has('dairy')) return false;
      }
      return true;
    });
  };

  // How many "favour" ingredients for the given needs a recipe has (used to rank suggestions).
  MP.needsBonus = function (recipe, needs) {
    let n = 0;
    for (const need of needs || []) {
      const fav = (NEED_RULES[need] && NEED_RULES[need].favour) || [];
      n += recipe.ing.filter(([id]) => fav.includes(id)).length;
    }
    return n;
  };

  // A recipe works for a person if it fits their diet, needs, allergies and the foods they don't eat.
  MP.recipeFitsMember = (recipe, m) => MP.fitsDiet(recipe, m.diet) && MP.fitsNeeds(recipe, m.needs)
    && !MP.hasAllergen(recipe, m.allergies) && !MP.hasDisliked(recipe, m.dislikes);
  MP.recipeFitsMembers = (recipe, members) => members.every((m) => MP.recipeFitsMember(recipe, m));
  MP.whoCanEat = (recipe, members) => members.filter((m) => MP.recipeFitsMember(recipe, m));

  MP.activeMembers = function (state) {
    const ms = state.members || [];
    return state.household === 'family' ? ms : ms.slice(0, 1);
  };

  MP.slotsFor = (mealsPerDay) => Object.keys(MP.SLOT_SHARES[mealsPerDay] || MP.SLOT_SHARES[3]);
  MP.mealTypeForSlot = (slot) => (slot === 'lunch' || slot === 'dinner' ? 'main' : slot);
  MP.DAYS = 7;

  // How much of a recipe one person eats at one meal, sized to their calorie target (0.5 – 3 servings).
  MP.portionFor = function (recipe, member, slot, mealsPerDay) {
    const share = (MP.SLOT_SHARES[mealsPerDay] || MP.SLOT_SHARES[3])[slot] || 0.3;
    const kcal = MP.recipeNutrition(recipe, { dropSides: member.diet === 'keto' }).kcal || 1;
    const p = (MP.memberTargets(member).kcal * share) / kcal;
    return Math.min(MAX_PORTION, Math.max(MIN_PORTION, Math.round(p * 4) / 4));
  };

  function median(xs) {
    const s = xs.slice().sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 1;
  }
  let medianCostCache = null;
  const medianCost = () => medianCostCache || (medianCostCache = median(MP.RECIPES.map(MP.recipeCost)) || 1);

  function weekItems(state) {
    state.week = state.week || { items: [] };
    return state.week.items;
  }

  // ---------- variety ----------
  // A number in [0, 1) that is fixed for a (week seed, recipe) pair, so suggestions stay put while
  // you plan but change every new week, or when you tap "New ideas".
  MP.varietyNoise = function (seed, id) {
    let h = (seed >>> 0) ^ 0x9e3779b9;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0;
    return MP.rng(h)();
  };
  // Recipes eaten in the last weeks (newest first), to avoid suggesting the same dishes again.
  MP.recentRecipeIds = function (state) {
    const last = (state.lastWeek || []).map((it) => it.recipeId);
    const older = (state.recentWeeks || []).flat();
    return { last: new Set(last), older: new Set(older) };
  };

  // ---------- suggestions ----------
  // Recipes for one meal that at least one person in the household can eat, best first.
  // Score: fits more people > liked cuisines > favourites > diet preferences > budget > not already chosen.
  MP.suggestRecipes = function (state, slot) {
    const members = MP.activeMembers(state);
    const prefs = state.prefs || {};
    const liked = prefs.cuisines || [];
    const mealType = MP.mealTypeForSlot(slot);
    const chosen = {};
    for (const it of weekItems(state)) if (it.slot === slot) chosen[it.recipeId] = (chosen[it.recipeId] || 0) + it.days;
    const budgetWeight = { save: 1.5, balanced: 0.5, any: 0 }[prefs.budget || 'balanced'];
    const seed = (state.week && state.week.seed) || 0;
    const recent = MP.recentRecipeIds(state);
    const out = [];
    for (const r of MP.RECIPES) {
      if (!r.meal.includes(mealType)) continue;
      const eaters = MP.whoCanEat(r, members);
      if (!eaters.length) continue;
      let score = (eaters.length / members.length) * 3;
      if (liked.length) score += liked.includes(r.cuisine) ? 2 : r.cuisine === 'international' ? 0.5 : -1;
      if ((state.favorites || []).includes(r.id)) score += 1;
      if (r.time > (prefs.maxTime || 999)) score -= 2;
      if (members.some((m) => m.diet === 'mediterranean') && (r.cuisine === 'mediterranean' || r.tags.includes('mediterranean'))) score += 0.8;
      const needBonus = members.reduce((sum, m) => sum + MP.needsBonus(r, m.needs), 0);
      if (needBonus) score += Math.min(1.5, needBonus * 0.3);
      if (members.some((m) => m.diet === 'high_protein')) {
        const n = MP.recipeNutrition(r);
        if ((n.protein * 4) / n.kcal >= 0.3) score += 0.8;
      }
      score -= (MP.recipeCost(r) / medianCost() - 1) * budgetWeight;
      score -= (chosen[r.id] || 0) * 0.7;
      // Variety: a little week-specific shuffle, and dishes from the last weeks move down.
      score += MP.varietyNoise(seed, r.id) * 1.2;
      if (!chosen[r.id]) score -= recent.last.has(r.id) ? 1 : recent.older.has(r.id) ? 0.5 : 0;
      out.push({ recipe: r, eaters: eaters.map((m) => m.id), score });
    }
    return out.sort((a, b) => b.score - a.score);
  };

  // ---------- the week ----------
  // Days each person already has covered, per meal: { dinner: { memberId: 4 } }
  MP.coverage = function (state) {
    const members = MP.activeMembers(state);
    const cov = {};
    for (const slot of MP.slotsFor((state.prefs || {}).mealsPerDay)) {
      cov[slot] = {};
      for (const m of members) cov[slot][m.id] = 0;
    }
    for (const it of weekItems(state)) {
      if (!cov[it.slot]) continue;
      for (const id of it.eaters) if (id in cov[it.slot]) cov[it.slot][id] += it.days;
    }
    return cov;
  };

  // Add a recipe to the week. It goes to the people who can eat it and still need that meal
  // (or to everyone who can eat it, if they are all covered already).
  MP.addToWeek = function (state, recipeId, slot, days) {
    const r = MP.RECIPE_BY_ID[recipeId];
    const members = MP.activeMembers(state);
    const can = MP.whoCanEat(r, members);
    const cov = MP.coverage(state)[slot] || {};
    const needy = can.filter((m) => (cov[m.id] || 0) < MP.DAYS);
    const eaters = (needy.length ? needy : can).map((m) => m.id);
    const minNeed = needy.length ? Math.min(...needy.map((m) => MP.DAYS - (cov[m.id] || 0))) : 1;
    const item = {
      key: MP.uid(), recipeId, slot, eaters,
      days: Math.max(1, Math.min(days || (r.tags.includes('batch') ? 2 : 1), minNeed)),
    };
    weekItems(state).push(item);
    return item;
  };

  MP.removeFromWeek = function (state, key) {
    state.week.items = weekItems(state).filter((it) => it.key !== key);
  };

  // Fill every gap in the week automatically with the best suggestions.
  // People with different diets get their own dishes where no shared one fits.
  MP.autoFillWeek = function (state, seed) {
    const rng = MP.rng(seed == null ? Math.floor(Math.random() * 1e9) : seed);
    const members = MP.activeMembers(state);
    for (const slot of MP.slotsFor((state.prefs || {}).mealsPerDay)) {
      for (let guard = 0; guard < 60; guard++) {
        const cov = MP.coverage(state)[slot];
        const needy = members.filter((m) => cov[m.id] < MP.DAYS);
        if (!needy.length) break;
        const needyIds = new Set(needy.map((m) => m.id));
        let best = null;
        let bestScore = -Infinity;
        for (const sug of MP.suggestRecipes(state, slot)) {
          const helps = sug.eaters.filter((id) => needyIds.has(id)).length;
          if (!helps) continue;
          const sc = sug.score + helps * 2 + rng() * 1.5;
          if (sc > bestScore) { best = sug; bestScore = sc; }
        }
        if (!best) break; // nobody left can eat anything for this meal
        const eaters = best.eaters.filter((id) => needyIds.has(id));
        const minNeed = Math.min(...eaters.map((id) => MP.DAYS - cov[id]));
        const want = best.recipe.tags.includes('batch') ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
        const days = Math.min(want, minNeed);
        const same = weekItems(state).find((it) => it.slot === slot && it.recipeId === best.recipe.id &&
          it.eaters.length === eaters.length && it.eaters.every((id) => eaters.includes(id)));
        if (same) same.days += days; // same dish for the same people: one item, more days
        else weekItems(state).push({ key: MP.uid(), recipeId: best.recipe.id, slot, eaters, days });
      }
    }
    return state.week;
  };

  // Day-by-day view of the week: for each person and meal, their dishes fill the days in order.
  // Returns [ { breakfast: [{ item, recipe, eaters: [memberIds] }], ... } × 7 ]
  MP.schedule = function (state) {
    const members = MP.activeMembers(state);
    const slots = MP.slotsFor((state.prefs || {}).mealsPerDay);
    const days = [...Array(MP.DAYS)].map(() => Object.fromEntries(slots.map((sl) => [sl, []])));
    for (const slot of slots) {
      for (const m of members) {
        let d = 0;
        for (const it of weekItems(state)) {
          if (it.slot !== slot || !it.eaters.includes(m.id)) continue;
          for (let k = 0; k < it.days && d < MP.DAYS; k++, d++) {
            let entry = days[d][slot].find((e) => e.item.key === it.key);
            if (!entry) days[d][slot].push((entry = { item: it, recipe: MP.RECIPE_BY_ID[it.recipeId], eaters: [] }));
            entry.eaters.push(m.id);
          }
        }
      }
    }
    return days;
  };

  // What one person eats on one day of the schedule.
  MP.memberDayNutrition = function (state, day, member) {
    const mpd = (state.prefs || {}).mealsPerDay;
    const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const [slot, entries] of Object.entries(day)) {
      for (const e of entries) {
        if (!e.eaters.includes(member.id)) continue;
        const p = MP.portionFor(e.recipe, member, slot, mpd);
        const n = MP.recipeNutrition(e.recipe, { dropSides: member.diet === 'keto' });
        for (const k in tot) tot[k] += n[k] * p;
      }
    }
    return tot;
  };

  // Servings to cook for one week item: `all` for the main dish, `withSides` for carb sides
  // (low-carb / keto eaters skip those).
  MP.itemServings = function (state, item) {
    const byId = Object.fromEntries(MP.activeMembers(state).map((m) => [m.id, m]));
    const r = MP.RECIPE_BY_ID[item.recipeId];
    const mpd = (state.prefs || {}).mealsPerDay;
    let all = 0;
    let withSides = 0;
    for (const id of item.eaters) {
      const m = byId[id];
      if (!m) continue;
      const p = MP.portionFor(r, m, item.slot, mpd) * item.days;
      all += p;
      if (m.diet !== 'keto') withSides += p;
    }
    return { all, withSides };
  };

  // ---------- shopping list ----------
  // The shop the user picked, with its country and region. 'custom' = a shop that is not listed.
  MP.storeOf = function (state) {
    const countryCode = MP.COUNTRIES[state.country] ? state.country : 'RO';
    const country = MP.COUNTRIES[countryCode];
    const region = (country.regions && country.regions[state.region]) || null;
    let store;
    if (state.store === MP.CUSTOM_STORE_ID) {
      store = { id: MP.CUSTOM_STORE_ID, name: (state.customStore || '').trim() || '?', priceIndex: 1, custom: true };
    } else {
      const list = MP.storesFor(countryCode, state.region);
      store = list.find((x) => x.id === state.store) || list[0];
    }
    return { countryCode, country, region, store };
  };

  // Key under which product choices and prices are remembered (per country + shop).
  MP.storeKey = function (state) {
    const { countryCode, store } = MP.storeOf(state);
    return store.custom ? `${countryCode}:custom:${MP.slug(store.name)}` : `${countryCode}:${store.id}`;
  };

  // Estimated price of one base unit (1 g / 1 ml / 1 piece) of an ingredient at this shop.
  MP.estimatedUnitPrice = function (state, id) {
    const { country, region, store } = MP.storeOf(state);
    const i = MP.INGREDIENTS[id];
    return (i.price / i.pack) * country.priceFactor * (region ? region.priceLevel : 1) * store.priceIndex;
  };

  // The product the user chose for an ingredient at this shop: { name, brand, pack, price, priceSource, ... }
  MP.chosenProduct = function (state, id) {
    const byStore = (state.products || {})[MP.storeKey(state)];
    return (byStore && byStore[id]) || null;
  };

  MP.buildShoppingList = function (state) {
    const { country, store } = MP.storeOf(state);
    const need = {};
    for (const it of weekItems(state)) {
      const r = MP.RECIPE_BY_ID[it.recipeId];
      if (!r) continue;
      const sv = MP.itemServings(state, it);
      for (const [id, qty, side] of r.ing) {
        const servings = side ? sv.withSides : sv.all;
        if (!servings) continue;
        const e = (need[id] = need[id] || { qty: 0, recipes: new Set() });
        e.qty += qty * servings;
        e.recipes.add(r.id);
      }
    }
    const items = Object.keys(need).map((id) => {
      const i = MP.INGREDIENTS[id];
      const chosen = MP.chosenProduct(state, id);
      const pack = chosen && chosen.pack > 0 ? chosen.pack : i.pack;
      const packs = Math.max(1, Math.ceil(need[id].qty / pack - 1e-9));
      const hasPrice = chosen && chosen.price > 0 && chosen.pack > 0;
      const packPrice = hasPrice ? chosen.price : MP.estimatedUnitPrice(state, id) * pack;
      return {
        id, cat: i.cat, unit: i.unit, staple: i.staple,
        qty: need[id].qty, pack, packs,
        cost: packs * packPrice,
        priceSource: hasPrice ? chosen.priceSource || 'mine' : 'estimate',
        product: chosen,
        recipes: [...need[id].recipes],
      };
    });
    items.sort((a, b) => MP.CATEGORIES.indexOf(a.cat) - MP.CATEGORIES.indexOf(b.cat) || a.id.localeCompare(b.id));
    const groceries = items.filter((x) => !x.staple);
    const extras = (state.extras || []).map((x) => Object.assign({}, x, { cost: (Number(x.price) || 0) * (x.count || 1) }));
    return {
      currency: country.currency,
      store: store.name,
      groceries,
      extras,
      pantry: items.filter((x) => x.staple),
      total: groceries.reduce((s, x) => s + x.cost, 0) + extras.reduce((s, x) => s + x.cost, 0),
    };
  };

  // ---------- formatting ----------
  // BCP 47 locale from the UI language and the country, e.g. es + US → es-US.
  MP.locale = (lang, country) => {
    try { return Intl.getCanonicalLocales(`${lang}-${country || ''}`.replace(/-$/, ''))[0]; } catch (e) { return lang || 'en'; }
  };

  MP.formatQty = function (qty, unit, lang, units, country) {
    const loc = MP.locale(lang, country);
    const nf = (v, d) => v.toLocaleString(loc, { maximumFractionDigits: d });
    if (units === 'imperial' && unit === 'g') {
      const oz = qty / 28.3495;
      return oz >= 16 ? nf(oz / 16, 2) + ' lb' : nf(Math.ceil(oz * 4) / 4, 2) + ' oz';
    }
    if (units === 'imperial' && unit === 'ml') {
      const floz = qty / 29.5735;
      return floz >= 32 ? nf(floz / 32, 2) + ' qt' : nf(Math.ceil(floz), 0) + ' fl oz';
    }
    if (unit === 'g') return qty >= 1000 ? nf(qty / 1000, 2) + ' kg' : nf(Math.ceil(qty / 5) * 5, 0) + ' g';
    if (unit === 'ml') return qty >= 1000 ? nf(qty / 1000, 2) + ' l' : nf(Math.ceil(qty / 10) * 10, 0) + ' ml';
    const pcs = (MP.STRINGS && MP.STRINGS[lang] && MP.STRINGS[lang].pcs) || 'pcs';
    return nf(Math.ceil(qty * 2) / 2, 1) + ' ' + pcs;
  };

  MP.formatMoney = function (amount, currency, lang, country) {
    const opts = { style: 'currency', currency };
    if (currency === 'HUF' || currency === 'JPY') { opts.minimumFractionDigits = 0; opts.maximumFractionDigits = 0; }
    return new Intl.NumberFormat(MP.locale(lang, country), opts).format(amount);
  };
})(typeof window !== 'undefined' ? window : globalThis);
