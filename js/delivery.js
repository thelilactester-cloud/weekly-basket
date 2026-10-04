/*
 * "Order online" (free for everyone): hand the shopping list to a delivery service and earn a commission on the order.
 *
 * - Instacart (US, Canada) takes the whole list at once: the `instacartList` function (functions/index.js) sends
 *   it to Instacart's Developer Platform, which returns a link that opens Instacart with every item ready to add.
 * - Other shops can't receive a whole basket from another app, so each item gets a link to that shop's search
 *   (it opens the shop's own app when installed) and the list can be copied in one tap.
 * - Commission: fill in MP.CONFIG.affiliate (js/config.js) after joining each programme. Amazon uses a tag on the
 *   link (Amazon Associates); other shops use a tracking link from their network (Awin, Impact, …) with {url}.
 *
 * Search addresses change now and then: check each one once in LAUNCH.md → "Order online".
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  const AMAZON = {
    US: 'amazon.com', CA: 'amazon.ca', MX: 'amazon.com.mx', BR: 'amazon.com.br', GB: 'amazon.co.uk', IE: 'amazon.co.uk',
    DE: 'amazon.de', AT: 'amazon.de', CH: 'amazon.de', FR: 'amazon.fr', BE: 'amazon.com.be', NL: 'amazon.nl',
    IT: 'amazon.it', ES: 'amazon.es', PT: 'amazon.es', PL: 'amazon.pl', SE: 'amazon.se', TR: 'amazon.com.tr',
    AE: 'amazon.ae', SA: 'amazon.sa', EG: 'amazon.eg', IN: 'amazon.in', JP: 'amazon.co.jp', SG: 'amazon.sg', AU: 'amazon.com.au',
  };

  // Delivery partners per country. search: link for one product ({q} = the product name, URL-encoded).
  const PARTNERS = {
    US: [{ id: 'instacart', name: 'Instacart', whole: true, search: 'https://www.instacart.com/store/s?k={q}' },
      { id: 'walmart', name: 'Walmart', search: 'https://www.walmart.com/search?q={q}' }],
    CA: [{ id: 'instacart', name: 'Instacart', whole: true, search: 'https://www.instacart.ca/store/s?k={q}' }],
    GB: [{ id: 'tesco', name: 'Tesco', search: 'https://www.tesco.com/groceries/en-GB/search?query={q}' },
      { id: 'sainsburys', name: 'Sainsbury’s', search: 'https://www.sainsburys.co.uk/gol-ui/SearchResults/{q}' },
      { id: 'asda', name: 'Asda', search: 'https://groceries.asda.com/search/{q}' },
      { id: 'ocado', name: 'Ocado', search: 'https://www.ocado.com/search?entry={q}' }],
    FR: [{ id: 'carrefour_fr', name: 'Carrefour', search: 'https://www.carrefour.fr/s?q={q}' }],
  };

  // Partners for a country: its own list plus Amazon where Amazon sells groceries.
  MP.deliveryPartners = function (countryCode) {
    const list = (PARTNERS[countryCode] || []).slice();
    const domain = AMAZON[countryCode];
    if (domain) {
      const fresh = countryCode === 'US' ? '&i=amazonfresh' : '';
      list.push({ id: 'amazon', name: countryCode === 'US' ? 'Amazon Fresh' : 'Amazon', domain, search: `https://www.${domain}/s?k={q}${fresh}` });
    }
    return list;
  };

  // Link to one product at a partner, with the affiliate tag / tracking link when configured.
  MP.deliveryLink = function (partner, query) {
    let url = partner.search.replace('{q}', encodeURIComponent(query));
    const aff = (MP.CONFIG && MP.CONFIG.affiliate) || {};
    if (partner.id === 'amazon') {
      const tag = aff.amazon && aff.amazon[partner.domain];
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;
      return url;
    }
    const wrap = aff.links && aff.links[partner.id];
    return wrap ? wrap.replace('{url}', encodeURIComponent(url)) : url;
  };

  // A partner's start page (for saving tips), with the affiliate tag / tracking link when configured.
  MP.deliveryHome = function (partner) {
    const url = new URL(partner.search.replace('{q}', 'x')).origin + '/';
    const aff = (MP.CONFIG && MP.CONFIG.affiliate) || {};
    if (partner.id === 'amazon') {
      const tag = aff.amazon && aff.amazon[partner.domain];
      return tag ? `${url}?tag=${encodeURIComponent(tag)}` : url;
    }
    const wrap = aff.links && aff.links[partner.id];
    return wrap ? wrap.replace('{url}', encodeURIComponent(url)) : url;
  };

  // Saving tips for the shopping list: a few each week (they change with the week), always including the
  // shop's loyalty app. → [tipKey]
  MP.TIPS = ['tip_loyalty', 'tip_ownBrand', 'tip_unitPrice', 'tip_frozen', 'tip_seasonal', 'tip_batch', 'tip_leftovers',
    'tip_deliveryOffers', 'tip_clickCollect', 'tip_pantryFirst'];
  MP.weeklyTips = function (seed, n) {
    const rest = MP.TIPS.slice(1).map((k, i) => [MP.varietyNoise ? MP.varietyNoise(seed || 0, k) : i, k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    return ['tip_loyalty'].concat(rest.slice(0, (n || 3) - 1));
  };

  // Items to send to Instacart: [{ name, quantity, unit }] in the list's language.
  MP.instacartItems = function (groceries, nameOf) {
    const unit = { g: 'gram', ml: 'milliliter', pcs: 'each' };
    return groceries.map((x) => ({ name: nameOf(x.id), quantity: Math.ceil(x.qty), unit: unit[x.unit] || 'each' }));
  };

  // Whole list via Instacart (needs the backend and an Instacart API key). → link or null
  MP.instacartLink = async function (title, items) {
    const A = MP.account;
    if (!A || !A.enabled || !A.functions()) return null;
    try {
      const res = await A.sdk().httpsCallable(A.functions(), 'instacartList')({ title, items });
      return (res.data && res.data.url) || null;
    } catch (e) {
      return null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
