// Offline support: cache the app shell, serve it when there is no connection.
const CACHE = 'prepcart-v9';
const LANGS = ['ro', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'hi', 'ar', 'bn', 'bg', 'cs', 'el', 'hu', 'id', 'ja', 'ko', 'nl', 'pl', 'ru', 'sv', 'sw', 'th', 'tr', 'uk', 'vi'];
const FILES = ['./', 'index.html', 'privacy.html', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'js/data.js', 'js/regions.js',
  'js/planner.js', 'js/products.js', 'js/storage.js', 'js/billing.js', 'js/access.js', 'js/vendor/firebase.js', 'js/config.js', 'js/account.js', 'terms.html', 'js/budget.js', 'js/delivery.js', 'js/journal.js', 'js/combobox.js', 'js/household.js', 'js/i18n.js', 'js/app.js',
  ...LANGS.map((l) => `js/lang/${l}.js`)];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first, so updates show up; fall back to the cache offline.
self.addEventListener('fetch', (e) => {
  // Only the app's own files; product/price API calls go straight to the network (the app caches those itself).
  // The Android download (download/*.apk) and the admin page are left alone.
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/download/') || url.pathname.endsWith('.apk') || url.pathname.endsWith('admin.html')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
