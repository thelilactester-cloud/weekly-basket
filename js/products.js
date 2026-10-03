/*
 * Real products and prices from open, crowd-sourced databases (no API key needed):
 *
 *  - Open Food Facts (world.openfoodfacts.org): ~4 million products from 180+ countries,
 *    each tagged with the countries and the shops (Lidl, Publix, Pick n Pay...) that sell it.
 *  - Open Prices (prices.openfoodfacts.org): shelf prices people reported, with the shop and date.
 *
 * Coverage depends on what people have added: big chains in Europe and North America are
 * well covered, smaller shops less so. That's why every result falls back gracefully
 * (shop → whole country → English search term) and the user can always type a price.
 *
 * Both services ask apps to stay polite: at most ~10 searches a minute. Results are cached
 * on the device for a week (products) or three days (prices).
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  const OFF = 'https://world.openfoodfacts.org';
  const PRICES = 'https://prices.openfoodfacts.org/api/v1';
  const APP = 'WeeklyBasket';
  const DAY = 864e5;

  // ---------- quantity parsing ----------
  const TO_G = { kg: 1000, g: 1, gr: 1, grs: 1, mg: 0.001, lb: 453.592, lbs: 453.592, oz: 28.3495 };
  const TO_ML = { l: 1000, lt: 1000, ltr: 1000, litre: 1000, liter: 1000, ml: 1, cl: 10, dl: 100, 'fl oz': 29.5735, floz: 29.5735, gal: 3785.41, qt: 946.353, pt: 473.176 };
  const PIECES = ['pcs', 'pc', 'buc', 'bucati', 'ct', 'count', 'eggs', 'egg', 'oua', 'stuck', 'st', 'pieces', 'piece', 'unidades', 'uds', 'pz', 'pezzi', 'units', 'tortillas', 'wraps', '个', '枚'];

  // "6 x 1.5 l" → { amount: 9000, unit: 'ml' }, "12 oz" → { amount: 340.2, unit: 'g' }, "10 eggs" → { amount: 10, unit: 'pcs' }
  MP.parseQuantity = function (text) {
    if (!text) return null;
    let s = MP.normalize(String(text)).replace(/,(\d)/g, '.$1').replace(/fl\.?\s*oz/g, 'fl oz');
    let mult = 1;
    const m0 = s.match(/^(\d+)\s*[x×*]\s*(.*)$/);
    if (m0) { mult = Number(m0[1]); s = m0[2]; }
    const m = s.match(/(\d+(?:\.\d+)?)\s*(fl oz|[a-z一-鿿]+)?/);
    if (!m) return null;
    const n = Number(m[1]) * mult;
    const u = (m[2] || '').trim();
    if (TO_G[u]) return { amount: n * TO_G[u], unit: 'g' };
    if (TO_ML[u]) return { amount: n * TO_ML[u], unit: 'ml' };
    if (!u || PIECES.includes(u)) return { amount: n, unit: 'pcs' };
    return null;
  };

  // Pack size of a product in the ingredient's own unit (g, ml or pcs), or null if it can't be compared.
  MP.packInUnit = function (parsed, unit) {
    if (!parsed) return null;
    if (parsed.unit === unit) return parsed.amount;
    // Liquids sold by weight or solids sold by volume (yogurt in ml...): treat 1 ml ≈ 1 g.
    if ((parsed.unit === 'g' && unit === 'ml') || (parsed.unit === 'ml' && unit === 'g')) return parsed.amount;
    return null;
  };

  // ---------- small cache (localStorage when available) ----------
  const mem = new Map();
  const cache = {
    get(key) {
      let v = mem.get(key);
      if (!v) {
        try { v = JSON.parse(g.localStorage.getItem('wb-cache:' + key)); } catch (e) { v = null; }
      }
      if (v && v.exp > Date.now()) return v.data;
      return undefined;
    },
    set(key, data, ttl) {
      const v = { exp: Date.now() + ttl, data };
      mem.set(key, v);
      try { g.localStorage.setItem('wb-cache:' + key, JSON.stringify(v)); } catch (e) { cache.prune(); }
    },
    prune() {
      try {
        Object.keys(g.localStorage).filter((k) => k.startsWith('wb-cache:')).forEach((k) => g.localStorage.removeItem(k));
      } catch (e) { /* storage unavailable */ }
    },
  };
  MP.productCache = cache;

  // ---------- polite request queue: ≤ 9 searches / rolling minute ----------
  const recent = [];
  async function throttle() {
    for (;;) {
      const now = Date.now();
      while (recent.length && now - recent[0] > 60e3) recent.shift();
      if (recent.length < 9) { recent.push(now); return; }
      await new Promise((res) => setTimeout(res, 60e3 - (now - recent[0]) + 50));
    }
  }

  async function getJSON(url, throttled) {
    if (throttled) await throttle();
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // ---------- Open Food Facts ----------
  // Store name as Open Food Facts tags it: the Latin-alphabet part only
  // ("Hema 盒马" → "Hema", "Magnit Магнит" → "Magnit"; accented names like "Éxito" or "BİM" stay as they are).
  MP.offStoreName = (store) => {
    if (store.off) return store.off;
    const latin = store.name.replace(/[^\u0000-\u024F\u1E00-\u1EFF]+/g, ' ').replace(/\s+/g, ' ').trim();
    return latin || store.name;
  };
  MP.offCountryTag = function (code) {
    let name = code;
    try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code); } catch (e) { /* keep code */ }
    return 'en:' + MP.slug(name);
  };

  function mapProduct(p, lang, storeSlug) {
    const tags = p.stores_tags || [];
    const parsed = p.product_quantity && /^(g|ml)$/i.test(p.product_quantity_unit || 'g') && !/x/i.test(p.quantity || '')
      ? { amount: Number(p.product_quantity), unit: (p.product_quantity_unit || 'g').toLowerCase() }
      : MP.parseQuantity(p.quantity);
    return {
      code: p.code,
      name: p['product_name_' + lang] || p.product_name || p.generic_name || '',
      brand: String(p.brands || '').split(',')[0].trim(),
      quantity: p.quantity || '',
      parsed,
      image: p.image_small_url || p.image_front_small_url || '',
      nutriscore: /^[a-e]$/.test(p.nutriscore_grade || '') ? p.nutriscore_grade : '',
      atStore: !!storeSlug && tags.some((t) => t === storeSlug || t.startsWith(storeSlug + '-') || t.endsWith('-' + storeSlug)),
    };
  }

  function searchUrl({ query, countryCode, storeName, lang, pageSize }) {
    const q = new URLSearchParams({
      search_terms: query, search_simple: '1', action: 'process', json: '1', page_size: String(pageSize || 20),
      sort_by: 'unique_scans_n', lc: lang, app_name: APP,
      fields: ['code', 'product_name', 'product_name_' + lang, 'generic_name', 'brands', 'quantity', 'product_quantity',
        'product_quantity_unit', 'image_small_url', 'image_front_small_url', 'nutriscore_grade', 'stores_tags'].join(','),
      tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: MP.offCountryTag(countryCode),
    });
    if (storeName) { q.set('tagtype_1', 'stores'); q.set('tag_contains_1', 'contains'); q.set('tag_1', storeName); }
    return `${OFF}/cgi/search.pl?${q}`;
  }

  // Search products sold at a shop. Falls back to the whole country, then to the English term.
  // Returns { products, scope: 'store' | 'country' }.
  MP.searchProducts = async function ({ query, fallbackQuery, countryCode, store, lang }) {
    const storeName = store && !store.custom ? MP.offStoreName(store) : '';
    const storeSlug = storeName ? MP.slug(storeName) : '';
    const attempts = [];
    if (storeName) attempts.push({ query, storeName, scope: 'store' });
    attempts.push({ query, storeName: '', scope: 'country' });
    if (fallbackQuery && MP.normalize(fallbackQuery) !== MP.normalize(query)) attempts.push({ query: fallbackQuery, storeName: '', scope: 'country' });
    for (const a of attempts) {
      const url = searchUrl({ query: a.query, countryCode, storeName: a.storeName, lang });
      let data = cache.get(url);
      if (data === undefined) {
        const json = await getJSON(url, true);
        data = (json.products || []).map((p) => mapProduct(p, lang, storeSlug)).filter((p) => p.code && p.name);
        cache.set(url, data, 7 * DAY);
      }
      if (data.length) return { products: data, scope: a.scope };
    }
    return { products: [], scope: 'none' };
  };

  // ---------- Open Prices ----------
  // Most recent reported price of a product, preferring this shop, in the country's currency.
  MP.latestPrice = async function ({ code, currency, countryCode, store }) {
    const url = `${PRICES}/prices?product_code=${encodeURIComponent(code)}&order_by=-date&size=50`;
    let items = cache.get(url);
    if (items === undefined) {
      const json = await getJSON(url, false);
      items = (json.items || []).map((x) => ({
        price: Number(x.price), currency: x.currency, date: x.date, per: x.price_per || 'UNIT',
        where: (x.location && (x.location.osm_name || x.location.osm_display_name)) || '',
        country: (x.location && x.location.osm_address_country_code) || '',
      }));
      cache.set(url, items, 3 * DAY);
    }
    const storeSlug = store && !store.custom ? MP.slug(MP.offStoreName(store)) : '';
    const usable = items.filter((x) => x.price > 0 && x.currency === currency && x.per === 'UNIT' &&
      (!x.country || x.country.toUpperCase() === countryCode));
    const atStore = usable.filter((x) => storeSlug && MP.slug(x.where).includes(storeSlug));
    const best = atStore[0] || usable[0];
    return best ? Object.assign({ atStore: !!atStore.length }, best) : null;
  };

  MP.offProductUrl = (code) => `${OFF}/product/${encodeURIComponent(code)}`;
  MP.offAddUrl = () => 'https://world.openfoodfacts.org/contribute';
})(typeof window !== 'undefined' ? window : globalThis);
