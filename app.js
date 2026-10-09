/* ==========================================================
   Café Villa Lucía · Presentación: navegación y escenas 3D
   ========================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stage = $('#stage');
  const slides = $$('.slide');
  const TOTAL = 300;                       // 5 minutos

  /* ---------- lienzo fijo 1920 × 1080 escalado a la pantalla ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `scale(${s}) translate(-50%, -50%)`;
    window.__stageScale = s;
    document.documentElement.style.setProperty('--s', s);
  }
  fit(); window.addEventListener('resize', fit);
  slides.forEach(sl => $$('.reveal', sl).forEach((el, i) => el.style.setProperty('--i', i)));


  /* ---------- 3D ---------- */
  const S = window.Stand3D && (() => { try { return window.Stand3D.init($('#gl'), $('#labels')); } catch (e) { console.error(e); return null; } })();
  const V = {};
  let SHOTS_CAP = null;
  const VIEWP = { v1: 'v-1', v2: 'v-2', v3: 'v-3', v4: 'v-4' };
  if (S) {
    const L = S.LAYER;
    V.hero = S.view($('#v-hero'), { preset: 'hero', autoRotate: 0.035 });
    V.morfo = S.view($('#v-morfo'), { preset: 'morfo', autoRotate: 0.05 });
    V.montaje = S.view($('#v-montaje'), { preset: 'montaje' });
    // las cuatro vistas son fijas: terminan en la toma exacta que luego se lleva a imagen real
    V.v1 = S.view($('#v1'), { preset: VIEWP.v1, layers: [0], interactive: false });
    V.v2 = S.view($('#v2'), { preset: VIEWP.v2, layers: [0], interactive: false });
    V.v3 = S.view($('#v3'), { preset: VIEWP.v3, layers: [0], interactive: false });
    V.v4 = S.view($('#v4'), { preset: VIEWP.v4, layers: [0], interactive: false });
    ['v1', 'v2', 'v3', 'v4'].forEach(k => $('#' + k).classList.add('locked'));
    V.ex = S.view($('#v-explore'), { preset: 'iso', layers: [0] });
    S.cotaLabels(V.ex);

    // etiquetas de la abstracción morfológica (diapositiva 3)
    const NAMES = { pilares: 'Pilares en L y en T', alero: 'Alero', cubierta: 'Techo grande', ventana: 'Repisa para exhibir', vano: 'Hueco del inventario', muro: 'Bodega y mesón' };
    V.morfoLabels = {};
    const L3 = (x, y, z) => S.local(x, y, z);
    const ANCH = { pilares: L3(0.85, 1.05, 2.25), alero: L3(0.85, 2.0, 1.95), cubierta: L3(0.85, 2.45, 0.6),
      ventana: L3(1.637, 1.25, 0.69), vano: L3(1.637, 0.34, 0.673), muro: L3(2.9, 0.45, 1.312) };
    Object.keys(NAMES).forEach(g => { const lb = S.label(V.morfo, ANCH[g], `<span>${NAMES[g]}</span>`, 'pin'); lb.show = false; V.morfoLabels[g] = lb; });

    const f2 = v => v.toFixed(2).replace('.', ',');
    const st = S.stats;
    $('#restr').textContent = `Mide ${f2(st.W)} m de frente, ${f2(st.D)} m de fondo y ${f2(st.H)} m de alto. No hay que fijarlo al piso de la feria: lo arman dos personas y se lleva desarmado, en tablas.`;
    $('#asmTotal').textContent = st.piezas;
    $('#mPiezas').textContent = st.piezas;
    SHOTS_CAP = `${st.piezas} tablas, ni un tornillo`;
  } else {
    $('#nogl').hidden = false;
    $$('.glview').forEach(el => { const i = new Image(); i.src = 'assets/render_madre.jpg'; i.className = 'fallback-img'; el.appendChild(i); });
  }
  const setActive = list => { if (!S) return; Object.values(V).forEach(v => v && v.el && (v.active = list.includes(v))); };

  /* ---------- temporizadores de escena ---------- */
  let cur = -1, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  /* ---------- diapositiva 3: de la casa al stand ---------- */
  const morphItems = $$('#morphList li');
  let morphTimer = null, morphIdx = -1, morphManual = false;
  function morphShow(i) {
    morphIdx = i;
    morphItems.forEach((li, k) => li.classList.toggle('on', k === i));
    const g = i >= 0 ? morphItems[i].dataset.g : null;
    if (!S) return;
    S.highlight(g);
    Object.entries(V.morfoLabels).forEach(([k, lb]) => lb.show = k === g);
  }
  morphItems.forEach((li, i) => li.addEventListener('click', () => { morphManual = true; clearInterval(morphTimer); morphShow(morphIdx === i ? -1 : i); }));

  /* ---------- diapositiva 4: montaje y planos de encaje ---------- */
  const stepsEl = $('#asmSteps'), theater = $('.theater');
  if (S) { S.STEPS.forEach(() => stepsEl.appendChild(document.createElement('li'))); stepsEl.style.gridTemplateColumns = `repeat(${S.STEPS.length}, 1fr)`; }
  function hud(kick, text) { $('#asmKick').textContent = kick; $('#asmStep').textContent = text; }
  function asmUI(step, name) {
    $$('li', stepsEl).forEach((li, k) => { li.classList.toggle('done', k < step); li.classList.toggle('now', k === step); });
    hud('Armado', name);
  }
  // planos de detalle: cámara + piezas que se separan para mostrar cómo encajan (vectores en coordenadas del stand)
  const SHOTS = [
    { cam: 'despiece', kick: 'Despiece', cap: 'Todos los tableros, ni un tornillo', explode: 0.75, dur: 8.4 },
    { cam: 'c-meson', kick: 'Encaje 1', cap: 'El mesón cae sobre los dientes de la bodega', dur: 9,
      tease: { 'bod-frente': [0.34, 0], meson: [0.3, 0.35] } },
    { cam: 'c-cumbrera', kick: 'Encaje 2', cap: 'Los triángulos entran de lado y traban el techo', tease: { 'hastial-cu-i': 0.55, 'hastial-cu-d': 0.55 } },
    { cam: 'c-alero', kick: 'Encaje 3', cap: 'El alero se desarma al revés de como se arma', dur: 10.5,
      tease: { 'pil-t-alma': [0.8, 0], 'pil-t-ala': [0.5, 0.12], 'hastial-al-i': [0.55, 0.28], 'hastial-al-d': [0.55, 0.28], labio: [0.3, 0.45], 'alero-f': [0.36, 0.6], 'alero-t': [0.36, 0.76] } },
    { cam: 'c-T', kick: 'Encaje 4', cap: 'La T entra de frente y su diente encaja en el borde del alero', tease: { 'pil-t-alma': [0.46, 0], 'pil-t-ala': [0.22, 0.3] } }
  ];

  if (typeof SHOTS_CAP === 'string') SHOTS[0].cap = SHOTS_CAP;
  const cine = { on: false, i: 0, t: 0, raf: 0, last: 0 };
  const SHOT_T = 7.2, durOf = sh => sh.dur || SHOT_T;
  function cineStop() { cine.on = false; cancelAnimationFrame(cine.raf); theater.classList.remove('cine'); if (S) { S.tease(null); S.explode(0); } }
  function cineStart() {
    if (!S) return;
    cine.on = true; cine.i = -1; cine.t = 0; cine.last = performance.now(); theater.classList.add('cine');
    const tick = now => {
      if (!cine.on) return;
      const dt = Math.min(0.05, (now - cine.last) / 1000); cine.last = now; cine.t += dt;
      if (cine.i < 0 || cine.t >= durOf(SHOTS[cine.i])) {
        cine.t = 0; cine.i = (cine.i + 1) % SHOTS.length;
        const sh = SHOTS[cine.i];
        V.montaje.travel(sh.cam, 2.2); S.tease(null); S.explode(0);
        hud(sh.kick, sh.cap);
      }
      const sh = SHOTS[cine.i], t = cine.t, D = durOf(sh), m = (D - 3.2) / 2;   // viaje 2,2 s · abre · cierra · pausa
      const k = t < 2.2 ? 0 : t < 2.2 + m ? smooth((t - 2.2) / m) : t < 2.6 + m ? 1 : t < 2.6 + 2 * m ? 1 - smooth((t - 2.6 - m) / m) : 0;
      if (sh.explode) S.explode(k * sh.explode); else S.tease(sh.tease, k);
      cine.raf = requestAnimationFrame(tick);
    };
    cine.raf = requestAnimationFrame(tick);
  }
  const smooth = x => x * x * (3 - 2 * x);
  function playAssembly() {
    if (!S) return;
    cineStop(); S.flat(); S.color(1); S.brand(1);
    V.montaje.preset('montaje');
    $('#asmCount').textContent = 0; asmUI(-1, 'Piezas sin armar'); theater.classList.remove('built');
    later(() => S.assemble({
      onStep: (s, n) => asmUI(s, `${s + 1}. ${n}`),
      onProgress: (f, n) => { $('#asmCount').textContent = n; },
      onDone: () => {
        asmUI(99, 'Stand armado'); $('#asmCount').textContent = S.stats.piezas;
        V.montaje.travel('armado', 2.6); later(() => theater.classList.add('built'), 900); later(cineStart, 2800);
      }
    }), 700);
  }
  $('#asmPlay').addEventListener('click', playAssembly);
  // plano de corte: se abre encima de la diapositiva
  const plan = $('#planbox'), planF = $('iframe', plan);
  function openPlan() { if (planF.getAttribute('src') === 'about:blank') planF.src = 'plano_de_corte.html'; plan.hidden = false; }
  $('#asmPlan').addEventListener('click', openPlan);
  plan.addEventListener('click', e => { if (e.target !== planF) plan.hidden = true; });
  $('#asmFlat').addEventListener('click', () => { if (!S) return; cineStop(); S.flat(); V.montaje.preset('montaje'); asmUI(-1, 'Piezas sin armar'); $('#asmCount').textContent = 0; theater.classList.remove('built'); });
  if (S) V.montaje.el.addEventListener('userdrag', () => { if (cine.on) { cineStop(); hud('Libre', 'Arrastra para girar · ↻ para armarlo de nuevo'); } });

  /* ---------- diapositivas 5 y 6: del dibujo al stand pintado y a la imagen real ---------- */
  const REAL = {};
  ['1', '2', '3', '4'].forEach(n => {
    const exts = ['jpg', 'png'];
    const tryExt = i => { if (i >= exts.length) return; const im = new Image(); im.onload = () => { REAL[n] = im.src; const card = $(`.vcard[data-view="${n}"]`), el = $('.vreal', card); el.src = im.src; card.classList.add('has-real'); $('.vframe', card).addEventListener('click', () => card.classList.toggle('real')); }; im.onerror = () => tryExt(i + 1); im.src = `assets/vistas/vista_${n}.${exts[i]}`; };
    tryExt(0);
  });
  function playViews(keys) {
    const cards = keys.map(k => $(`.vcard[data-view="${k.slice(1)}"]`));
    cards.forEach(c => c.classList.remove('real'));
    if (!S) return;
    S.highlight(null); S.tease(null); S.explode(0); S.assembled();
    S.color(0); S.brand(0);
    setActive(keys.map(k => V[k]));
    // giran desde un ángulo distinto hasta la toma exacta mientras se dibujan y toman cuerpo
    keys.forEach((k, i) => V[k].flyIn(VIEWP[k], 3.6, i ? -1.5 : 1.5, 1.55, -0.32));
    S.draw(null, 0.055);
    later(() => { S.color(1, 1.4); }, 3900);
    later(() => { S.brand(1, 1.2); }, 4600);
    later(() => cards.forEach(c => { if (REAL[c.dataset.view]) c.classList.add('real'); }), 6400);
  }

  /* ---------- ciclo de vida de cada diapositiva ---------- */
  const s3 = slides[3];
  const SCENES = [
    { enter() { setActive([]); } },
    { enter() { setActive([]); } },
    { enter() { setActive([]); } },
    { enter() {
        // primera aparición del stand: en grande se dibuja y se pinta; luego se acomoda y aparece el proceso
        s3.classList.remove('ready'); morphManual = false; morphShow(-1);
        setActive([V.morfo]); if (!S) { s3.classList.add('ready'); return; }
        S.highlight(null); S.tease(null); S.explode(0); S.assembled(); S.color(0); S.brand(0);
        V.morfo.flyIn('grande', 3.4, 1.1, 1.35, -0.2);
        S.draw(null, 0.07);
        later(() => S.color(1, 1.6), 3500);
        later(() => S.brand(1, 1.2), 4200);
        later(() => { s3.classList.add('ready'); V.morfo.travel('morfo', 1.7); }, 6000);
        later(() => { if (morphManual) return; let k = 0; morphShow(0); morphTimer = setInterval(() => { k = (k + 1) % morphItems.length; morphShow(k); }, 2600); }, 8400);
      },
      leave() { clearInterval(morphTimer); morphShow(-1); s3.classList.remove('ready'); } },
    { enter() {
        setActive([V.montaje]); if (!S) return; S.highlight(null);
        V.montaje.preset('montaje', true); V.montaje.intro(1.15);
        S.color(1); S.brand(1); S.flat(); asmUI(-1, 'Piezas sin armar'); $('#asmCount').textContent = 0; theater.classList.remove('built');
        later(playAssembly, 1100);
      },
      leave() { cineStop(); if (S) S.assembled(); } },
    { enter() { playViews(['v1', 'v2']); } },
    { enter() { playViews(['v3', 'v4']); } },
    { enter() {
        setActive([V.hero]); if (!S) return;
        S.highlight(null); S.tease(null); S.explode(0); S.assembled(); S.color(1); S.brand(1);
        V.hero.flyIn('hero', 3.2, 1.0, 1.3, -0.15);
      } }
  ];


  const dots = $('#dots');
  slides.forEach((_, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', `Diapositiva ${i + 1}`); b.onclick = () => go(i); dots.appendChild(b); });

  const wipe = $('#wipe');
  let busy = false, queued = null;
  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    if (cur < 0) return show(i);
    if (busy) { queued = i; return; }
    busy = true;
    if (cur === 0 && i === 1) return flyIn();
    const fwd = i > cur, old = slides[cur];
    stage.style.setProperty('--dx-out', fwd ? '-90px' : '90px');
    stage.style.setProperty('--dx-in', fwd ? '120px' : '-120px');
    old.classList.add('leaving');                                   // sale empujada en el sentido de la cortina
    wipe.classList.toggle('back', !fwd);
    wipe.classList.remove('run'); void wipe.offsetWidth; wipe.classList.add('run');
    setTimeout(() => {
      // cambio tapado por la cortina: sin fundido entre una y otra
      stage.classList.add('cut');
      old.classList.remove('leaving');
      show(i);
      slides[i].classList.add('entering');
      void stage.offsetWidth;
      stage.classList.remove('cut');
      requestAnimationFrame(() => slides[i].classList.remove('entering'));   // se acomoda mientras se retira la cortina
    }, 420);
    setTimeout(() => { busy = false; wipe.classList.remove('run'); if (queued !== null && queued !== cur) { const q = queued; queued = null; go(q); } else queued = null; }, 920);
  }
  function flyIn() {
    const s1 = slides[1], lg = $('.s1-logo', s1), col = lg.offsetParent;
    const x = lg.offsetLeft + col.offsetLeft, y = lg.offsetTop + col.offsetTop, k = 560 / lg.offsetWidth;
    s1.style.setProperty('--fk', k);
    s1.style.setProperty('--fx', (960 - k * lg.offsetWidth / 2 - x) + 'px');
    s1.style.setProperty('--fy', (540 - k * lg.offsetHeight / 2 - y) + 'px');
    s1.classList.add('intro');
    stage.classList.add('cut'); show(1); void stage.offsetWidth; stage.classList.remove('cut');
    requestAnimationFrame(() => requestAnimationFrame(() => { s1.classList.add('fly'); s1.classList.remove('intro'); }));
    setTimeout(() => { s1.classList.remove('fly'); busy = false; if (queued !== null && queued !== cur) { const q = queued; queued = null; go(q); } else queued = null; }, 2600);
  }
  function show(i) {
    if (cur >= 0) {
      const o = slides[cur]; o.classList.add('snap'); o.classList.remove('active');
      SCENES[cur].leave && SCENES[cur].leave();
      void o.offsetWidth; o.classList.remove('snap');
    }
    timers.forEach(clearTimeout); timers = [];
    if (S) S.stopDraw();
    cur = i;
    slides[i].classList.add('active');
    document.body.dataset.slide = i;
    $$('button', dots).forEach((b, k) => b.classList.toggle('on', k === i));
    $('#tbIdx').textContent = String(i).padStart(2, '0');
    SCENES[i].enter();
    history.replaceState(null, '', '#' + i);
  }

  /* ---------- cronómetro ---------- */
  let left = TOTAL, run = false, tick = null;
  const tEl = $('#timer'), tTxt = $('#timerTxt');
  const fmt = s => `${s < 0 ? '−' : ''}${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`;
  function paint() {
    tTxt.textContent = fmt(left);
    tEl.classList.toggle('warn', left <= 120 && left > 60);
    tEl.classList.toggle('last', left <= 60);
    tEl.classList.toggle('over', left < 0);
    tEl.classList.toggle('run', run);
  }
  function toggleTimer() { run = !run; clearInterval(tick); if (run) tick = setInterval(() => { left--; if (left === 0) chime(); paint(); }, 1000); paint(); }
  function resetTimer() { run = false; clearInterval(tick); left = TOTAL; paint(); }
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [660, 880].forEach((f, k) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + k * 0.25);
        g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + k * 0.25 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + k * 0.25 + 0.9);
        o.start(ctx.currentTime + k * 0.25); o.stop(ctx.currentTime + k * 0.25 + 1);
      });
    } catch (e) { /* sin audio */ }
  }
  tEl.addEventListener('click', toggleTimer);
  paint();


  /* ---------- controles: se ocultan solos; pantalla completa limpia ---------- */
  let idleT = null;
  const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 2600); };
  ['mousemove', 'pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, wake)); wake();
  const toggleFull = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
  document.addEventListener('fullscreenchange', () => document.body.classList.toggle('fs', !!document.fullscreenElement));
  $('#btnFull').addEventListener('click', toggleFull);

  /* ---------- lightbox ---------- */
  const lb = $('#lightbox');
  document.addEventListener('click', e => {
    const img = e.target.closest('[data-zoom]') || (e.target.closest('figure.ph, figure.sk') && e.target.closest('figure').querySelector('[data-zoom]'));
    if (img) { $('img', lb).src = img.src; lb.hidden = false; }
  });
  lb.addEventListener('click', () => lb.hidden = true);

  /* ---------- exportar la toma exacta de cada vista ---------- */
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  const CAPNAMES = { v1: 'vista_1_isometrica.png', v2: 'vista_2_frontal.png', v3: 'vista_3_lateral.png', v4: 'vista_4_posterior.png' };
  $$('.cap-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); if (!S) return;
    const v = V[b.dataset.cap];
    v.preset(VIEWP[b.dataset.cap], true); v.update(0);                 // toma final exacta
    download(S.capture(v, 2400, 0x16110d, 4 / 3), CAPNAMES[b.dataset.cap]);   // 2400 × 1800, 4:3
  }));

  /* ---------- explorador ---------- */
  const ex = $('#explorer');
  let exPrev = null;
  function openExplorer() {
    if (!S || !ex.hidden) return;
    cineStop();
    ex.hidden = false; document.body.classList.add('exploring');
    exPrev = Object.values(V).filter(v => v && v.active);
    S.wedge(false); S.highlight(null); S.stopDraw(); S.assembled(); S.color(+$('#exColor').classList.contains('on')); S.brand(+$('#exBrand').classList.contains('on'));
    setActive([V.ex]); V.ex.preset('render', true); V.ex.intro(1.3);
  }
  function closeExplorer() {
    if (ex.hidden) return;
    ex.hidden = true; document.body.classList.remove('exploring');
    S.explode(0); $('#exExp').value = 0; $('#exExpOut').textContent = '0 %';
    S.wedge(false); setActive(exPrev || []);
    const c = cur; cur = -1; show(c);
  }
  $('#btnExplore').addEventListener('click', openExplorer);
  $('#exClose').addEventListener('click', closeExplorer);
  $$('#exCams button').forEach(b => b.addEventListener('click', () => { $$('#exCams button').forEach(x => x.classList.toggle('on', x === b)); V.ex.preset(b.dataset.p); }));
  $('#exDraw').addEventListener('click', () => { S.explode(0); $('#exExp').value = 0; S.draw(null, 0.06); });
  $('#exAsm').addEventListener('click', () => { $('#exExp').value = 0; S.explode(0); S.flat(); V.ex.preset('montaje'); setTimeout(() => S.assemble({ onDone: () => V.ex.preset('iso') }), 700); });
  $('#exWedge').addEventListener('click', e => { const on = !e.target.classList.contains('on'); e.target.classList.toggle('on', on); S.wedge(on); if (on) V.ex.preset('c-meson'); });
  $('#exExp').addEventListener('input', e => { const v = +e.target.value; S.explode(v / 100 * 1.6); $('#exExpOut').textContent = v + ' %'; });
  $$('#exLayers button').forEach(b => b.addEventListener('click', () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); V.ex.toggleLayer(+b.dataset.l, on); }));
  $('#exColor').addEventListener('click', e => { const on = !e.target.classList.contains('on'); e.target.classList.toggle('on', on); S.color(on, 0.8); });
  $('#exBrand').addEventListener('click', e => { const on = !e.target.classList.contains('on'); e.target.classList.toggle('on', on); S.brand(on, 0.6); });
  $('#exCap').addEventListener('click', () => download(S.capture(V.ex, 2800), 'stand_villa_lucia.png'));

  /* ---------- teclado ---------- */
  document.addEventListener('keydown', e => {
    if (e.target.matches('input')) return;
    const k = e.key;
    if (!lb.hidden && (k === 'Escape' || k === ' ')) { lb.hidden = true; e.preventDefault(); return; }
    if (!plan.hidden) { if (k === 'Escape' || k.toLowerCase() === 'p') plan.hidden = true; return; }
    if (k.toLowerCase() === 'p' && cur === 4) { openPlan(); return; }
    if (!ex.hidden) { if (k === 'Escape' || k.toLowerCase() === 'e') closeExplorer(); return; }
    if (k === 'ArrowRight' || k === 'PageDown') { go(cur + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { go(cur - 1); e.preventDefault(); }
    else if (k.toLowerCase() === 'e') openExplorer();
    else if (k.toLowerCase() === 'f') toggleFull();
    else if (k.toLowerCase() === 'm' && cur === 4) playAssembly();
    else if (/^[0-7]$/.test(k)) go(+k);
  });

  const fromHash = () => Math.max(0, Math.min(slides.length - 1, parseInt(location.hash.slice(1), 10) || 0));
  window.addEventListener('hashchange', () => go(fromHash()));
  go(fromHash());
})();
