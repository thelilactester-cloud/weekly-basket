/*
 * Premium food diary (no DOM): what each person ate, their daily totals and their goals.
 *
 * state.journal[memberId] = {
 *   days: { 'YYYY-MM-DD': [{ id, at, slot, kind: 'planned' | 'photo' | 'custom', recipeId?, servings?, name?,
 *           kcal, protein, carbs, fat, photo?: photoId }] },
 *   goals: [{ id, type, target, text? }],
 *   checks: { 'YYYY-MM-DD': { goalId: true } },   // goals ticked by hand (type 'custom')
 *   pin?: { salt, hash },                          // adults only: keeps the diary out of sight on a shared phone
 * }
 * Adults' diaries never leave their device (they are not part of household sharing). Children's diaries are
 * for the parents, so any adult in the household can open them; there is no PIN on a child's diary.
 * Photos are stored separately (MP.secureStore.savePhoto) so the main data stays small.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  MP.GOAL_TYPES = ['kcal', 'protein', 'veg', 'fruit', 'water', 'no_sugary_drinks', 'custom'];
  const VEG = new Set(['tomato', 'cucumber', 'bell_pepper', 'onion', 'carrot', 'zucchini', 'eggplant', 'broccoli', 'spinach',
    'lettuce', 'mushrooms', 'cabbage', 'kale', 'green_peas', 'sweet_corn', 'butternut', 'beetroot', 'sweet_potato']);
  const FRUIT = new Set(['banana', 'apple', 'berries', 'blueberries', 'lemon', 'lime', 'avocado', 'plantain']);

  MP.dayKey = function (ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  MP.journalOf = function (state, memberId) {
    state.journal = state.journal || {};
    return (state.journal[memberId] = state.journal[memberId] || { days: {}, goals: [], checks: {} });
  };

  // Default goals from the person's targets: calories and protein, plus vegetables and water.
  MP.defaultGoals = function (member) {
    const t = MP.memberTargets(member);
    return [
      { id: 'kcal', type: 'kcal', target: t.kcal },
      { id: 'protein', type: 'protein', target: t.protein },
      { id: 'veg', type: 'veg', target: MP.isChild(member) ? 3 : 5 },
      { id: 'water', type: 'water', target: MP.isChild(member) ? 5 : 8 },
    ];
  };

  // Portions of vegetables / fruit in one serving of a recipe (80 g counts as one portion).
  MP.portionsIn = function (recipe, servings) {
    let veg = 0;
    let fruit = 0;
    for (const [id, qty] of recipe.ing) {
      const grams = qty * (MP.INGREDIENTS[id].g || 1);
      if (VEG.has(id)) veg += grams / 80;
      if (FRUIT.has(id)) fruit += grams / 80;
    }
    return { veg: Math.round(veg * servings * 10) / 10, fruit: Math.round(fruit * servings * 10) / 10 };
  };

  // A diary entry for a planned dish (portion as on the week plan, or a number of servings).
  MP.plannedEntry = function (recipe, servings, slot) {
    const n = MP.recipeNutrition(recipe);
    const p = MP.portionsIn(recipe, servings);
    return {
      kind: 'planned', recipeId: recipe.id, servings, slot,
      kcal: Math.round(n.kcal * servings), protein: Math.round(n.protein * servings),
      carbs: Math.round(n.carbs * servings), fat: Math.round(n.fat * servings), veg: p.veg, fruit: p.fruit,
    };
  };

  // A quick size for a photo or something not on the plan.
  MP.PLATE_KCAL = { snack: 150, small: 350, medium: 550, large: 800 };

  MP.addEntry = function (state, memberId, entry, ts) {
    const J = MP.journalOf(state, memberId);
    const day = MP.dayKey(ts);
    const e = Object.assign({ id: MP.uid(), at: ts || Date.now(), kcal: 0, protein: 0, carbs: 0, fat: 0, veg: 0, fruit: 0 }, entry);
    (J.days[day] = J.days[day] || []).push(e);
    return e;
  };

  MP.removeEntry = function (state, memberId, day, id) {
    const J = MP.journalOf(state, memberId);
    J.days[day] = (J.days[day] || []).filter((e) => e.id !== id);
    if (!J.days[day].length) delete J.days[day];
  };

  // Totals for a day, and how each goal is going: [{ goal, value, done }]
  MP.dayTotals = function (state, memberId, day) {
    const J = MP.journalOf(state, memberId);
    const list = J.days[day] || [];
    const sum = (k) => Math.round(list.reduce((s, e) => s + (Number(e[k]) || 0), 0) * 10) / 10;
    const totals = { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), veg: sum('veg'),
      fruit: sum('fruit'), water: sum('water'), sugary: list.filter((e) => e.sugary).length, entries: list.length };
    const checks = (J.checks && J.checks[day]) || {};
    const goals = (J.goals && J.goals.length ? J.goals : []).map((goal) => {
      let value = null;
      let done = false;
      if (goal.type === 'kcal') { value = totals.kcal; done = list.length > 0 && Math.abs(value - goal.target) <= goal.target * 0.1; }
      else if (goal.type === 'protein') { value = totals.protein; done = value >= goal.target; }
      else if (goal.type === 'veg') { value = totals.veg; done = value >= goal.target; }
      else if (goal.type === 'fruit') { value = totals.fruit; done = value >= goal.target; }
      else if (goal.type === 'water') { value = totals.water; done = value >= goal.target; }
      else if (goal.type === 'no_sugary_drinks') { value = totals.sugary; done = list.length > 0 && value === 0; }
      else done = !!checks[goal.id];
      return { goal, value, done };
    });
    return { totals, goals };
  };

  // Days in a row (up to today) on which every goal was met.
  MP.goalStreak = function (state, memberId, now) {
    let n = 0;
    const d = new Date(now || Date.now());
    for (let i = 0; i < 366; i++) {
      const r = MP.dayTotals(state, memberId, MP.dayKey(d.getTime()));
      if (!r.goals.length || !r.goals.every((x) => x.done)) break;
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  };

  // What the week plan has for this person today: [{ slot, recipe, servings }]
  MP.plannedToday = function (state, member, now) {
    const di = (new Date(now || Date.now()).getDay() + 6) % 7;
    const day = MP.schedule(state)[di] || {};
    const out = [];
    for (const [slot, entries] of Object.entries(day)) {
      for (const e of entries) {
        if (e.eaters.includes(member.id)) out.push({ slot, recipe: e.recipe, servings: MP.portionFor(e.recipe, member, slot, (state.prefs || {}).mealsPerDay) });
      }
    }
    return out;
  };

  // ---------- optional PIN (shared phones) ----------
  async function pbkdf2(pin, salt) {
    const c = g.crypto.subtle;
    const key = await c.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
    const bits = await c.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }
  MP.setDiaryPin = async function (state, memberId, pin) {
    const J = MP.journalOf(state, memberId);
    if (!pin) { delete J.pin; return; }
    const salt = g.crypto.getRandomValues(new Uint8Array(16));
    J.pin = { salt: btoa(String.fromCharCode(...salt)), hash: await pbkdf2(pin, salt) };
  };
  MP.checkDiaryPin = async function (state, memberId, pin) {
    const J = MP.journalOf(state, memberId);
    if (!J.pin) return true;
    const salt = Uint8Array.from(atob(J.pin.salt), (c) => c.charCodeAt(0));
    return (await pbkdf2(pin, salt)) === J.pin.hash;
  };
})(typeof window !== 'undefined' ? window : globalThis);
