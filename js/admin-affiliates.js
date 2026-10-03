// admin.html → "Affiliates and commissions": add affiliates, share their links, see and pay commissions.
// Needs an account listed in the Firestore "admins" collection; the database rules enforce that.
(async function () {
  const MP = window.MP;
  const A = MP.account;
  const $ = (id) => document.getElementById(id);
  const show = (id, on) => { $(id).hidden = !on; };
  const money = (v) => `$${(Math.round(v * 100) / 100).toFixed(2)}`;
  const joinLink = (code) => new URL(`join.html?ref=${encodeURIComponent(code)}`, MP.CONFIG.webUrl || location.href).href;
  let F;
  let db;
  let affiliates = [];
  let report = [];

  function cell(tr, text) {
    const td = document.createElement('td');
    if (text instanceof Node) td.appendChild(text); else td.textContent = text;
    tr.appendChild(td);
    return td;
  }
  function button(label, onClick, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn small ' + (cls || '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  function msg(id, text, ok) {
    const el = $(id);
    el.hidden = false;
    el.className = 'status ' + (ok ? 'ok' : 'err');
    el.textContent = text;
  }

  if (!(await A.init())) { show('affOff', true); return; }
  F = A.sdk();
  db = A.db();
  $('rMonth').value = new Date().toISOString().slice(0, 7);

  async function isAdmin() {
    try { return (await F.getDoc(F.doc(db, 'admins', A.user.uid))).exists(); } catch (e) { return false; }
  }

  async function render() {
    show('affSignin', false); show('affNotAdmin', false); show('affAdmin', false);
    if (!A.user) { show('affSignin', true); return; }
    if (!(await isAdmin())) { $('aUid').textContent = A.user.uid; show('affNotAdmin', true); return; }
    $('aWho').textContent = A.user.email || A.user.uid;
    show('affAdmin', true);
    await loadAffiliates();
    await loadReport();
  }
  A.onChange(() => { render(); });
  render();

  // --- sign in ---
  $('aSignin').addEventListener('click', async () => {
    try { await A.signIn($('aEmail').value, $('aPass').value); } catch (e) { msg('aErr', MP.t ? MP.t(A.errorKey(e)) : 'Sign-in failed.', false); }
  });
  $('aGoogle').addEventListener('click', async () => {
    try { await A.signInWith('google'); } catch (e) { if (!A.cancelled(e)) msg('aErr', 'Google sign-in failed.', false); }
  });
  $('aSignout').addEventListener('click', () => A.signOut());
  $('aSignout2').addEventListener('click', () => A.signOut());

  // --- affiliates ---
  async function loadAffiliates() {
    const snap = await F.getDocs(F.collection(db, 'affiliates'));
    affiliates = snap.docs.map((d) => Object.assign({ code: d.id }, d.data())).sort((a, b) => a.code.localeCompare(b.code));
    const tbody = $('affList');
    tbody.textContent = '';
    for (const a of affiliates) {
      const tr = document.createElement('tr');
      cell(tr, a.code);
      cell(tr, a.name || '');
      cell(tr, a.active ? 'yes' : 'no');
      const link = joinLink(a.code);
      const td = cell(tr, link);
      td.className = 'code';
      cell(tr, button('Copy link', () => navigator.clipboard && navigator.clipboard.writeText(link)));
      tr.appendChild(document.createElement('td')).appendChild(button('Edit', () => edit(a)));
      tbody.appendChild(tr);
    }
  }

  async function edit(a) {
    $('fCode').value = a.code;
    $('fName').value = a.name || '';
    $('fApple').value = a.appleOfferCode || '';
    $('fActive').checked = !!a.active;
    $('fPayout').value = '';
    try {
      const p = await F.getDoc(F.doc(db, 'affiliatePrivate', a.code));
      if (p.exists()) $('fPayout').value = p.data().payoutEmail || '';
    } catch (e) { /* ignore */ }
    $('fCode').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $('fSave').addEventListener('click', async () => {
    const code = $('fCode').value.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return msg('fMsg', 'The code needs 2–32 letters, numbers, - or _.', false);
    const name = $('fName').value.trim();
    if (!name) return msg('fMsg', 'Please add the name users will see.', false);
    try {
      const existing = affiliates.find((a) => a.code === code);
      await F.setDoc(F.doc(db, 'affiliates', code), {
        name, active: $('fActive').checked, appleOfferCode: $('fApple').value.trim().toUpperCase(),
        ...(existing ? {} : { createdAt: F.serverTimestamp() }),
      }, { merge: true });
      await F.setDoc(F.doc(db, 'affiliatePrivate', code), { payoutEmail: $('fPayout').value.trim() }, { merge: true });
      msg('fMsg', `Saved. Link to share: ${joinLink(code)}`, true);
      await loadAffiliates();
    } catch (e) {
      msg('fMsg', 'Could not save: ' + (e.code || e.message), false);
    }
    return undefined;
  });

  // --- commissions ---
  async function loadReport() {
    const month = $('rMonth').value;
    const snap = await F.getDocs(F.query(F.collection(db, 'commissions'), F.where('month', '==', month)));
    const by = {};
    snap.docs.forEach((d) => {
      const c = d.data();
      const r = (by[c.affiliate] = by[c.affiliate] || { code: c.affiliate, payments: 0, refunds: 0, total: 0, unpaid: 0, ids: [] });
      if (c.kind === 'refund') r.refunds += 1; else r.payments += 1;
      r.total += c.commissionUsd;
      if (!c.paid) { r.unpaid += c.commissionUsd; r.ids.push(d.id); }
    });
    report = Object.values(by).sort((a, b) => b.total - a.total);
    const tbody = $('rBody');
    tbody.textContent = '';
    for (const r of report) {
      const tr = document.createElement('tr');
      cell(tr, r.code);
      cell(tr, String(r.payments));
      cell(tr, String(r.refunds));
      cell(tr, money(r.total));
      cell(tr, money(r.unpaid));
      cell(tr, r.ids.length ? button('Mark paid', () => markPaid(r)) : '✓ paid');
      tbody.appendChild(tr);
    }
    const sum = report.reduce((s, r) => s + r.unpaid, 0);
    $('rTotal').textContent = report.length ? `Unpaid this month: ${money(sum)}` : 'No commissions this month.';
  }
  $('rMonth').addEventListener('change', loadReport);

  async function markPaid(r) {
    if (!confirm(`Mark ${money(r.unpaid)} for ${r.code} as paid?`)) return;
    for (let i = 0; i < r.ids.length; i += 400) {
      const batch = F.writeBatch(db);
      r.ids.slice(i, i + 400).forEach((id) => batch.update(F.doc(db, 'commissions', id), { paid: true, paidAt: F.serverTimestamp() }));
      await batch.commit();
    }
    await loadReport();
  }

  $('rCsv').addEventListener('click', async () => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['month', 'affiliate', 'name', 'payout email', 'payments', 'refunds', 'commission USD', 'unpaid USD']];
    for (const r of report) {
      const a = affiliates.find((x) => x.code === r.code) || {};
      let payout = '';
      try { const p = await F.getDoc(F.doc(db, 'affiliatePrivate', r.code)); payout = p.exists() ? p.data().payoutEmail || '' : ''; } catch (e) { /* ignore */ }
      rows.push([$('rMonth').value, r.code, a.name || '', payout, r.payments, r.refunds, r.total.toFixed(2), r.unpaid.toFixed(2)]);
    }
    const blob = new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commissions-${$('rMonth').value}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  });
})();
