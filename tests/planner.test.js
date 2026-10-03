// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/data.js');
require('../js/regions.js');
require('../js/planner.js');
require('../js/products.js');
require('../js/billing.js');
require('../js/access.js');
require('../js/i18n.js');
const MP = globalThis.MP;
for (const [l] of MP.LANGUAGES) if (l !== 'en') require(`../js/lang/${l}.js`);

const household = (members, prefs) => ({
  country: 'RO', store: 'lidl', household: members.length > 1 ? 'family' : 'solo',
  members, prefs: Object.assign({ mealsPerDay: 3, maxTime: 999, budget: 'balanced', cuisines: [] }, prefs),
  favorites: [], week: { items: [] },
});
const weekRecipes = (st) => st.week.items.map((it) => MP.RECIPE_BY_ID[it.recipeId]);

// ───────── data ─────────

test('every recipe uses known ingredients, a known cuisine, and has steps in English and Romanian', () => {
  for (const r of MP.RECIPES) {
    for (const [id] of r.ing) assert.ok(MP.INGREDIENTS[id], `${r.id} uses unknown ingredient ${id}`);
    assert.ok(MP.CUISINES.includes(r.cuisine), `${r.id} cuisine ${r.cuisine}`);
    assert.ok(r.steps.en.length && r.steps.ro.length, r.id);
    assert.equal(r.steps.en.length, r.steps.ro.length, `${r.id} steps differ between languages`);
  }
});

test('every cuisine has recipes for main meals, and recipes never use pork or alcohol', () => {
  for (const c of MP.CUISINES) assert.ok(MP.RECIPES.some((r) => r.cuisine === c && r.meal.includes('main')), c);
  const ids = Object.keys(MP.INGREDIENTS).join(' ');
  assert.doesNotMatch(ids, /pork|bacon|ham|wine|beer|alcohol/);
});

test('adult calorie target follows Mifflin-St Jeor with goal adjustment', () => {
  const m = MP.newMember({ sex: 'f', age: 30, height: 165, weight: 65, activity: 'sedentary', goal: 'maintain' });
  const bmr = 10 * 65 + 6.25 * 165 - 5 * 30 - 161;
  assert.equal(MP.memberTargets(m).bmr, Math.round(bmr));
  assert.equal(MP.memberTargets(m).kcal, Math.round((bmr * 1.2) / 10) * 10);
  const lose = MP.memberTargets({ ...m, goal: 'lose' }).kcal;
  assert.ok(lose >= 1200 && lose < MP.memberTargets(m).kcal);
});

test('children never get a calorie deficit', () => {
  const kid = MP.newMember({ age: 9, goal: 'lose' });
  const t = MP.memberTargets(kid);
  assert.ok(t.isChild);
  assert.ok(t.kcal >= 1500);
});

// ───────── per-person diets & the week ─────────

test('whoCanEat respects each person’s diet, allergies and dislikes', () => {
  const omni = MP.newMember({ name: 'A' });
  const vegan = MP.newMember({ name: 'B', diet: 'vegan' });
  const noFish = MP.newMember({ name: 'C', allergies: ['fish'] });
  const noBeef = MP.newMember({ name: 'D', allergies: ['beef'] });
  const noShellfish = MP.newMember({ name: 'E', allergies: ['shellfish'] });
  const names = (r) => MP.whoCanEat(MP.RECIPE_BY_ID[r], [omni, vegan, noFish, noBeef, noShellfish]).map((m) => m.name).join('');
  assert.equal(names('chana_masala'), 'ABCDE');
  assert.equal(names('salmon_broccoli'), 'ADE');
  assert.equal(names('chili_con_carne'), 'ACE');
  assert.equal(names('pad_thai'), 'ACD'); // shrimp is shellfish, not fish
});

test('suggestions put liked cuisines first and only show dishes someone can eat', () => {
  const st = household([MP.newMember({ diet: 'vegan' })], { cuisines: ['indian'] });
  const sugg = MP.suggestRecipes(st, 'dinner');
  assert.ok(sugg.length > 5);
  assert.equal(sugg[0].recipe.cuisine, 'indian');
  for (const s of sugg) assert.ok(MP.fitsDiet(s.recipe, 'vegan'), s.recipe.id);
});

test('auto-fill covers all 7 days of every meal for a mixed-diet family (meal prep)', () => {
  const mom = MP.newMember({ name: 'Mom' });
  const dad = MP.newMember({ name: 'Dad', sex: 'm', diet: 'keto' });
  const teen = MP.newMember({ name: 'Teen', age: 15, diet: 'vegan', allergies: ['gluten'] });
  const kid = MP.newMember({ name: 'Kid', age: 6, allergies: ['peanuts', 'treenuts'] });
  const st = household([mom, dad, teen, kid], { mealsPerDay: 4, cuisines: ['latin', 'indian'] });
  MP.autoFillWeek(st, 42);
  const cov = MP.coverage(st);
  for (const slot of MP.slotsFor(4)) for (const m of st.members) assert.equal(cov[slot][m.id], 7, `${slot} ${m.name}`);
  // every dish is eaten only by people it suits
  for (const it of st.week.items) {
    const r = MP.RECIPE_BY_ID[it.recipeId];
    for (const id of it.eaters) assert.ok(MP.recipeFitsMember(r, st.members.find((m) => m.id === id)), `${r.id} for ${id}`);
  }
  // the vegan teen and the keto dad can't share every meal, so some dishes are not for everyone
  assert.ok(st.week.items.some((it) => it.eaters.length < 4));
});

test('the same seed gives the same week', () => {
  const a = household([MP.newMember({ id: 'x' })]);
  const b = household([MP.newMember({ id: 'x' })]);
  MP.autoFillWeek(a, 7);
  MP.autoFillWeek(b, 7);
  assert.deepEqual(a.week.items.map((i) => [i.recipeId, i.slot, i.days]), b.week.items.map((i) => [i.recipeId, i.slot, i.days]));
});

test('adding a dish gives it to people who can eat it and still need that meal', () => {
  const omni = MP.newMember();
  const vegan = MP.newMember({ diet: 'vegan' });
  const st = household([omni, vegan]);
  const first = MP.addToWeek(st, 'chicken_traybake', 'dinner', 3);
  assert.deepEqual(first.eaters, [omni.id]);
  assert.equal(first.days, 3);
  const second = MP.addToWeek(st, 'chana_masala', 'dinner', 7);
  assert.deepEqual(second.eaters, [omni.id, vegan.id]);
  assert.equal(second.days, 4, 'capped at the 4 days the omnivore still needs');
  MP.removeFromWeek(st, first.key);
  assert.equal(st.week.items.length, 1);
});

test('the day-by-day schedule gives each person exactly one dish per meal per covered day', () => {
  const st = household([MP.newMember(), MP.newMember({ diet: 'vegetarian' })]);
  MP.autoFillWeek(st, 3);
  const days = MP.schedule(st);
  assert.equal(days.length, 7);
  for (const d of days) for (const slot of MP.slotsFor(3)) {
    for (const m of st.members) assert.equal(d[slot].filter((e) => e.eaters.includes(m.id)).length, 1);
  }
});

test('portions scale with each person’s calorie target', () => {
  const big = MP.newMember({ sex: 'm', age: 30, height: 190, weight: 95, activity: 'active' });
  const small = MP.newMember({ sex: 'f', age: 6 });
  const r = MP.RECIPE_BY_ID.chana_masala;
  assert.ok(MP.portionFor(r, big, 'dinner', 3) > MP.portionFor(r, small, 'dinner', 3));
});

test('low-carb eaters skip carb sides, so fewer sides are bought', () => {
  const normal = MP.newMember();
  const keto = MP.newMember({ diet: 'keto' });
  const st = household([normal, keto]);
  const it = MP.addToWeek(st, 'spicy_chicken_stirfry', 'dinner', 2);
  const sv = MP.itemServings(st, it);
  assert.ok(sv.withSides < sv.all);
  const rice = MP.buildShoppingList(st).groceries.find((x) => x.id === 'rice');
  assert.ok(Math.abs(rice.qty - 70 * sv.withSides) < 1e-9);
});

test('free-text dislikes match names in any language, without diacritics', () => {
  const r = MP.RECIPE_BY_ID.tocanita_ciuperci;
  assert.ok(MP.hasDisliked(r, 'ciuperci'));
  assert.ok(MP.hasDisliked(r, 'Mushrooms'));
  assert.ok(MP.hasDisliked(r, 'champiñones'));
  assert.ok(MP.hasDisliked(r, '口蘑'));
  assert.ok(MP.hasDisliked(MP.RECIPE_BY_ID.mamaliga_branza, 'malai'));
  assert.ok(!MP.hasDisliked(r, 'fish'));
});

// ───────── shopping list ─────────

test('shopping list follows the chosen dishes, rounds up to whole packs and applies the shop price index', () => {
  const st = household([MP.newMember()]);
  MP.autoFillWeek(st, 5);
  const lidl = MP.buildShoppingList(st);
  assert.ok(lidl.groceries.length > 10);
  for (const x of lidl.groceries) assert.ok(x.packs * x.pack >= x.qty - 1e-6, x.id);
  assert.ok(lidl.pantry.every((x) => x.staple));
  const used = new Set(weekRecipes(st).flatMap((r) => r.ing.map(([id]) => id)));
  for (const x of [...lidl.groceries, ...lidl.pantry]) assert.ok(used.has(x.id), `${x.id} is not in any chosen dish`);
  assert.ok(MP.buildShoppingList({ ...st, store: 'mega-image' }).total > lidl.total);
  assert.equal(MP.buildShoppingList({ ...st, country: 'DE', store: 'aldi' }).currency, 'EUR');
});

test('an empty week gives an empty list', () => {
  const L = MP.buildShoppingList(household([MP.newMember()]));
  assert.equal(L.groceries.length, 0);
  assert.equal(L.total, 0);
});

test('a chosen product overrides pack size and price on the list; extras add to the total', () => {
  const st = household([MP.newMember()]);
  MP.autoFillWeek(st, 5);
  const before = MP.buildShoppingList(st);
  const item = before.groceries[0];
  st.products = { [MP.storeKey(st)]: { [item.id]: { name: 'X', pack: item.qty * 2, price: 1.23, priceSource: 'open' } } };
  st.extras = [{ key: 'a', name: 'Coffee', price: 20, count: 1 }, { key: 'b', name: 'Tea', price: null }];
  const after = MP.buildShoppingList(st);
  const changed = after.groceries.find((x) => x.id === item.id);
  assert.equal(changed.packs, 1);
  assert.equal(changed.cost, 1.23);
  assert.equal(changed.priceSource, 'open');
  assert.ok(Math.abs(after.total - (before.total - item.cost + 1.23 + 20)) < 1e-9);
  st.products[MP.storeKey(st)][item.id].pack = null; // no pack size → price can't be trusted
  assert.equal(MP.buildShoppingList(st).groceries.find((x) => x.id === item.id).priceSource, 'estimate');
});

// ───────── countries & shops ─────────

test('58 countries on every inhabited continent, each with shops, a currency and unique shop ids', () => {
  const codes = Object.keys(MP.COUNTRIES);
  assert.ok(codes.length >= 58);
  for (const c of ['NG', 'KE', 'ZA', 'EG', 'IN', 'CN', 'JP', 'KR', 'ID', 'US', 'BR', 'AR', 'AU', 'RO', 'GB']) assert.ok(codes.includes(c), c);
  for (const [code, c] of Object.entries(MP.COUNTRIES)) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.doesNotThrow(() => MP.formatMoney(10, c.currency, 'en', code));
    assert.ok(MP.STRINGS.en['region_' + (c.regionLabel || 'region')], `${code} region label`);
    for (const regionCode of ['', ...Object.keys(c.regions || {})]) {
      const stores = MP.storesFor(code, regionCode);
      assert.ok(stores.length >= 3, `${code}/${regionCode}`);
      assert.equal(new Set(stores.map((s) => s.id)).size, stores.length, `${code}/${regionCode} duplicate ids`);
    }
  }
});

test('Florida gets Publix plus national chains; a region-only chain is not offered elsewhere', () => {
  const fl = MP.storesFor('US', 'FL').map((s) => s.name);
  assert.ok(fl.includes('Publix') && fl.includes('Walmart') && fl.includes('Costco'));
  assert.ok(!MP.storesFor('US', 'TX').some((s) => s.name === 'Publix'));
  assert.ok(MP.storesFor('US', 'TX').some((s) => s.name === 'H-E-B'));
  assert.ok(MP.storesFor('NG', 'LA').some((s) => s.name === 'Ebeano'));
});

test('regional price level and shop index change the estimate', () => {
  const base = { country: 'US', store: 'walmart' };
  const ca = MP.estimatedUnitPrice({ ...base, region: 'CA' }, 'rice');
  const tx = MP.estimatedUnitPrice({ ...base, region: 'TX' }, 'rice');
  assert.ok(ca > tx);
  assert.ok(MP.estimatedUnitPrice({ ...base, region: 'TX', store: 'whole-foods' }, 'rice') > tx);
});

test('a shop the user typed in works and gets its own price memory', () => {
  const st = household([MP.newMember()]);
  Object.assign(st, { country: 'ZA', region: 'GP', store: MP.CUSTOM_STORE_ID, customStore: 'Corner Spaza' });
  assert.equal(MP.storeOf(st).store.name, 'Corner Spaza');
  assert.equal(MP.storeKey(st), 'ZA:custom:corner-spaza');
  MP.autoFillWeek(st, 1);
  assert.equal(MP.buildShoppingList(st).currency, 'ZAR');
});

test('store names are searched on Open Food Facts in Latin script, keeping accents', () => {
  assert.equal(MP.offStoreName({ name: 'Hema 盒马' }), 'Hema');
  assert.equal(MP.offStoreName({ name: 'Magnit Магнит' }), 'Magnit');
  assert.equal(MP.offStoreName({ name: 'Éxito' }), 'Éxito');
  assert.equal(MP.offStoreName({ name: 'BİM' }), 'BİM');
});

// ───────── subscription ─────────

test('Premium never costs more than Amazon Prime, and every country’s currency has a price', () => {
  for (const [cur, prime] of Object.entries(MP.PRIME_MONTHLY)) {
    assert.ok(MP.PRICES[cur], `no price for ${cur}`);
    assert.ok(MP.PRICES[cur][0] < prime, `${cur}: ${MP.PRICES[cur][0]} is not below Prime ${prime}`);
  }
  for (const [code, c] of Object.entries(MP.COUNTRIES)) assert.ok(MP.PRICES[c.currency], `${code} ${c.currency}`);
  for (const [cur, [monthly, yearly]] of Object.entries(MP.PRICES)) assert.ok(yearly < monthly * 12, `${cur} yearly should be cheaper`);
});

test('free trial lasts 7 days from the end of setup', () => {
  const start = Date.UTC(2026, 9, 1);
  const day = 864e5;
  assert.equal(MP.trialStatus({ trialStart: null }).active, true);
  assert.equal(MP.trialStatus({ trialStart: start }, start + 6.9 * day).active, true);
  const over = MP.trialStatus({ trialStart: start }, start + 7.1 * day);
  assert.equal(over.active, false);
  assert.equal(over.trialEndsAt, start + 7 * day);
  assert.ok(!MP.PREMIUM_TABS.includes('profile'), 'export/delete data must stay free');
});

// ───────── formatting & languages ─────────

test('formatQty uses kg/l above 1000 and rounds pieces up to halves', () => {
  assert.equal(MP.formatQty(1250, 'g', 'en'), '1.25 kg');
  assert.equal(MP.formatQty(1250, 'g', 'ro'), '1,25 kg');
  assert.equal(MP.formatQty(42, 'g', 'en'), '45 g');
  assert.equal(MP.formatQty(1.2, 'pcs', 'en'), '1.5 pcs');
});

test('imperial units and local number formats', () => {
  assert.equal(MP.formatQty(907.2, 'g', 'en', 'imperial', 'US'), '2 lb');
  assert.equal(MP.formatQty(100, 'g', 'en', 'imperial', 'US'), '3.75 oz');
  assert.equal(MP.formatQty(500, 'ml', 'en', 'imperial', 'US'), '17 fl oz');
  assert.equal(MP.formatQty(3, 'pcs', 'es', 'metric', 'ES'), '3 ud.');
  assert.match(MP.formatMoney(12.5, 'USD', 'en', 'US'), /\$12\.50/);
  assert.match(MP.formatMoney(1200, 'JPY', 'en', 'JP'), /1,200/);
});

test('language detection picks the first supported browser language', () => {
  assert.equal(MP.detectLanguage(['zh-CN', 'en']), 'zh');
  assert.equal(MP.detectLanguage(['xx-XX', 'sw-KE']), 'sw');
  assert.equal(MP.detectLanguage(['xx-XX']), 'en');
});

test('27 languages, each with every UI string and every ingredient and recipe name', () => {
  assert.equal(MP.LANGUAGES.length, 27);
  assert.deepEqual(MP.RTL_LANGUAGES, ['ar']);
  const keys = Object.keys(MP.STRINGS.en);
  for (const [lang] of MP.LANGUAGES) {
    const S = MP.STRINGS[lang];
    assert.ok(S, `${lang} not loaded`);
    assert.deepEqual(keys.filter((k) => !(k in S)), [], `${lang} missing UI strings`);
    assert.deepEqual(keys.filter((k) => (typeof S[k] === 'function') !== (typeof MP.STRINGS.en[k] === 'function')), [], `${lang} function/string mismatch`);
    for (const id of Object.keys(MP.INGREDIENTS)) assert.ok(MP.ingName(id, lang), `${lang} ${id}`);
    for (const r of MP.RECIPES) assert.ok(MP.recipeName(r, lang), `${lang} ${r.id}`);
    if (MP.NAMES[lang]) {
      assert.deepEqual(Object.keys(MP.INGREDIENTS).filter((id) => !MP.NAMES[lang].ing[id]), [], `${lang} ingredient names`);
      assert.deepEqual(MP.RECIPES.filter((r) => !MP.NAMES[lang].recipe[r.id]).map((r) => r.id), [], `${lang} recipe names`);
    }
    // every function-valued string runs without throwing
    for (const k of keys) if (typeof S[k] === 'function') assert.equal(typeof S[k]('A', 'B', 'C'), 'string', `${lang}.${k}`);
  }
});

test('parseQuantity understands metric, US and piece counts', () => {
  const near = (a, b) => Math.abs(a - b) < 0.5;
  assert.deepEqual(MP.parseQuantity('500 g'), { amount: 500, unit: 'g' });
  assert.deepEqual(MP.parseQuantity('1,5 kg'), { amount: 1500, unit: 'g' });
  assert.deepEqual(MP.parseQuantity('6 x 1.5 l'), { amount: 9000, unit: 'ml' });
  assert.ok(near(MP.parseQuantity('16 oz').amount, 453.6));
  assert.ok(near(MP.parseQuantity('2 lb').amount, 907.2));
  assert.equal(MP.parseQuantity('64 fl oz').unit, 'ml');
  assert.deepEqual(MP.parseQuantity('12 ct'), { amount: 12, unit: 'pcs' });
  assert.deepEqual(MP.parseQuantity('10 ouă'), { amount: 10, unit: 'pcs' });
  assert.equal(MP.parseQuantity('family size'), null);
  assert.equal(MP.packInUnit({ amount: 12, unit: 'pcs' }, 'g'), null);
  assert.equal(MP.packInUnit({ amount: 500, unit: 'ml' }, 'g'), 500);
});

// Fake network for the Open Food Facts / Open Prices client.
function withFetch(handler, fn) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => handler(String(url)) };
  };
  return fn(calls).finally(() => { globalThis.fetch = original; });
}

test('searchProducts asks Open Food Facts for the shop and country, then falls back to the country', async () => {
  const publix = MP.storesFor('US', 'FL').find((s) => s.name === 'Publix');
  await withFetch((url) => {
    const u = new URL(url);
    if (u.searchParams.get('tag_1') === 'Publix') return { products: [] };
    return { products: [{ code: '1', product_name: 'Long grain rice', brands: 'Mahatma,Riviana', quantity: '2 lb', stores_tags: ['walmart'] }] };
  }, async (calls) => {
    const r = await MP.searchProducts({ query: 'rice unique-1', countryCode: 'US', store: publix, lang: 'en' });
    assert.equal(r.scope, 'country');
    assert.equal(r.products[0].brand, 'Mahatma');
    assert.equal(Math.round(r.products[0].parsed.amount), 907);
    const first = new URL(calls[0]);
    assert.equal(first.searchParams.get('tag_0'), 'en:united-states');
    assert.equal(first.searchParams.get('tag_1'), 'Publix');
    assert.equal(calls.length, 2);
  });
});

test('searchProducts marks products sold at the shop and caches results', async () => {
  const lidl = MP.storesFor('RO', '').find((s) => s.id === 'lidl');
  await withFetch(() => ({ products: [{ code: '2', product_name_ro: 'Iaurt grecesc', product_name: 'Greek yogurt', quantity: '400 g', product_quantity: 400, product_quantity_unit: 'g', stores_tags: ['lidl'], nutriscore_grade: 'b' }] }),
    async (calls) => {
      const q = { query: 'iaurt unique-2', countryCode: 'RO', store: lidl, lang: 'ro' };
      const r = await MP.searchProducts(q);
      assert.equal(r.scope, 'store');
      assert.equal(r.products[0].name, 'Iaurt grecesc');
      assert.ok(r.products[0].atStore);
      assert.deepEqual(r.products[0].parsed, { amount: 400, unit: 'g' });
      await MP.searchProducts(q);
      assert.equal(calls.length, 1, 'second search should come from the cache');
    });
});

test('latestPrice prefers a recent price at the same shop and currency', async () => {
  const lidl = MP.storesFor('RO', '').find((s) => s.id === 'lidl');
  await withFetch(() => ({ items: [
    { price: 3.1, currency: 'EUR', date: '2026-09-20', location: { osm_name: 'Lidl', osm_address_country_code: 'DE' } },
    { price: 9.9, currency: 'RON', date: '2026-09-18', location: { osm_name: 'Kaufland', osm_address_country_code: 'RO' } },
    { price: 8.5, currency: 'RON', date: '2026-09-10', location: { osm_name: 'Lidl Iași', osm_address_country_code: 'RO' } },
  ] }), async () => {
    const p = await MP.latestPrice({ code: 'unique-3', currency: 'RON', countryCode: 'RO', store: lidl });
    assert.equal(p.price, 8.5);
    assert.ok(p.atStore);
  });
});

// ───────── free-access codes ─────────

test('free-access codes: signed codes work, changed / expired / revoked / unknown-key codes do not', async () => {
  const { privateKey, publicKey } = await MP.access.newKeyPair('test');
  MP.ACCESS_KEYS.test = publicKey;
  const DAY = 864e5;
  const now = Date.parse('2026-10-02T12:00:00Z');

  const owner = await MP.access.sign(privateKey, { t: 'owner', n: 'owner@example.com', d: 0 });
  let res = await MP.access.check(owner.code, now);
  assert.ok(res.ok);
  assert.equal(res.data.n, 'owner@example.com');
  assert.equal(res.data.k, 'test');
  // pasted as a link, with text around it
  assert.ok((await MP.access.check(`Try this: https://x.github.io/meal-planner/#code=${owner.code} thanks`, now)).ok);

  // changing the details breaks the signature
  const [p, body, sig] = owner.code.split('.');
  const forged = JSON.parse(Buffer.from(body, 'base64url').toString());
  forged.n = 'someone-else';
  assert.equal((await MP.access.check(`${p}.${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${sig}`, now)).reason, 'invalid');
  assert.equal((await MP.access.check(owner.code.slice(0, -3), now)).reason, 'invalid');
  assert.equal((await MP.access.check('hello', now)).reason, 'invalid');

  // a code signed by a key the app doesn't know
  const other = await MP.access.newKeyPair('test');
  const fake = await MP.access.sign(other.privateKey, { t: 'owner', n: 'x', d: 0 });
  assert.equal((await MP.access.check(fake.code, now)).reason, 'invalid');

  // last day to redeem
  const aff = await MP.access.sign(privateKey, { t: 'affiliate', n: 'Maria', d: 30, e: '2026-10-31' });
  assert.ok((await MP.access.check(aff.code, Date.parse('2026-10-31T20:00:00Z'))).ok);
  assert.equal((await MP.access.check(aff.code, Date.parse('2026-11-01T01:00:00Z'))).reason, 'expired');

  // free days count from redeeming; redeemed before the end date it keeps working for its days
  const grant = await MP.access.grant({ access: { code: aff.code, redeemedAt: now } }, now + 29 * DAY);
  assert.ok(grant.active);
  assert.equal(grant.until, now + 30 * DAY);
  assert.equal((await MP.access.grant({ access: { code: aff.code, redeemedAt: now } }, now + 31 * DAY)).active, false);
  const forever = await MP.access.grant({ access: { code: owner.code, redeemedAt: now } }, now + 5000 * DAY);
  assert.ok(forever.active);
  assert.equal(forever.until, null);
  assert.equal(await MP.access.grant({}, now), null);

  // revoking a code by id
  MP.REVOKED_CODES.push(aff.data.i);
  assert.equal((await MP.access.check(aff.code, now)).reason, 'revoked');
  assert.equal(await MP.access.grant({ access: { code: aff.code, redeemedAt: now } }, now), null);
  MP.REVOKED_CODES.pop();
  delete MP.ACCESS_KEYS.test;
});
