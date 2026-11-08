/* The number walk (Ölverk's spring walk, re-aimed). Desktop: one pinned stage scrubbed over the whole section.
   It OPENS on the newest numbered beer (Nr. 117, standing on its crown-cap coaster, the room tinted in its ink) and holds there a beat.
   Act 1 (p 0 to .84): the walk. One beer at a time stands in focus; the next ones queue small on the right and the room takes
          each beer's ink; the copy crossfades as a pure function of focus. Hover tilts a beer; click walks to it.
   Act 2 (p > .86): the beers return to a line-up and the closing line arrives.
   Scroll state is a pure function of progress (fully reversible). Hover is a separate damped layer:
   the beer tilts toward the pointer, lifts off its floor shadow, light rolls across the label.
   Coasters live on their own layer under every beer, so one never paints over a neighbour.
   Phones and reduced motion get the flat layout from the CSS instead (newest number first, then a scroll-snap row). */
(() => {
  const walk = document.querySelector('[data-walk]');
  if (!walk) return;
  const { RM, hasGsap, scrollToY, lenis } = window.BRG || {};
  const wide = matchMedia('(min-width: 900px)');
  /* pinned on wide screens, flat on narrow ones: follow the width in BOTH directions, also when this run bails out below
     (a window narrowed under 900 px and widened again used to stay in the phone layout until a manual reload) */
  wide.addEventListener('change', () => location.reload());
  if (RM || !hasGsap || !wide.matches) return;

  const B = window.BORG, S = B.walk, N = S.length;
  const stage = walk.querySelector('[data-stage]');
  const beers = [...walk.querySelectorAll('[data-beer]')];
  const plates = [...walk.querySelectorAll('[data-plate]')];
  const objs = beers.map(s => s.querySelector('.beer__obj'));
  const lifts = beers.map(s => s.querySelector('.beer__lift'));
  const sheens = beers.map(s => s.querySelector('.sheen'));
  const shades = beers.map(s => s.querySelector('.shade'));
  const shadows = beers.map(s => s.querySelector('.beer__shadow'));
  const copies = [...walk.querySelectorAll('[data-copy]')];
  const outro = walk.querySelector('[data-outro]');
  const index = walk.querySelector('.walk__index'), idxBtns = [...index.querySelectorAll('button')];
  walk.classList.add('is-pinned');
  /* the closing line-up's floor line and one label under each beer (made here: they only exist in the pinned layout) */
  const floor = document.createElement('i'); floor.className = 'walk__floor'; floor.setAttribute('aria-hidden', 'true'); stage.appendChild(floor);
  const labs = S.map(s => { const l = document.createElement('span'); l.className = 'walk__lab'; l.setAttribute('aria-hidden', 'true'); l.innerHTML = `<b>Nr.\u00a0${s.n}</b><span>${s.name}</span>`; stage.appendChild(l); return l; });
  objs.forEach((o, i) => { o.setAttribute('role', 'button'); o.tabIndex = 0; o.setAttribute('aria-label', `${S[i].name}, Nr. ${S[i].n}, ${S[i].style} ${S[i].abv}: ${B.show}`); });

  /* each beer's own measured box inside its 1:1 art square (fractions of S) */
  const G = S.map(s => ({ cx: s.box[0] + s.box[2] / 2, cy: s.box[1] + s.box[3] / 2, half: s.box[3] / 2, w: s.box[2] }));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const inks = S.map(s => hex(s.ink));
  const GUFA = [243, 244, 241];

  let W, H, SZ, floorF, floorR;
  const rowK = [], rowX = [], rowH = [];
  const ratio = G.map(g => g.w / (2 * g.half)), tall = ratio.map(r => r < 0.5);
  function measure() {
    W = innerWidth; H = innerHeight;
    SZ = Math.min(H * 0.98, W * 0.72);          // the art square: the focused beer stands S.vh of the viewport tall (box.h * SZ)
    floorF = H * 0.88;                           // the floor every beer stands on in the walk
    beers.concat(plates).forEach(s => s.style.setProperty('--S', SZ + 'px'));
    /* the closing line-up: five beers on ONE floor line, evenly spaced, never overlapping, fully inside the viewport.
       Pair cans share one height (hp), a bottle stands 1.55 times taller, as on a real shelf. */
    const gut = Math.max(20, Math.min(64, W * 0.04)), gap = Math.max(14, W * 0.026);
    const fw = ratio.map((r, i) => (tall[i] ? 1.55 : 1) * r), sum = fw.reduce((a, b) => a + b, 0);
    floorR = H * 0.86;
    const textBottom = outro.offsetTop + outro.offsetHeight;                       // the closing text sits above the beers: never let a bottle reach it
    const hp = Math.max(70, Math.min((W - 2 * gut - gap * (N - 1)) / sum, H * 0.325, (floorR - textBottom - 20) / 1.55));
    let x = (W - (sum * hp + gap * (N - 1))) / 2;
    for (let i = 0; i < N; i++) {
      const h = (tall[i] ? 1.55 : 1) * hp, w = h * ratio[i];
      rowH[i] = h; rowK[i] = h / (2 * G[i].half * SZ); rowX[i] = x + w / 2; x += w + gap;
    }
    floor.style.left = gut + 'px'; floor.style.right = gut + 'px'; floor.style.top = floorR + 'px';
    labs.forEach((l, i) => { l.style.left = rowX[i].toFixed(1) + 'px'; l.style.top = (floorR + 14).toFixed(1) + 'px'; });
  }

  /* the closing line-up: computed in measure() */
  function rowPos(i) { return { x: rowX[i], y: floorR - G[i].half * SZ * rowK[i], k: rowK[i], z: 10 }; }
  /* the walk: the focused beer at 70% width, the next ones queue small on the right, past ones leave left */
  function walkPos(i, f) {
    const d = i - f;
    let x, k, o;
    if (d >= 0) {
      const a = clamp(d), b = clamp(d - 1, 0, 3);
      x = W * 0.70 + a * W * 0.19 + b * W * 0.06;
      k = 1 - a * 0.56 - b * 0.06;
      o = 1 - clamp(d - 2.2, 0, 1);
    } else {
      x = W * 0.70 + d * W * 0.26;
      k = 1 + d * 0.25;
      o = clamp(1 + d * 1.7);
    }
    return { x, y: floorF - G[i].half * SZ * k, k, o, z: 20 - Math.round(Math.abs(d) * 2), d };
  }
  const place = (el, i, x, y, k) => { el.style.transform = `translate3d(${(x - G[i].cx * SZ * k).toFixed(1)}px,${(y - G[i].cy * SZ * k).toFixed(1)}px,0) scale(${k.toFixed(4)})`; };

  /* hover layer: target (t*) and damped (h, x, y) per beer */
  const hv = S.map(() => ({ t: 0, h: 0, tx: 0, ty: 0, x: 0, y: 0 }));
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  objs.forEach((o, i) => {
    if (FINE) {
      o.addEventListener('pointermove', e => {
        const r = o.getBoundingClientRect();
        hv[i].tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        hv[i].ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        hv[i].t = 1;
      });
      o.addEventListener('pointerleave', () => { hv[i].t = 0; hv[i].tx = 0; hv[i].ty = 0; });
    }
    o.addEventListener('focus', () => { hv[i].t = 1; hv[i].tx = 0.45; hv[i].ty = -0.2; });
    o.addEventListener('blur', () => { hv[i].t = 0; hv[i].tx = 0; hv[i].ty = 0; });
    o.addEventListener('click', () => goto(i));
    o.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto(i); } });
  });

  let target = 0, p = -1, last = -1;
  const RATE = lenis ? 15 : 9;   // Lenis already smooths the scroll; don't damp it twice
  const st = ScrollTrigger.create({ trigger: walk, start: 'top top', end: 'bottom bottom', onUpdate: s => { target = s.progress; } });
  new IntersectionObserver(([e]) => walk.classList.toggle('is-away', !e.isIntersecting)).observe(walk);
  const WALK_END = 0.84;
  const fOf = pp => { const raw = clamp(pp / WALK_END) * (N - 1); const fi = Math.min(N - 2, Math.floor(raw)); return fi + sstep(0.22, 0.78, raw - fi); };
  function goto(i) {
    const t = (i / (N - 1)) * WALK_END;
    scrollToY(st.start + (i === N - 1 ? t - 0.01 : t + 0.004) * (st.end - st.start));
  }

  function frame(dt) {
    p = p < 0 ? target : p + (target - p) * Math.min(1, (dt || 16) / 1000 * RATE);

    /* hover damping: springy follow, quicker release */
    const hs = Math.min(1, (dt || 16) / 1000 * 11);
    let hoverMoving = false;
    hv.forEach(v => {
      v.h += (v.t - v.h) * (v.t > v.h ? hs : Math.min(1, hs * 1.4));
      v.x += (v.tx - v.x) * hs; v.y += (v.ty - v.y) * hs;
      if (Math.abs(v.t - v.h) > 0.002 || Math.abs(v.tx - v.x) > 0.002 || Math.abs(v.ty - v.y) > 0.002) hoverMoving = true;
    });
    if (Math.abs(p - last) < 1e-5 && !hoverMoving) return;
    last = p;

    const a3 = sstep(0.86, 0.95, p);                                    // beers: walk -> line-up
    const cOut = sstep(0.84, 0.885, p);                                 // the copy leaves before the outro
    const aOut = sstep(0.895, 0.95, p);
    const qIn = sstep(0.0, 0.07, p);                                    // the queued beers appear as soon as the page moves, never before
    const f = fOf(p);
    const live = 1 - a3, copyLive = 1 - cOut;
    const hoverMax = Math.max(...hv.map(v => v.h));

    beers.forEach((el, i) => {
      const r = rowPos(i), w = walkPos(i, f), v = hv[i];
      const x = lerp(w.x, r.x, a3), y = lerp(w.y, r.y, a3), k = lerp(w.k, r.k, a3);
      const dim = a3 * hoverMax * (1 - v.h) * 0.35;                    // on the line-up, the others step back
      place(el, i, x, y, k);
      el.style.opacity = lerp(w.o * (w.d > 0 ? qIn : 1), 1, a3).toFixed(3);
      el.style.filter = dim > 0.004 ? `saturate(${(1 - dim * 1.6).toFixed(3)}) brightness(${(1 + dim * 0.12).toFixed(3)}) contrast(${(1 - dim * 0.4).toFixed(3)})` : '';
      el.style.zIndex = Math.round(lerp(w.z, r.z, a3)) + (v.h > 0.5 ? 30 : 0);

      /* the coaster: scroll-driven, plus a bloom while its beer is hovered on the line-up */
      const pScroll = clamp(1 - Math.abs(i - f) * 1.8) * live;
      place(plates[i], i, x, y, k * (1 + v.h * (0.045 + 0.06 * a3)));
      plates[i].style.opacity = Math.min(1, Math.max(pScroll, v.h * 0.95 * a3)).toFixed(3);

      /* the beer itself: tilt toward the pointer, lift off the floor, light rolls across */
      lifts[i].style.transform = `translate3d(0,${(-4.2 * v.h).toFixed(2)}%,0) rotateY(${(v.x * 15 * v.h).toFixed(2)}deg) rotateX(${(-v.y * 6 * v.h).toFixed(2)}deg) rotateZ(${(-v.x * 1.4 * v.h).toFixed(2)}deg)`;
      sheens[i].style.opacity = (v.h * 0.85).toFixed(3);
      sheens[i].style.backgroundPosition = `${(50 - v.x * 46).toFixed(1)}% 0`;
      shades[i].style.opacity = (v.h * 0.7).toFixed(3);
      shades[i].style.backgroundPosition = `${(50 - v.x * 30).toFixed(1)}% 0`;
      shadows[i].style.transform = `scale(${(1 - v.h * 0.16).toFixed(3)},${(1 - v.h * 0.1).toFixed(3)})`;
      shadows[i].style.opacity = (1 - v.h * 0.45).toFixed(3);
    });

    const c0 = inks[Math.floor(f)], c1 = inks[Math.min(N - 1, Math.floor(f) + 1)], m = f - Math.floor(f);
    const ink = c0.map((v, j) => lerp(v, c1[j], m));
    const tint = 0.11 * live;   // the room takes the beer's ink: written straight to the stage, no inherited CSS vars
    stage.style.backgroundColor = `rgb(${GUFA.map((g, j) => Math.round(lerp(g, ink[j], tint))).join(',')})`;

    copies.forEach((c, i) => {
      const o = clamp(1 - Math.abs(i - f) * 2.6) * copyLive;
      c.style.opacity = o.toFixed(3);
      c.style.transform = `translateY(${((i - f) * 40).toFixed(1)}px)`;
      c.classList.toggle('on', o > 0.5);
      c.setAttribute('aria-hidden', o > 0.5 ? 'false' : 'true');
    });
    outro.style.opacity = aOut.toFixed(3);
    outro.style.transform = `translateY(${((1 - aOut) * 30).toFixed(1)}px)`;
    floor.style.opacity = a3.toFixed(3); labs.forEach(l => { l.style.opacity = a3.toFixed(3); });
    outro.style.pointerEvents = aOut > 0.5 ? 'auto' : 'none';
    outro.style.visibility = aOut < 0.01 ? 'hidden' : '';
    const idxO = sstep(0.02, 0.08, p) * copyLive;                       // the index appears once the page starts moving
    index.style.opacity = idxO.toFixed(3);
    index.style.pointerEvents = idxO > 0.5 ? 'auto' : 'none';
    const act = Math.round(f);
    idxBtns.forEach((b, i) => { b.classList.toggle('on', i === act); b.setAttribute('aria-current', i === act ? 'true' : 'false'); });
  }

  idxBtns.forEach((b, i) => b.addEventListener('click', () => goto(i)));
  measure();
  gsap.ticker.add((t, dt) => frame(dt));
  addEventListener('resize', () => { measure(); last = -1; ScrollTrigger.refresh(); });
})();
