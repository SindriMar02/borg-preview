/* Beer archive: series chips (deep-linkable #n #c #t #zero #yule), sort, text search. Pure DOM filtering of the static tiles. */
(() => {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;
  const tiles = [...grid.children];
  const chips = [...document.querySelectorAll('[data-filter]')];
  const sort = document.querySelector('[data-sort]'), q = document.querySelector('[data-q]');
  const status = document.querySelector('[data-status]'), empty = document.querySelector('[data-empty]');
  const lang = document.body.dataset.lang;
  const label = n => lang === 'is' ? `${n} ${n === 1 ? 'bjór' : 'bjórar'} sýndir` : `${n} ${n === 1 ? 'beer' : 'beers'} shown`;
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o');
  tiles.forEach(t => { t._hay = fold(t.dataset.hay); t._name = t.dataset.name; });
  let cat = 'all', timer = 0, ready = false;
  const KEYS = ['all', 'n', 'c', 't', 'zero', 'yule'];
  const match = (t, c) => c === 'all' || (c === 'zero' ? t.dataset.zero === '1' : c === 'yule' ? t.dataset.yule === '1' : t.dataset.s === c);

  function apply(push) {
    const term = fold(q.value.trim());
    chips.forEach(ch => ch.setAttribute('aria-pressed', ch.dataset.filter === cat ? 'true' : 'false'));
    const mode = sort.value;
    const key = { new: t => +t.dataset.ord, old: t => +t.dataset.old, az: t => t._name, strong: t => -(parseFloat(t.dataset.abv) || -1) };
    const order = [...tiles].sort((a, b) => { const x = key[mode](a), y = key[mode](b); return x < y ? -1 : x > y ? 1 : 0; });
    let n = 0;
    order.forEach((t, i) => {
      const show = match(t, cat) && (!term || t._hay.includes(term));
      if (show && t.hidden && ready && !matchMedia('(prefers-reduced-motion: reduce)').matches) {   // a tile coming back fades in (120-180 ms), nothing queues
        t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
        t.addEventListener('animationend', () => t.classList.remove('is-in'), { once: true });
      }
      t.hidden = !show; t.style.order = i; if (show) n++;
    });
    ready = true;
    status.textContent = label(n);
    empty.hidden = n !== 0;
    const qs = new URLSearchParams(); if (q.value.trim()) qs.set('q', q.value.trim()); if (mode !== 'new') qs.set('sort', mode);
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + (cat === 'all' ? '' : '#' + cat));
  }
  chips.forEach(ch => ch.addEventListener('click', () => { cat = ch.dataset.filter; apply(true); }));
  sort.addEventListener('change', () => apply(false));
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => apply(false), 120); });
  document.querySelector('[data-reset]')?.addEventListener('click', () => { q.value = ''; cat = 'all'; apply(true); q.focus(); });
  const fromUrl = () => { const h = location.hash.slice(1), u = new URLSearchParams(location.search); cat = KEYS.includes(h) ? h : 'all'; if (u.has('q')) q.value = u.get('q'); if (['new', 'old', 'az', 'strong'].includes(u.get('sort'))) sort.value = u.get('sort'); apply(false); };
  addEventListener('hashchange', fromUrl);
  fromUrl();
})();
