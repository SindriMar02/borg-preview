/* focus-guard (_tools/focus-guard): no focus ring after a tap or click; the README says why */
(function () {
  var root = document.documentElement;
  function set(v) { if (root.getAttribute('data-input') !== v) root.setAttribute('data-input', v); }
  addEventListener('pointerdown', function () { set('pointer'); }, true);
  addEventListener('keydown', function (e) {
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    set('key');
  }, true);
})();

/* Borg Brugghús prototype: shared behaviour (age gate, bar, mobile menu, reveals, fan, process rule, collab swap, beer tilt).
   Every reveal is an enhancement: without GSAP or with reduced motion the page renders plain. */
(() => {
  const html = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- smooth scroll (fine pointers only: Lenis breaks iOS toolbar collapse) ---------- */
  let lenis = null;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  if (!RM && FINE && window.Lenis && hasGsap) {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const barH = () => $('[data-bar]')?.offsetHeight || 0;
  const scrollToY = y => lenis ? lenis.scrollTo(y, { duration: 1.1 }) : window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  window.BRG = { lenis, scrollToY, RM, FINE, hasGsap };
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => location.reload());   // the preference can change while the page is open

  /* ---------- age gate (Borg's own site has one: 20 or older) ---------- */
  const KEY = 'borg-age-v1', MIN_AGE = 20;
  const gate = $('[data-gate]');
  let gateOpen = false;
  const pageNodes = () => [...document.body.children].filter(n => n !== gate && n.tagName !== 'SCRIPT' && !n.matches('[data-loader]'));

  /* ---------- loading screen: the Borg crest on the page ground, a thin line that fills with the real work (fonts, load, the hero
     image decoded), then the crest fades and the ground lifts like a curtain while the page arrives underneath. Once per session,
     never under reduced motion (the head script decides, `html.loading`). ---------- */
  const loader = $('[data-loader]');
  const LOADING = html.classList.contains('loading') && !!loader;
  let startReveal; const revealed = new Promise(r => { startReveal = r; });
  /* the opening arrival (M0) starts when the curtain starts to lift, or after the gate has been passed */
  const ready = () => (LOADING ? revealed : Promise.resolve()).then(() => requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add('ready'))));
  if (LOADING) {
    const bar = $('[data-loader-bar]', loader), t0 = performance.now(), MIN = 1200;
    let p = 0, gone = false;
    const set = v => { p = Math.max(p, v); bar.style.transform = `scaleX(${p.toFixed(3)})`; };
    set(0.12);
    const heroImg = $('.beer__img, .bpage__media img, .btile img');
    const steps = [document.fonts && document.fonts.ready, new Promise(r => { document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }); }), heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : null].filter(Boolean);
    let n = 0; steps.forEach(pr => pr.then(() => set(0.12 + (++n / steps.length) * 0.84)));
    const mark = n => { try { performance.mark('borg:' + n); } catch {} };
    const out = () => {
      if (gone) return; gone = true; set(1); mark('loader-out');
      try { sessionStorage.setItem('borg-loaded', '1'); } catch {}
      setTimeout(() => loader.classList.add('is-out'), 160);                  // the line completes, then the crest fades and the ground lifts
      setTimeout(() => { mark('reveal-start'); startReveal(); }, 400);                                          // the page starts to arrive as the curtain starts to move
      setTimeout(() => { mark('loader-removed'); html.classList.remove('loading'); loader.remove(); if (hasGsap) ScrollTrigger.refresh(); }, 1750);
    };
    Promise.all(steps).then(() => setTimeout(out, Math.max(0, MIN - (performance.now() - t0))));
    setTimeout(out, 7000);                                                    // failsafe: never trap the visitor
  }
  function openGate() {
    const yrs = $('[data-years]', gate), now = new Date().getFullYear();
    if (yrs && yrs.options.length < 3) for (let y = now; y >= 1900; y--) yrs.add(new Option(y, y));
    html.setAttribute('data-gate', 'open');
    gate.hidden = false; gateOpen = true; html.style.overflow = 'hidden'; lenis?.stop();
    pageNodes().forEach(n => n.setAttribute('inert', ''));
    html.classList.remove('gate-pending');
    requestAnimationFrame(() => { gate.classList.add('open'); $('.gate__panel', gate).focus({ preventScroll: true }); });
  }
  function closeGate() {
    gate.classList.add('closing'); gate.classList.remove('open');
    pageNodes().forEach(n => n.removeAttribute('inert'));
    html.style.overflow = ''; lenis?.start(); gateOpen = false; html.removeAttribute('data-gate');
    setTimeout(() => { gate.hidden = true; }, 220);
    setTimeout(ready, 140);
  }
  if (!gate) requestAnimationFrame(() => requestAnimationFrame(ready));
  if (gate) {
    let ok = false; try { ok = !!localStorage.getItem(KEY); } catch {}
    if (ok) { html.classList.remove('gate-pending'); requestAnimationFrame(() => requestAnimationFrame(ready)); } else { openGate(); }
    $('[data-gate-form]', gate).addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, d = +f.d.value, m = +f.m.value, y = +f.y.value;
      const no = $('[data-gate-no]', gate);
      if (!d || !m || !y) { no.hidden = true; (!d ? f.d : !m ? f.m : f.y).focus(); return; }
      const born = new Date(y, m - 1, d), now = new Date();
      let age = now.getFullYear() - y;
      if (now < new Date(now.getFullYear(), m - 1, d)) age--;
      const real = born.getMonth() === m - 1 && born.getDate() === d;
      if (real && age >= MIN_AGE) { try { localStorage.setItem(KEY, '1'); } catch {} closeGate(); }
      else { no.hidden = false; }
    });
    gate.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = $$('select,button', gate).filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* same-page anchors: compute the target ourselves (Lenis + scroll-padding double-count) */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname) return;
    const id = url.hash.slice(1);
    const el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    e.preventDefault();
    closeMenu(false);
    const y = el ? el.getBoundingClientRect().top + scrollY - barH() - 12 : 0;
    scrollToY(Math.max(0, y));
    history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
  });

  /* ---------- bar border once scrolled ---------- */
  const bar = $('[data-bar]');
  const onScroll = () => bar && bar.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- mobile menu: focus the panel on a pointer open, the first link only for the keyboard ---------- */
  const burger = $('[data-burger]'), mm = $('[data-mobmenu]');
  if (mm) mm.tabIndex = -1;
  function openMenu(byKey) {
    mm.hidden = false; requestAnimationFrame(() => mm.classList.add('open'));
    burger.setAttribute('aria-expanded', 'true'); html.style.overflow = 'hidden'; lenis?.stop();
    (byKey ? $('a', mm) : mm)?.focus({ preventScroll: true });
  }
  function closeMenu(focus = true) {
    if (!mm || mm.hidden) return;
    mm.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); html.style.overflow = ''; lenis?.start();
    setTimeout(() => { if (!mm.classList.contains('open')) mm.hidden = true; }, 300);
    if (focus) burger.focus({ preventScroll: true });
  }
  burger?.addEventListener('click', e => burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu(e.detail === 0));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- reveals, tied to scroll position ---------- */
  if (!hasGsap || RM) { html.classList.add('no-anim'); }
  else {
    $$('.rv').forEach(el => gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 72%', scrub: 0.6 } }));
    $$('.rv-img').forEach(el => {
      const img = $('img', el);
      gsap.fromTo(el, { clipPath: 'inset(12% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 55%', scrub: 0.6 } });
      if (img) gsap.fromTo(img, { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 45%', scrub: 0.6 } });
    });
    const band = $('[data-band] img');
    if (band) gsap.fromTo(band, { scale: 1.14, yPercent: -4 }, { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: '[data-band]', start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
    /* the process rule fills as the eight steps pass */
    const rule = $('[data-rule]'), ledger = $('[data-ledger]');
    if (rule && ledger) gsap.fromTo(rule, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: ledger, start: 'top 70%', end: 'bottom 70%', scrub: 0.4 } });
  }

  /* ---------- collaborations: the sticky can follows the row ---------- */
  const stage = $('[data-deal-stage]');
  if (stage) {
    const rows = $$('[data-deal]'), meds = $$('[data-deal-media]', stage);
    const show = i => { rows.forEach((r, j) => r.classList.toggle('is-on', j === i)); meds.forEach((m, j) => m.classList.toggle('on', j === i)); };
    show(0);
    rows.forEach((r, i) => { r.addEventListener('pointerenter', () => FINE && show(i)); r.addEventListener('focus', () => show(i)); });
  }

  /* ---------- beers (cut-out renders): tilt toward the pointer, lift off the floor, light rolls across.
     The shade + sheen layers are made on first hover so a 236-tile archive does not carry 472 masked layers. ---------- */
  if (FINE && !RM) {
    const states = new WeakMap();
    const make = host => {
      const obj = $('[data-tilt]', host); if (!obj) return null;
      const lift = $('.pmedia__lift', obj), shadow = $('.pmedia__shadow', obj), img = $('img', lift);
      const url = `url(${img.currentSrc || img.src})`;
      const mk = cls => { const s = document.createElement('span'); s.className = cls; s.style.webkitMaskImage = url; s.style.maskImage = url; lift.appendChild(s); return s; };
      const st = { t: 0, h: 0, tx: 0, ty: 0, x: 0, y: 0, raf: 0, last: 0, lift, shadow, sheen: mk('sheen'), shade: mk('shade'), obj };
      st.tick = now => {
        const k = Math.min(1, ((now - (st.last || now)) || 16) / 1000 * 11); st.last = now;
        st.h += (st.t - st.h) * (st.t > st.h ? k : Math.min(1, k * 1.4)); st.x += (st.tx - st.x) * k; st.y += (st.ty - st.y) * k;
        st.lift.style.transform = `translate3d(0,${(-5 * st.h).toFixed(2)}%,0) rotateY(${(st.x * 16 * st.h).toFixed(2)}deg) rotateX(${(-st.y * 6 * st.h).toFixed(2)}deg) rotateZ(${(-st.x * 2.2 * st.h).toFixed(2)}deg)`;
        st.sheen.style.opacity = (st.h * 0.85).toFixed(3); st.sheen.style.backgroundPosition = `${(50 - st.x * 46).toFixed(1)}% 0`;
        st.shade.style.opacity = (st.h * 0.6).toFixed(3); st.shade.style.backgroundPosition = `${(50 - st.x * 30).toFixed(1)}% 0`;
        st.shadow.style.transform = `scale(${(1 - st.h * 0.2).toFixed(3)},${(1 - st.h * 0.12).toFixed(3)})`;
        st.shadow.style.opacity = (1 - st.h * 0.5).toFixed(3);
        const moving = Math.abs(st.t - st.h) > 0.002 || Math.abs(st.tx - st.x) > 0.002 || Math.abs(st.ty - st.y) > 0.002;
        st.raf = moving ? requestAnimationFrame(st.tick) : 0; if (!moving) st.last = 0;
      };
      return st;
    };
    const get = host => { let s = states.get(host); if (s === undefined) { s = make(host); states.set(host, s); } return s; };
    const hosts = '.btile__link, .bpage__media, .dmedia';
    const kick = s => { if (!s.raf) s.raf = requestAnimationFrame(s.tick); };
    document.addEventListener('pointermove', e => {
      const host = e.target.closest?.(hosts); if (!host) return;
      const s = get(host); if (!s) return;
      const r = s.obj.getBoundingClientRect();
      s.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      s.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      s.t = 1; kick(s);
    });
    document.addEventListener('pointerout', e => {
      const host = e.target.closest?.(hosts); if (!host || host.contains(e.relatedTarget)) return;
      const s = states.get(host); if (!s) return; s.t = 0; s.tx = 0; s.ty = 0; kick(s);
    });
  }

  /* the reveal triggers are measured positions: re-measure whenever the page height really changes (fonts, images, lazy layout),
     not only on load, so a heading never stays hidden above the viewport after a return scroll (iOS finding 6 Nov) */
  if (hasGsap) {
    let lastH = document.documentElement.scrollHeight, rt = 0;
    const re = () => { clearTimeout(rt); rt = setTimeout(() => { const h = document.documentElement.scrollHeight; if (Math.abs(h - lastH) > 2) { lastH = h; ScrollTrigger.refresh(); } }, 120); };
    addEventListener('load', () => { lastH = document.documentElement.scrollHeight; ScrollTrigger.refresh(); });
    if (window.ResizeObserver) new ResizeObserver(re).observe(document.body);
    document.fonts?.ready.then(re);
  }
})();
