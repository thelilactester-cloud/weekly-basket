// join.html?ref=CODE: an affiliate's invite link. Shows the offer and the right button for the visitor's phone.
(async function () {
  const MP = window.MP;
  const C = MP.CONFIG;
  const $ = (id) => document.getElementById(id);
  const code = ((location.search.match(/[?&]ref=([A-Za-z0-9_-]{2,32})/) || [])[1] || '').toUpperCase();
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const webApp = new URL(code ? `./?ref=${code}` : './', location.href).href;

  let aff = null;
  if (code && (await MP.account.init())) aff = await MP.account.affiliate(code);
  if (code && !aff) $('invalid').hidden = false;

  if (aff) {
    $('offer').textContent = `${aff.name} gives you 2 months free`;
    $('code').textContent = aff.code;
    $('codeBox').hidden = false;
  } else {
    $('offer').textContent = '1 month free';
  }

  const btn = $('mainBtn');
  if (ios && aff && aff.appleOfferCode && C.appleAppId) {
    btn.href = `https://apps.apple.com/redeem?ctx=offercodes&id=${encodeURIComponent(C.appleAppId)}&code=${encodeURIComponent(aff.appleOfferCode)}`;
    btn.textContent = 'Get 2 months free on the App Store';
    $('hint').textContent = 'The App Store opens with your offer filled in.';
  } else if (ios && C.appleAppId) {
    btn.href = `https://apps.apple.com/app/id${encodeURIComponent(C.appleAppId)}`;
    btn.textContent = 'Download on the App Store';
  } else if (android && C.playStoreLive) {
    btn.href = `https://play.google.com/store/apps/details?id=${encodeURIComponent(C.androidPackage)}&referrer=${encodeURIComponent('ref=' + code)}`;
    btn.textContent = 'Get it on Google Play';
    if (aff) $('hint').textContent = 'After installing, enter the code below in the app to get your 2 free months.';
  } else {
    btn.href = webApp;
    btn.textContent = aff ? 'Start your 2 free months' : 'Start your free month';
    $('hint').textContent = ios ? 'Tip: in Safari, tap Share → Add to Home Screen to keep it like an app.' : '';
  }
})();
