// admin.html: make signed free-access codes with the admin's private key. Nothing leaves this page.
(function () {
  const MP = window.MP;
  const $ = (id) => document.getElementById(id);
  let privateKey = null;
  const made = [];

  function status(msg, ok) {
    const el = $('keyStatus');
    el.hidden = false;
    el.className = 'status ' + (ok ? 'ok' : 'err');
    el.textContent = msg;
  }

  function parseKey(text) {
    const obj = JSON.parse(text);
    const k = obj.privateKey || obj;
    if (!k || k.kty !== 'EC' || !k.d) throw new Error('not a private key');
    return Object.assign({ kid: obj.kid || k.kid || 'k1' }, k);
  }

  $('keyFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (f) $('keyText').value = await f.text();
  });

  $('loadKey').addEventListener('click', async () => {
    let key;
    try {
      key = parseKey($('keyText').value);
    } catch (e) {
      return status('That isn’t an admin key file. Choose weekly-basket-admin-key.json.', false);
    }
    if (!crypto.subtle) return status('This page needs https:// (or localhost) to work.', false);
    // Make a test code and check the app would accept it.
    try {
      const test = await MP.access.sign(key, { t: 'tester', n: 'check', d: 1 });
      const res = await MP.access.check(test.code);
      if (!res.ok) {
        return status(MP.ACCESS_KEYS[key.kid]
          ? 'This key doesn’t match the app. Codes made with it would not work.'
          : `The app doesn’t know key "${key.kid}" yet. Add its public key to js/access.js first.`, false);
      }
    } catch (e) {
      return status('This key couldn’t be read. ' + e.message, false);
    }
    privateKey = key;
    $('keyText').value = '';
    $('keyFile').value = '';
    status(`✓ Key "${key.kid}" works with the app. You can make codes now.`, true);
    $('makeCard').hidden = false;
  });

  $('type').addEventListener('change', () => {
    if ($('type').value === 'owner') $('days').value = '0';
  });

  $('make').addEventListener('click', async () => {
    if (!privateKey) return;
    const details = { t: $('type').value, n: $('name').value, d: Number($('days').value), e: $('until').value };
    const { code, data } = await MP.access.sign(privateKey, details);
    const link = new URL('./', location.href).href + '#code=' + code;
    $('code').value = code;
    $('link').value = link;
    $('result').hidden = false;
    $('share').hidden = !navigator.share;
    made.unshift({ data, code, link });
    renderHistory();
  });

  function copy(id) {
    const v = $(id).value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(
      () => { $(id).select(); },
      () => { $(id).select(); document.execCommand('copy'); },
    );
  }
  $('copyLink').addEventListener('click', () => copy('link'));
  $('copyCode').addEventListener('click', () => copy('code'));
  $('share').addEventListener('click', () => navigator.share({ title: 'Weekly Basket', text: 'Your free access to Weekly Basket:', url: $('link').value }).catch(() => {}));

  const freeText = (d) => (d ? `${d} days` : 'forever');

  function renderHistory() {
    $('historyCard').hidden = !made.length;
    const tbody = $('history');
    tbody.textContent = '';
    for (const m of made) {
      const tr = document.createElement('tr');
      for (const v of [m.data.t, m.data.n, freeText(m.data.d), m.data.e || '–', m.data.i]) {
        const td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $('csv').addEventListener('click', () => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['made', 'type', 'name', 'free', 'use by', 'id', 'link']]
      .concat(made.map((m) => [new Date().toISOString().slice(0, 10), m.data.t, m.data.n, freeText(m.data.d), m.data.e, m.data.i, m.link]));
    download('weekly-basket-codes.csv', rows.map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
  });

  $('newKey').addEventListener('click', async () => {
    if (!confirm('Make a new admin key? Once the app is updated with it, every code made with the old key stops working.')) return;
    const used = Object.keys(MP.ACCESS_KEYS).map((k) => Number(k.slice(1)) || 0);
    const kid = 'k' + (Math.max(0, ...used) + 1);
    const pair = await MP.access.newKeyPair(kid);
    download('weekly-basket-admin-key.json', JSON.stringify({
      about: 'Weekly Basket admin key. KEEP PRIVATE: anyone with this file can create free-access codes. Load it in admin.html to make codes.',
      kid, privateKey: pair.privateKey,
    }, null, 2), 'application/json');
    $('pubKey').value = `${kid}: ${JSON.stringify(pair.publicKey)},`;
    $('newKeyOut').hidden = false;
  });
})();
