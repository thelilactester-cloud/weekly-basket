/*
 * Premium budget checker (no DOM): what this week's plan will cost against the weekly budget, what was really
 * spent in past weeks (the user types it in after shopping), and cheaper swaps when the plan is over budget.
 * state.spend = [{ week: 'YYYY-MM-DD' (Monday), amount, at }]
 */
(function (g) {
  const MP = (g.MP = g.MP || {});
  const DAY = 864e5;

  // Monday of the week a date is in, as YYYY-MM-DD (local time).
  MP.weekKey = function (ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Records what was really spent for a week (replaces an earlier amount for the same week).
  MP.logSpend = function (state, amount, ts) {
    const week = MP.weekKey(ts);
    state.spend = (state.spend || []).filter((x) => x.week !== week);
    if (amount > 0) state.spend.push({ week, amount: Math.round(amount * 100) / 100, at: ts || Date.now() });
    state.spend.sort((a, b) => a.week.localeCompare(b.week));
    return state.spend;
  };

  // { budget, estimate, left, over, spent (this week, if logged), weeks: [{ week, spent }] (last 8),
  //   month: { spent, budget }, average }
  MP.budgetSummary = function (state, estimate, now) {
    now = now || Date.now();
    const budget = Number(state.prefs && state.prefs.weeklyBudget) || 0;
    const spend = state.spend || [];
    const thisWeek = MP.weekKey(now);
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const week = MP.weekKey(now - i * 7 * DAY);
      const e = spend.find((x) => x.week === week);
      weeks.push({ week, spent: e ? e.amount : null });
    }
    const month = new Date(now).toISOString().slice(0, 7);
    const monthSpent = spend.filter((x) => x.week.slice(0, 7) === month).reduce((s, x) => s + x.amount, 0);
    const logged = weeks.filter((w) => w.spent != null);
    const cur = spend.find((x) => x.week === thisWeek);
    return {
      budget, estimate,
      left: budget ? budget - estimate : null,
      over: budget > 0 && estimate > budget,
      spent: cur ? cur.amount : null,
      weeks,
      month: { spent: monthSpent, budget: budget ? (budget * 52) / 12 : 0 },
      average: logged.length ? logged.reduce((s, w) => s + w.spent, 0) / logged.length : null,
    };
  };

  // Estimated cost of cooking one week item at the user's shop (all servings, all days).
  MP.itemCost = function (state, item) {
    const { country, region, store } = MP.storeOf(state);
    const r = MP.RECIPE_BY_ID[item.recipeId];
    const sv = MP.itemServings(state, item);
    return MP.recipeCost(r) * sv.all * country.priceFactor * (region ? region.priceLevel : 1) * store.priceIndex;
  };

  // Cheaper dishes for the most expensive items of the week, for the same people and meal.
  // → [{ item, recipe, saving }] best savings first.
  MP.cheaperSwaps = function (state, limit) {
    const members = MP.activeMembers(state);
    const used = new Set((state.week.items || []).map((it) => it.recipeId));
    const out = [];
    for (const it of state.week.items || []) {
      const eaters = members.filter((m) => it.eaters.includes(m.id));
      const now = MP.itemCost(state, it);
      let best = null;
      for (const r of MP.RECIPES) {
        if (used.has(r.id) || !r.meal.includes(MP.mealTypeForSlot(it.slot))) continue;
        if (!eaters.every((m) => MP.recipeFitsMember(r, m))) continue;
        const cost = MP.itemCost(state, Object.assign({}, it, { recipeId: r.id }));
        if (cost < now * 0.8 && (!best || cost < best.cost)) best = { recipe: r, cost };
      }
      if (best) out.push({ item: it, recipe: best.recipe, saving: now - best.cost });
    }
    return out.sort((a, b) => b.saving - a.saving).slice(0, limit || 3);
  };
})(typeof window !== 'undefined' ? window : globalThis);
