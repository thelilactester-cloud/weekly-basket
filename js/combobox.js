/*
 * Type-to-search dropdown (ARIA combobox + listbox), for single and multiple choices.
 *
 *   MP.Combo.html({ key, label, options: [[value, label, icon?]], values: [...], multi, free, placeholder,
 *                   onPick(value, isFree), onRemove(value) })
 *
 * Typing filters the list (accents and case ignored, any language). Arrow keys move, Enter picks, Escape closes.
 * With `free`, Enter on text that matches nothing adds the typed text itself (e.g. a food not in the list).
 * Callbacks change the app state; the app re-renders and MP.Combo.restore() puts the focus back.
 */
(function (g) {
  const MP = (g.MP = g.MP || {});
  const reg = {};
  let refocus = null;
  let quietFocus = false; // focus put back after a pick: don't pop the list open over the next field
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const domId = (key) => 'cb-' + key.replace(/[^a-z0-9_-]/gi, '-');

  function html(cfg) {
    reg[cfg.key] = cfg;
    const id = domId(cfg.key);
    const values = cfg.values || [];
    const label = (v) => { const o = cfg.options.find((x) => x[0] === v); return o ? (o[2] ? o[2] + ' ' : '') + o[1] : v; };
    const single = !cfg.multi && values.length ? label(values[0]) : '';
    return `
      <div class="combo ${cfg.multi ? 'multi' : 'single'}" data-combo="${esc(cfg.key)}">
        <span class="combo-label" id="${id}-lbl">${esc(cfg.label)}</span>
        ${cfg.multi && values.length ? `<ul class="combo-chips" aria-label="${esc(cfg.label)}">${values.map((v) => `
          <li><span>${esc(label(v))}</span><button type="button" class="combo-x" data-combo-remove="${esc(v)}" aria-label="${esc((cfg.removeLabel || '×') + ' ' + label(v))}">×</button></li>`).join('')}</ul>` : ''}
        <div class="combo-box">
          <input type="text" role="combobox" autocomplete="off" aria-autocomplete="list" aria-expanded="false"
            aria-controls="${id}-list" aria-labelledby="${id}-lbl" id="${id}-in" value="${esc(single)}" placeholder="${esc(cfg.placeholder || '')}">
          <span class="combo-caret" aria-hidden="true">▾</span>
        </div>
        <ul class="combo-list" role="listbox" id="${id}-list" aria-labelledby="${id}-lbl" ${cfg.multi ? 'aria-multiselectable="true"' : ''} hidden></ul>
      </div>`;
  }

  function open(box, query) {
    const cfg = reg[box.dataset.combo];
    if (!cfg) return;
    const list = box.querySelector('.combo-list');
    const input = box.querySelector('[role=combobox]');
    const q = norm(query);
    const values = cfg.values || [];
    // best matches first: name starts with the text, then a word starts with it, then anywhere
    const rank = (o) => { const n = norm(o[1]); return n.startsWith(q) ? 0 : (' ' + n).includes(' ' + q) || n.includes('(' + q) ? 1 : 2; };
    let opts = cfg.options.filter((o) => !q || norm(o[1]).includes(q) || norm(o[0]).includes(q));
    if (q) opts = opts.map((o, i) => [rank(o), i, o]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
    if (cfg.multi) opts = opts.filter((o) => !values.includes(o[0]));
    const id = domId(cfg.key);
    const items = opts.slice(0, 60).map((o, i) => `<li role="option" id="${id}-o${i}" data-v="${esc(o[0])}" aria-selected="${values.includes(o[0])}">${o[2] ? `<span aria-hidden="true">${o[2]}</span> ` : ''}${esc(o[1])}</li>`);
    if (cfg.free && q && !cfg.options.some((o) => norm(o[1]) === q)) {
      items.push(`<li role="option" id="${id}-free" data-v="${esc(query.trim())}" data-free="1" aria-selected="false">＋ “${esc(query.trim())}”</li>`);
    }
    list.innerHTML = items.join('') || `<li class="combo-empty" aria-disabled="true">${esc(cfg.emptyLabel || '—')}</li>`;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(box, list.querySelector('[role=option]'));
  }
  function close(box) {
    const list = box.querySelector('.combo-list');
    const input = box.querySelector('[role=combobox]');
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function setActive(box, li) {
    const input = box.querySelector('[role=combobox]');
    box.querySelectorAll('.combo-list .active').forEach((x) => x.classList.remove('active'));
    if (!li) { input.removeAttribute('aria-activedescendant'); return; }
    li.classList.add('active');
    input.setAttribute('aria-activedescendant', li.id);
    li.scrollIntoView({ block: 'nearest' });
  }
  function pick(box, li) {
    const cfg = reg[box.dataset.combo];
    if (!cfg || !li || !li.dataset.v) return;
    if (cfg.multi) refocus = cfg.key;
    close(box);
    cfg.onPick(li.dataset.v, li.dataset.free === '1');
  }

  function attach(root) {
    root.addEventListener('focusin', (e) => {
      const input = e.target.closest('[role=combobox]');
      if (!input) return;
      const box = input.closest('[data-combo]');
      if (quietFocus) { quietFocus = false; return; }
      if (!reg[box.dataset.combo].multi) input.select();
      open(box, '');
    });
    root.addEventListener('click', (e) => {
      const input = e.target.closest('[role=combobox]');
      if (input && input.getAttribute('aria-expanded') !== 'true') open(input.closest('[data-combo]'), input.value);
    });
    root.addEventListener('input', (e) => {
      const input = e.target.closest('[role=combobox]');
      if (input) open(input.closest('[data-combo]'), input.value);
    });
    root.addEventListener('keydown', (e) => {
      const input = e.target.closest('[role=combobox]');
      if (!input) return;
      const box = input.closest('[data-combo]');
      const list = box.querySelector('.combo-list');
      const opts = [...list.querySelectorAll('[role=option]')];
      const cur = list.querySelector('.active');
      const i = opts.indexOf(cur);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) open(box, input.value);
        else setActive(box, opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]);
      } else if (e.key === 'Enter') {
        if (!list.hidden && cur) { e.preventDefault(); pick(box, cur); }
      } else if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(box); }
      } else if (e.key === 'Backspace' && !input.value && reg[box.dataset.combo].multi) {
        const cfg = reg[box.dataset.combo];
        const last = (cfg.values || [])[cfg.values.length - 1];
        if (last != null) { refocus = cfg.key; cfg.onRemove(last); }
      }
    });
    // mousedown so the choice is made before the input loses focus
    root.addEventListener('mousedown', (e) => {
      const li = e.target.closest('.combo-list [role=option]');
      if (li) { e.preventDefault(); pick(li.closest('[data-combo]'), li); }
    });
    root.addEventListener('click', (e) => {
      const x = e.target.closest('[data-combo-remove]');
      if (!x) return;
      const box = x.closest('[data-combo]');
      const cfg = reg[box.dataset.combo];
      refocus = cfg.key;
      cfg.onRemove(x.dataset.comboRemove);
    });
    root.addEventListener('focusout', (e) => {
      const box = e.target.closest && e.target.closest('[data-combo]');
      if (!box) return;
      setTimeout(() => {
        if (box.isConnected && !box.contains(document.activeElement)) {
          close(box);
          const cfg = reg[box.dataset.combo];
          const input = box.querySelector('[role=combobox]');
          // a single choice that was typed over and abandoned shows the chosen value again
          if (cfg && !cfg.multi) {
            const v = (cfg.values || [])[0];
            const o = cfg.options.find((x) => x[0] === v);
            input.value = o ? (o[2] ? o[2] + ' ' : '') + o[1] : '';
          } else if (cfg && cfg.free && input.value.trim()) {
            const text = input.value.trim();
            input.value = '';
            cfg.onPick(text, true);
          }
        }
      }, 150);
    });
  }

  // After a re-render: put the focus back in the dropdown that was being used (multi-select keeps adding).
  function restore(root) {
    if (!refocus) return;
    const input = root.querySelector(`[data-combo="${CSS.escape(refocus)}"] [role=combobox]`);
    refocus = null;
    if (input) { quietFocus = true; input.focus(); quietFocus = false; }
  }

  MP.Combo = { html, attach, restore, _reg: reg };
})(typeof window !== 'undefined' ? window : globalThis);
