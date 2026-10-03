/*
 * Countries → regions (state / province) → supermarket chains.
 *
 * A country lists its national chains in `stores`; each region adds the chains that
 * only operate there. Picking "Other / not listed" for the region shows national chains only.
 *
 * Prices: ingredient prices in data.js are in RON. `priceFactor` converts RON into the
 * country's currency AND adjusts for its food price level (approx. 2026). `priceLevel` on a
 * region adjusts further (e.g. California vs Texas) and `priceIndex` on a store says how
 * cheap or expensive that chain is (1.00 = average). All of these are estimates; real
 * product prices come from Open Prices or from what the user types in (see products.js).
 *
 * Country names are localised with Intl.DisplayNames, so they need no translation here.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  // s('Publix', 1.05) → { id: 'publix', name: 'Publix', priceIndex: 1.05 }
  function s(name, priceIndex, extra) {
    const id = MP_slug(name);
    return Object.assign({ id, name, priceIndex: priceIndex || 1 }, extra || {});
  }
  function MP_slug(name) {
    return String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, 'and').replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '');
  }
  MP.slug = MP_slug;

  // r(name, priceLevel, [stores]) → region
  const r = (name, priceLevel, stores) => ({ name, priceLevel: priceLevel || 1, stores: stores || [] });

  MP.COUNTRIES = {
    // ───────── Europe ─────────
    RO: { currency: 'RON', priceFactor: 1, lang: 'ro',
      stores: [s('Lidl', 0.96), s('Kaufland', 0.98), s('Carrefour', 1.04), s('Mega Image', 1.1), s('Profi', 1.03), s('Penny', 0.95), s('Auchan', 1.0), s('Selgros', 0.97), s('Freshful', 1.05)],
      regions: {
        B: r('București / Ilfov', 1.05, [s('Annabella', 1.0)]),
        CJ: r('Cluj', 1.03, [s('Diana', 1.0)]),
        IS: r('Iași', 0.97, [s('Annabella', 1.0)]),
        TM: r('Timiș', 1.0, [s('Annabella', 1.0)]),
        CT: r('Constanța', 1.0),
        BV: r('Brașov', 1.02, [s('Diana', 1.0)]),
      } },
    MD: { currency: 'MDL', priceFactor: 3.7, lang: 'ro',
      stores: [s('Linella', 1.0), s('Nr. 1', 1.02), s('Fidesco', 0.97), s('Green Hills', 1.08), s('Kaufland', 0.98)] },
    BG: { currency: 'EUR', priceFactor: 0.19, lang: 'bg',
      stores: [s('Lidl', 0.96), s('Kaufland', 0.98), s('Billa', 1.05), s('Fantastico', 1.06), s('T Market', 1.0)] },
    HU: { currency: 'HUF', priceFactor: 78, lang: 'hu',
      stores: [s('Lidl', 0.95), s('Aldi', 0.95), s('Spar', 1.05), s('Tesco', 1.0), s('Auchan', 1.0), s('Penny', 0.96)] },
    PL: { currency: 'PLN', priceFactor: 0.85, lang: 'pl',
      stores: [s('Biedronka', 0.95), s('Lidl', 0.95), s('Kaufland', 0.98), s('Auchan', 1.0), s('Carrefour', 1.03), s('Dino', 0.98), s('Żabka', 1.15)] },
    DE: { currency: 'EUR', priceFactor: 0.24, lang: 'de',
      stores: [s('Lidl', 0.94), s('Aldi', 0.93), s('Kaufland', 0.97), s('Netto', 0.95), s('Penny', 0.95), s('Rewe', 1.1), s('Edeka', 1.1)],
      regions: {
        BY: r('Bayern', 1.05), BE: r('Berlin', 1.02), HH: r('Hamburg', 1.05), NW: r('Nordrhein-Westfalen', 1.0),
        BW: r('Baden-Württemberg', 1.04), SN: r('Sachsen', 0.96, [s('Konsum', 1.02)]),
      } },
    AT: { currency: 'EUR', priceFactor: 0.26, lang: 'de',
      stores: [s('Billa', 1.05), s('Spar', 1.04), s('Hofer', 0.94), s('Lidl', 0.94), s('Penny', 0.95), s('MPreis', 1.08)] },
    NL: { currency: 'EUR', priceFactor: 0.24, lang: 'nl',
      stores: [s('Albert Heijn', 1.06), s('Jumbo', 1.0), s('Lidl', 0.93), s('Aldi', 0.93), s('Plus', 1.02), s('Dirk', 0.96)] },
    FR: { currency: 'EUR', priceFactor: 0.26, lang: 'fr',
      stores: [s('E.Leclerc', 0.95), s('Carrefour', 1.02), s('Auchan', 1.0), s('Intermarché', 1.01), s('Lidl', 0.93), s('Super U', 1.02), s('Monoprix', 1.15)],
      regions: {
        IDF: r('Île-de-France', 1.08, [s('Franprix', 1.12)]), ARA: r('Auvergne-Rhône-Alpes', 1.0), PAC: r("Provence-Alpes-Côte d'Azur", 1.03),
        OCC: r('Occitanie', 0.98), NAQ: r('Nouvelle-Aquitaine', 0.98), HDF: r('Hauts-de-France', 0.97, [s('Match', 1.0)]),
      } },
    BE: { currency: 'EUR', priceFactor: 0.25, lang: 'fr',
      stores: [s('Delhaize', 1.07), s('Colruyt', 0.95), s('Carrefour', 1.02), s('Aldi', 0.93), s('Lidl', 0.93)] },
    IT: { currency: 'EUR', priceFactor: 0.24, lang: 'it',
      stores: [s('Conad', 1.02), s('Coop', 1.03), s('Lidl', 0.94), s('Carrefour', 1.0), s('Eurospin', 0.92), s('Pam', 1.03)],
      regions: {
        LOM: r('Lombardia', 1.06, [s('Esselunga', 1.06), s('Iper', 1.0)]), LAZ: r('Lazio', 1.02, [s('Todis', 0.95)]),
        CAM: r('Campania', 0.96, [s('Decò', 0.98)]), PIE: r('Piemonte', 1.02, [s('Esselunga', 1.06)]),
        TOS: r('Toscana', 1.02, [s('Esselunga', 1.06)]), SIC: r('Sicilia', 0.95, [s('Despar', 1.0)]),
      } },
    ES: { currency: 'EUR', priceFactor: 0.22, lang: 'es',
      stores: [s('Mercadona', 0.97), s('Carrefour', 1.02), s('Lidl', 0.95), s('Dia', 0.98), s('Alcampo', 0.99), s('Eroski', 1.02)],
      regions: {
        MD: r('Madrid', 1.04), CT: r('Cataluña', 1.05, [s('Bonpreu', 1.04), s('Condis', 1.03)]),
        AN: r('Andalucía', 0.96, [s('Covirán', 1.0)]), VC: r('Comunidad Valenciana', 0.98, [s('Consum', 1.0)]),
        PV: r('País Vasco', 1.06, [s('BM', 1.04)]), GA: r('Galicia', 0.97, [s('Gadis', 1.0), s('Froiz', 0.98)]),
      } },
    PT: { currency: 'EUR', priceFactor: 0.21, lang: 'pt',
      stores: [s('Continente', 1.0), s('Pingo Doce', 0.99), s('Lidl', 0.94), s('Auchan', 1.0), s('Intermarché', 1.0), s('Minipreço', 0.97)] },
    GB: { currency: 'GBP', priceFactor: 0.2, lang: 'en',
      stores: [s('Tesco', 1.0), s("Sainsbury's", 1.04), s('Asda', 0.97), s('Morrisons', 1.0), s('Aldi', 0.9), s('Lidl', 0.9), s('Co-op', 1.1), s('Waitrose', 1.2), s('M&S', 1.2)],
      regions: {
        ENG: r('England', 1.0, [s('Iceland', 0.95)]), LDN: r('London', 1.08, [s('Iceland', 0.95)]),
        SCT: r('Scotland', 1.0, [s('Scotmid', 1.05), s('Iceland', 0.95)]), WLS: r('Wales', 0.98, [s('Iceland', 0.95)]),
        NIR: r('Northern Ireland', 1.0, [s('Dunnes Stores', 1.0), s('SuperValu', 1.03)]),
      } },
    IE: { currency: 'EUR', priceFactor: 0.27, lang: 'en',
      stores: [s('Tesco', 1.0), s('Dunnes Stores', 1.0), s('SuperValu', 1.03), s('Aldi', 0.92), s('Lidl', 0.92)] },
    // ───────── Americas ─────────
    US: { currency: 'USD', priceFactor: 0.29, lang: 'en', units: 'imperial', regionLabel: 'state',
      stores: [s('Walmart', 0.92), s('Costco', 0.9), s('Aldi', 0.88), s('Target', 1.0), s("Trader Joe's", 0.98), s('Whole Foods', 1.25), s("Sam's Club", 0.9)],
      regions: {
        FL: r('Florida', 1.02, [s('Publix', 1.08), s('Winn-Dixie', 1.0), s("Sedano's", 0.95), s('Presidente', 0.95), s('Sprouts', 1.08)]),
        CA: r('California', 1.18, [s('Safeway', 1.08), s('Vons', 1.08), s('Ralphs', 1.05), s('Albertsons', 1.06), s('Sprouts', 1.08), s('Stater Bros', 1.0), s('Food 4 Less', 0.92)]),
        TX: r('Texas', 0.94, [s('H-E-B', 0.95), s('Kroger', 1.0), s('Tom Thumb', 1.06), s('Fiesta Mart', 0.94), s('Central Market', 1.15)]),
        NY: r('New York', 1.15, [s('Wegmans', 1.02), s('ShopRite', 1.0), s('Stop & Shop', 1.05), s('Key Food', 1.05), s('Tops', 1.0), s('Price Chopper', 1.0)]),
        NJ: r('New Jersey', 1.1, [s('ShopRite', 1.0), s('Stop & Shop', 1.05), s('Wegmans', 1.02), s('Acme', 1.05)]),
        PA: r('Pennsylvania', 1.0, [s('Giant', 1.03), s('Weis', 1.0), s('ShopRite', 1.0), s('Wegmans', 1.02), s('Giant Eagle', 1.03)]),
        MA: r('Massachusetts', 1.12, [s('Market Basket', 0.92), s('Stop & Shop', 1.05), s('Star Market', 1.08), s('Hannaford', 1.0)]),
        IL: r('Illinois', 1.03, [s('Jewel-Osco', 1.06), s("Mariano's", 1.06), s('Meijer', 0.97)]),
        OH: r('Ohio', 0.95, [s('Kroger', 1.0), s('Giant Eagle', 1.03), s('Meijer', 0.97)]),
        MI: r('Michigan', 0.96, [s('Meijer', 0.97), s('Kroger', 1.0)]),
        GA: r('Georgia', 0.97, [s('Publix', 1.08), s('Kroger', 1.0), s('Ingles', 1.0)]),
        NC: r('North Carolina', 0.96, [s('Food Lion', 0.96), s('Harris Teeter', 1.08), s('Lowes Foods', 1.02), s('Publix', 1.08)]),
        AZ: r('Arizona', 0.98, [s("Fry's", 1.0), s('Safeway', 1.08), s("Bashas'", 1.05), s('Sprouts', 1.08)]),
        WA: r('Washington', 1.1, [s('Safeway', 1.08), s('QFC', 1.06), s('Fred Meyer', 1.0), s('PCC', 1.2)]),
        CO: r('Colorado', 1.03, [s('King Soopers', 1.0), s('Safeway', 1.08), s('Sprouts', 1.08)]),
      } },
    CA: { currency: 'CAD', priceFactor: 0.39, lang: 'en', regionLabel: 'province',
      stores: [s('Walmart', 0.93), s('Costco', 0.9), s('No Frills', 0.92), s('Sobeys', 1.06), s('FreshCo', 0.93), s('Loblaws', 1.08)],
      regions: {
        ON: r('Ontario', 1.0, [s('Metro', 1.05), s('Food Basics', 0.92), s('Longo’s', 1.12), s('Farm Boy', 1.12)]),
        QC: r('Québec', 0.98, [s('IGA', 1.04), s('Metro', 1.05), s('Maxi', 0.92), s('Super C', 0.92), s('Provigo', 1.05)]),
        BC: r('British Columbia', 1.06, [s('Save-On-Foods', 1.06), s('Safeway', 1.06), s('Real Canadian Superstore', 0.97), s('Thrifty Foods', 1.08)]),
        AB: r('Alberta', 1.0, [s('Save-On-Foods', 1.06), s('Safeway', 1.06), s('Real Canadian Superstore', 0.97), s('Co-op', 1.05)]),
        MB: r('Manitoba', 1.0, [s('Safeway', 1.06), s('Real Canadian Superstore', 0.97), s('Save-On-Foods', 1.06)]),
        NS: r('Nova Scotia', 1.05, [s('Atlantic Superstore', 1.0), s('Foodland', 1.05)]),
      } },
    MX: { currency: 'MXN', priceFactor: 3.2, lang: 'es', regionLabel: 'state',
      stores: [s('Walmart', 0.97), s('Bodega Aurrera', 0.9), s('Soriana', 1.0), s('Chedraui', 1.0), s('La Comer', 1.08), s('Costco', 0.93)],
      regions: {
        CMX: r('Ciudad de México', 1.05, [s('Superama', 1.12), s('City Market', 1.25)]),
        JAL: r('Jalisco', 1.0), NLE: r('Nuevo León', 1.02, [s('H-E-B', 0.98)]), YUC: r('Yucatán', 0.98, [s('Super Aki', 0.97)]),
      } },
    BR: { currency: 'BRL', priceFactor: 1.0, lang: 'pt', regionLabel: 'state',
      stores: [s('Carrefour', 1.0), s('Assaí', 0.9), s('Atacadão', 0.9), s('Pão de Açúcar', 1.15)],
      regions: {
        SP: r('São Paulo', 1.05, [s('St Marche', 1.2), s('Dia', 0.95), s('Sonda', 1.0)]),
        RJ: r('Rio de Janeiro', 1.05, [s('Prezunic', 0.98), s('Guanabara', 0.92), s('Zona Sul', 1.15)]),
        MG: r('Minas Gerais', 0.97, [s('Supernosso', 1.05), s('BH', 0.95), s('EPA', 0.98)]),
        RS: r('Rio Grande do Sul', 1.0, [s('Zaffari', 1.08), s('Nacional', 1.0)]),
      } },
    // ───────── Africa / Middle East ─────────
    ZA: { currency: 'ZAR', priceFactor: 3.0, lang: 'en', regionLabel: 'province',
      stores: [s('Shoprite', 0.94), s('Checkers', 1.02), s('Pick n Pay', 1.0), s('Woolworths', 1.2), s('Spar', 1.03), s("Food Lover's Market", 1.0), s('Makro', 0.93)],
      regions: {
        GP: r('Gauteng', 1.0, [s('Boxer', 0.9)]), WC: r('Western Cape', 1.03, [s('Checkers Hyper', 0.98)]),
        KZN: r('KwaZulu-Natal', 0.98, [s('Boxer', 0.9)]), EC: r('Eastern Cape', 0.97, [s('Boxer', 0.9)]),
      } },
    AE: { currency: 'AED', priceFactor: 0.88, lang: 'ar', regionLabel: 'emirate',
      stores: [s('Carrefour', 1.0), s('Lulu', 0.95), s('Spinneys', 1.15), s('Waitrose', 1.2), s('Choithrams', 1.05)],
      regions: { DU: r('Dubai', 1.03, [s('Union Coop', 0.97)]), AZ: r('Abu Dhabi', 1.0, [s('Abu Dhabi Co-op', 0.97)]), SH: r('Sharjah', 0.97, [s('Sharjah Co-op', 0.95)]) } },
    // ───────── Asia / Oceania ─────────
    IN: { currency: 'INR', priceFactor: 8.3, lang: 'hi', regionLabel: 'state',
      stores: [s('DMart', 0.92), s('Reliance Smart', 0.97), s('More', 1.0), s('Star Bazaar', 1.02), s("Spencer's", 1.05), s("Nature's Basket", 1.25), s('BigBasket', 1.0), s('Blinkit', 1.05), s('Zepto', 1.05), s('Swiggy Instamart', 1.05)],
      regions: {
        MH: r('Maharashtra', 1.05), DL: r('Delhi NCR', 1.05, [s('Modern Bazaar', 1.12)]), KA: r('Karnataka', 1.03, [s("Namdhari's", 1.1), s('Ratnadeep', 1.0)]),
        TN: r('Tamil Nadu', 0.98, [s('Nilgiris', 1.05)]), TG: r('Telangana', 1.0, [s('Ratnadeep', 1.0)]), WB: r('West Bengal', 0.97),
        GJ: r('Gujarat', 0.97, [s('Osia', 0.97)]),
      } },
    CN: { currency: 'CNY', priceFactor: 1.26, lang: 'zh', regionLabel: 'province',
      stores: [s('Hema 盒马', 1.08), s('Yonghui 永辉', 0.97), s('RT-Mart 大润发', 0.97), s('Walmart 沃尔玛', 0.98), s("Sam's Club 山姆", 1.05), s('CR Vanguard 华润万家', 1.0), s('Ole’ 精品超市', 1.25)],
      regions: {
        BJ: r('Beijing 北京', 1.08, [s('Wumart 物美', 0.97)]), SH: r('Shanghai 上海', 1.1, [s('Lianhua 联华', 0.98), s('City Shop 城市超市', 1.3)]),
        GD: r('Guangdong 广东', 1.03, [s('AEON 永旺', 1.05)]), ZJ: r('Zhejiang 浙江', 1.03, [s('Century Mart 世纪联华', 1.0)]),
        SC: r('Sichuan 四川', 0.95, [s('Hongqi 红旗连锁', 0.97)]),
      } },
    JP: { currency: 'JPY', priceFactor: 34, lang: 'ja',
      stores: [s('AEON', 1.0), s('Ito-Yokado', 1.03), s('Seiyu', 0.95), s('Life', 1.0), s('Gyomu Super', 0.88), s('OK Store', 0.9)] },
    AU: { currency: 'AUD', priceFactor: 0.43, lang: 'en', regionLabel: 'state',
      stores: [s('Woolworths', 1.02), s('Coles', 1.02), s('Aldi', 0.9), s('IGA', 1.08), s('Costco', 0.92)],
      regions: {
        NSW: r('New South Wales', 1.04, [s('Harris Farm', 1.12)]), VIC: r('Victoria', 1.0), QLD: r('Queensland', 0.99),
        WA: r('Western Australia', 1.02, [s('Spudshed', 0.9)]), SA: r('South Australia', 0.99, [s('Foodland', 1.04), s('Drakes', 1.0)]),
      } },
    NZ: { currency: 'NZD', priceFactor: 0.48, lang: 'en',
      stores: [s('Woolworths', 1.02), s("Pak'nSave", 0.92), s('New World', 1.06), s('FreshChoice', 1.04)] },
    SG: { currency: 'SGD', priceFactor: 0.41, lang: 'en',
      stores: [s('NTUC FairPrice', 1.0), s('Cold Storage', 1.15), s('Giant', 0.95), s('Sheng Siong', 0.95), s('Don Don Donki', 1.1)] },
    MY: { currency: 'MYR', priceFactor: 0.65, lang: 'en', regionLabel: 'state',
      stores: [s("Lotus's", 1.0), s('AEON', 1.02), s('Giant', 0.97), s('Mydin', 0.95), s('99 Speedmart', 0.97)],
      regions: { KL: r('Kuala Lumpur', 1.05, [s('Jaya Grocer', 1.15), s('Village Grocer', 1.15)]), SGR: r('Selangor', 1.02, [s('Jaya Grocer', 1.15)]), PNG: r('Penang', 1.0), JHR: r('Johor', 0.98) } },
    ID: { currency: 'IDR', priceFactor: 2340, lang: 'id', regionLabel: 'province',
      stores: [s('Indomaret', 0.98), s('Alfamart', 0.98), s('Hypermart', 1.0), s('Transmart', 1.02), s('Superindo', 1.0), s('Lotte Mart', 1.0), s('Hero', 1.1)],
      regions: { JK: r('Jakarta', 1.06, [s('Ranch Market', 1.25), s('Grand Lucky', 1.15)]), JB: r('Jawa Barat', 0.98, [s('Yogya', 0.98)]), JI: r('Jawa Timur', 0.96), BA: r('Bali', 1.05, [s('Pepito', 1.15), s('Popular Deli', 1.15)]) } },
    PH: { currency: 'PHP', priceFactor: 9.6, lang: 'en', regionLabel: 'region',
      stores: [s('SM Supermarket', 1.0), s('Puregold', 0.95), s('Robinsons Supermarket', 1.02), s('Savemore', 0.97), s('Landers', 1.0), s('S&R', 1.0)],
      regions: { NCR: r('Metro Manila', 1.05, [s('Rustan’s', 1.2), s('Shopwise', 1.05)]), CEB: r('Cebu', 0.98, [s('Gaisano', 0.95), s('Metro', 1.0)]), DAV: r('Davao', 0.97, [s('Gaisano', 0.95)]) } },
    VN: { currency: 'VND', priceFactor: 3480, lang: 'vi', regionLabel: 'region',
      stores: [s('WinMart', 1.0), s('Co.op Mart', 1.0), s('Bach Hoa Xanh', 0.95), s('AEON', 1.08), s('Lotte Mart', 1.03), s('MM Mega Market', 0.97), s('GO!', 0.98)],
      regions: { HN: r('Hà Nội', 1.03), SG: r('TP. Hồ Chí Minh', 1.05, [s('Annam Gourmet', 1.3)]), DN: r('Đà Nẵng', 0.98) } },
    TH: { currency: 'THB', priceFactor: 5.4, lang: 'th', regionLabel: 'province',
      stores: [s("Lotus's", 1.0), s('Big C', 0.98), s('Makro', 0.93), s('Tops', 1.08), s('7-Eleven', 1.1)],
      regions: { BKK: r('Bangkok', 1.05, [s('Villa Market', 1.2), s('Gourmet Market', 1.25)]), CM: r('Chiang Mai', 0.97, [s('Rimping', 1.1)]), PKT: r('Phuket', 1.05, [s('Villa Market', 1.2)]) } },
    KR: { currency: 'KRW', priceFactor: 458, lang: 'ko', regionLabel: 'region',
      stores: [s('E-Mart', 1.0), s('Homeplus', 1.0), s('Lotte Mart', 1.0), s('GS The Fresh', 1.05), s('Costco', 0.9), s('Coupang', 0.98), s('Kurly', 1.1)],
      regions: { SEL: r('Seoul', 1.05), BSN: r('Busan', 0.98), GG: r('Gyeonggi', 1.0) } },
    PK: { currency: 'PKR', priceFactor: 31, lang: 'en', regionLabel: 'region',
      stores: [s('Imtiaz', 0.97), s('Carrefour', 1.03), s('Metro', 0.97), s('Chase Up', 0.97)],
      regions: { KHI: r('Karachi', 1.02, [s('Naheed', 1.05)]), LHE: r('Lahore', 1.0, [s('Al-Fatah', 1.0), s('Hyperstar', 1.03)]), ISB: r('Islamabad / Rawalpindi', 1.03, [s('Al-Fatah', 1.0)]) } },
    BD: { currency: 'BDT', priceFactor: 15, lang: 'bn',
      stores: [s('Shwapno', 1.0), s('Agora', 1.05), s('Meena Bazar', 1.03), s('Unimart', 1.1), s('Chaldal', 1.0)] },
    SA: { currency: 'SAR', priceFactor: 0.83, lang: 'ar', regionLabel: 'region',
      stores: [s('Panda', 1.0), s('Lulu', 0.97), s('Carrefour', 1.0), s('Othaim', 0.95), s('Danube', 1.1), s('Tamimi Markets', 1.1)],
      regions: { RUH: r('Riyadh', 1.02), JED: r('Makkah / Jeddah', 1.0, [s('Bin Dawood', 1.03)]), EP: r('Eastern Province', 1.0) } },
    TR: { currency: 'TRY', priceFactor: 6.9, lang: 'tr', regionLabel: 'province',
      stores: [s('BİM', 0.9), s('A101', 0.9), s('ŞOK', 0.92), s('Migros', 1.05), s('CarrefourSA', 1.03), s('File', 0.97)],
      regions: { IST: r('İstanbul', 1.06, [s('Macrocenter', 1.25)]), ANK: r('Ankara', 1.0), IZM: r('İzmir', 1.02, [s('Macrocenter', 1.25)]), ANT: r('Antalya', 1.02) } },
    EG: { currency: 'EGP', priceFactor: 5.9, lang: 'ar', regionLabel: 'region',
      stores: [s('Carrefour', 1.0), s('Spinneys', 1.1), s('Hyper One', 0.97), s('Kazyon', 0.9), s('Metro Market', 1.03)],
      regions: { CAI: r('Cairo / Giza', 1.03, [s('Seoudi', 1.05), s('Gourmet Egypt', 1.25)]), ALX: r('Alexandria', 1.0, [s('Fathalla', 0.95)]) } },
    MA: { currency: 'MAD', priceFactor: 1.4, lang: 'fr',
      stores: [s('Marjane', 1.0), s('Carrefour', 1.0), s('BIM', 0.9), s('Aswak Assalam', 1.0), s('Label’Vie', 1.02)] },
    NG: { currency: 'NGN', priceFactor: 273, lang: 'en', regionLabel: 'state',
      stores: [s('Shoprite', 1.0), s('Spar', 1.05), s('Justrite', 0.95), s('Market Square', 0.98)],
      regions: { LA: r('Lagos', 1.05, [s('Ebeano', 1.0), s('Hubmart', 1.1), s('Prince Ebeano', 1.0)]), FC: r('Abuja (FCT)', 1.05, [s('Ebeano', 1.0), s('Sahad Stores', 1.0)]), RI: r('Rivers', 1.0), KN: r('Kano', 0.95) } },
    GH: { currency: 'GHS', priceFactor: 2.0, lang: 'en',
      stores: [s('Shoprite', 1.0), s('Melcom', 1.0), s('MaxMart', 1.1), s('Palace', 1.05), s('China Mall', 0.95)] },
    KE: { currency: 'KES', priceFactor: 24, lang: 'sw', regionLabel: 'county',
      stores: [s('Naivas', 1.0), s('Quickmart', 0.98), s('Carrefour', 1.05), s('Cleanshelf', 0.97)],
      regions: { NBO: r('Nairobi', 1.04, [s('Chandarana FoodPlus', 1.12)]), MSA: r('Mombasa', 1.0, [s('Chandarana FoodPlus', 1.12)]), KSM: r('Kisumu', 0.97) } },
    RU: { currency: 'RUB', priceFactor: 15.3, lang: 'ru', regionLabel: 'region',
      stores: [s('Pyaterochka Пятёрочка', 0.95), s('Magnit Магнит', 0.95), s('Perekrestok Перекрёсток', 1.03), s('Lenta Лента', 0.97), s('VkusVill ВкусВилл', 1.1), s('Auchan Ашан', 0.98)],
      regions: { MOW: r('Москва', 1.08, [s('Azbuka Vkusa Азбука Вкуса', 1.35)]), SPE: r('Санкт-Петербург', 1.04, [s("O'Key О'Кей", 1.0)]), SVE: r('Свердловская область', 0.98) } },
    UA: { currency: 'UAH', priceFactor: 6.8, lang: 'uk', regionLabel: 'region',
      stores: [s('ATB АТБ', 0.92), s('Silpo Сільпо', 1.08), s('Novus', 1.05), s('Auchan Ашан', 1.0), s('Varus', 1.0), s('Fora Фора', 1.0), s('Metro', 0.97)],
      regions: { KYV: r('Київ', 1.06, [s('Le Silpo', 1.3)]), LVV: r('Львів', 1.0), ODS: r('Одеса', 1.0), DNP: r('Дніпро', 0.98) } },
    CZ: { currency: 'CZK', priceFactor: 5.3, lang: 'cs',
      stores: [s('Albert', 1.0), s('Kaufland', 0.97), s('Lidl', 0.95), s('Billa', 1.03), s('Tesco', 1.0), s('Penny', 0.95), s('Globus', 1.0)] },
    SK: { currency: 'EUR', priceFactor: 0.21, lang: 'cs',
      stores: [s('Tesco', 1.0), s('Kaufland', 0.97), s('Lidl', 0.95), s('Billa', 1.03), s('COOP Jednota', 1.0), s('Fresh', 1.0)] },
    GR: { currency: 'EUR', priceFactor: 0.22, lang: 'el', regionLabel: 'region',
      stores: [s('Sklavenitis Σκλαβενίτης', 1.0), s('AB Vassilopoulos ΑΒ Βασιλόπουλος', 1.05), s('Lidl', 0.95), s('My Market', 1.0), s('Kritikos Κρητικός', 0.98)],
      regions: { ATT: r('Αττική', 1.04), TSL: r('Θεσσαλονίκη', 1.0, [s('Masoutis Μασούτης', 1.0)]), CRT: r('Κρήτη', 1.02, [s('Chalkiadakis Χαλκιαδάκης', 1.0)]) } },
    HR: { currency: 'EUR', priceFactor: 0.21, lang: 'en',
      stores: [s('Konzum', 1.0), s('Lidl', 0.94), s('Kaufland', 0.96), s('Spar', 1.03), s('Plodine', 0.98), s('Tommy', 1.0)] },
    RS: { currency: 'RSD', priceFactor: 22, lang: 'en',
      stores: [s('Maxi', 1.0), s('Lidl', 0.94), s('Idea', 1.03), s('Univerexport', 0.98), s('Roda', 1.0), s('Aman', 0.95)] },
    SE: { currency: 'SEK', priceFactor: 2.6, lang: 'sv',
      stores: [s('ICA', 1.03), s('Coop', 1.02), s('Willys', 0.93), s('Hemköp', 1.05), s('Lidl', 0.92), s('City Gross', 0.97)] },
    NO: { currency: 'NOK', priceFactor: 3.4, lang: 'en',
      stores: [s('Rema 1000', 0.95), s('Kiwi', 0.95), s('Coop Extra', 0.97), s('Meny', 1.08), s('Spar', 1.05)] },
    DK: { currency: 'DKK', priceFactor: 2.1, lang: 'en',
      stores: [s('Netto', 0.93), s('Rema 1000', 0.93), s('Føtex', 1.0), s('Bilka', 0.97), s('Lidl', 0.92), s('Meny', 1.08)] },
    FI: { currency: 'EUR', priceFactor: 0.25, lang: 'en',
      stores: [s('K-Citymarket', 1.02), s('Prisma', 0.98), s('S-market', 1.0), s('Lidl', 0.92), s('K-Supermarket', 1.05)] },
    CH: { currency: 'CHF', priceFactor: 0.32, lang: 'de',
      stores: [s('Migros', 1.0), s('Coop', 1.05), s('Denner', 0.92), s('Aldi Suisse', 0.88), s('Lidl', 0.88), s('Manor', 1.2)] },
    AR: { currency: 'ARS', priceFactor: 290, lang: 'es', regionLabel: 'province',
      stores: [s('Carrefour', 1.0), s('Coto', 0.98), s('Día', 0.93), s('Changomás', 0.95), s('Disco', 1.08), s('Jumbo', 1.1)],
      regions: { CABA: r('Ciudad de Buenos Aires', 1.05), BA: r('Buenos Aires', 1.0), CBA: r('Córdoba', 0.97), SF: r('Santa Fe', 0.98), PAT: r('Patagonia', 1.08, [s('La Anónima', 1.0)]) } },
    CO: { currency: 'COP', priceFactor: 616, lang: 'es', regionLabel: 'department',
      stores: [s('Éxito', 1.02), s('Olímpica', 0.98), s('D1', 0.88), s('Ara', 0.88), s('Jumbo', 1.0), s('Alkosto', 0.95)],
      regions: { BOG: r('Bogotá', 1.04, [s('Carulla', 1.15)]), ANT: r('Antioquia (Medellín)', 1.0, [s('Carulla', 1.15)]), VAC: r('Valle del Cauca (Cali)', 0.98) } },
    CL: { currency: 'CLP', priceFactor: 200, lang: 'es', regionLabel: 'region',
      stores: [s('Líder', 0.95), s('Jumbo', 1.05), s('Santa Isabel', 1.0), s('Unimarc', 1.0), s('Tottus', 0.98), s('Acuenta', 0.9)] },
    PE: { currency: 'PEN', priceFactor: 0.58, lang: 'es', regionLabel: 'region',
      stores: [s('Plaza Vea', 1.0), s('Tottus', 0.98), s('Metro', 1.0), s('Mass', 0.92)],
      regions: { LIM: r('Lima', 1.04, [s('Wong', 1.12), s('Vivanda', 1.15)]), ARE: r('Arequipa', 0.98), LAL: r('La Libertad (Trujillo)', 0.97) } },
  };

  // Shown in place of a chain when the user's shop is not listed.
  MP.CUSTOM_STORE_ID = 'custom';

  MP.countryName = function (code, lang) {
    try { return new Intl.DisplayNames([lang, 'en'], { type: 'region' }).of(code); } catch (e) { return code; }
  };
  MP.flag = (code) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

  // All shops available in a country / region: the region's own chains first, then national chains.
  MP.storesFor = function (countryCode, regionCode) {
    const c = MP.COUNTRIES[countryCode] || MP.COUNTRIES.RO;
    const reg = c.regions && c.regions[regionCode];
    const seen = new Set();
    return [...(reg ? reg.stores : []), ...c.stores].filter((st) => !seen.has(st.id) && seen.add(st.id));
  };
})(typeof window !== 'undefined' ? window : globalThis);
