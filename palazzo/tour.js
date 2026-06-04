/* ===================================================================
   Palazzo Aventino — production engine
   The designer's v3 shell (naming · conjuring beat · worlds · styles · chrome)
   wired to the REAL stack: Photo Sphere Viewer over Skybox-AI panoramas,
   conjured on demand via /api/conjure → /api/status → /api/pano.
   =================================================================== */
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';

const el = id => document.getElementById(id);
const root = document.documentElement;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = arr => arr[(Math.random() * arr.length) | 0];
const coin = p => Math.random() < p;
const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
const roman = n => ROMAN[n] || ('' + n);
const STYLE_ID = { photoreal: 119, maximal: 122, cinematic: 102 };

/* ---- naming system (designer's proposal, kept verbatim) ---- */
const MATERIALS = {
  palazzo:[
    { it:"d'Ambra",it_:"Ambra",       en:"Amber",     mat:"#c79a4b", m2:"#ecc878", deep:"#6e4e1c" },
    { it:"di Lapis",it_:"Lapis",      en:"Lapis",     mat:"#3a5ca8", m2:"#6f93d6", deep:"#1e2f5e" },
    { it:"di Porfido",it_:"Porfido",  en:"Porphyry",  mat:"#7e3445", m2:"#b05a6c", deep:"#481c27" },
    { it:"di Malachite",it_:"Malachite", en:"Malachite", mat:"#1f7a5a", m2:"#52b189", deep:"#10402f" },
    { it:"d'Avorio",it_:"Avorio",     en:"Ivory",     mat:"#d8c8a6", m2:"#f1e6cc", deep:"#8a795a" },
    { it:"di Corallo",it_:"Corallo",  en:"Coral",     mat:"#bf5640", m2:"#e2856e", deep:"#6f2c1e" },
    { it:"d'Oro",it_:"Oro",           en:"Gold",      mat:"#c79a4b", m2:"#f0cd7e", deep:"#7a571f" },
    { it:"d'Alabastro",it_:"Alabastro", en:"Alabaster", mat:"#cdbfae", m2:"#ece1d2", deep:"#857665" },
    { it:"di Granato",it_:"Granato",  en:"Garnet",    mat:"#8a2f3c", m2:"#bb5560", deep:"#4d1820" },
    { it:"di Cedro",it_:"Cedro",      en:"Cedar",     mat:"#9a7b3e", m2:"#c2a061", deep:"#574117" },
    { it:"di Madreperla",it_:"Madreperla", en:"Pearl", mat:"#b9bcc4", m2:"#e7e9ee", deep:"#7c7f88" },
    { it:"di Turchese",it_:"Turchese", en:"Turquoise", mat:"#2f8f93", m2:"#62bcbf", deep:"#16494b" },
  ],
  fuori:[
    { it:"dei Limoni",it_:"Limoni",   en:"Lemons",    mat:"#c9a83a", m2:"#e8cf63", deep:"#7e6a18" },
    { it:"dei Cipressi",it_:"Cipressi", en:"Cypress", mat:"#3c5238", m2:"#5e7a52", deep:"#22311f" },
    { it:"del Glicine",it_:"Glicine", en:"Wisteria",  mat:"#7c6aa8", m2:"#a594cf", deep:"#473a66" },
    { it:"del Travertino",it_:"Travertino", en:"Travertine", mat:"#b6a583", m2:"#d8c9a8", deep:"#7c6e52" },
    { it:"del Melograno",it_:"Melograno", en:"Pomegranate", mat:"#a83c33", m2:"#cf6457", deep:"#5f1f19" },
    { it:"degli Aranci",it_:"Aranci", en:"Oranges",   mat:"#c87a2e", m2:"#e6a05a", deep:"#7a4716" },
    { it:"delle Rose",it_:"Rose",     en:"Roses",     mat:"#b65068", m2:"#d97f93", deep:"#6b2839" },
    { it:"degli Ulivi",it_:"Ulivi",   en:"Olives",    mat:"#7c8450", m2:"#a3aa74", deep:"#4a4f2c" },
    { it:"delle Fontane",it_:"Fontane", en:"Fountains", mat:"#5a8aa0", m2:"#86b3c6", deep:"#315260" },
    { it:"dei Pini",it_:"Pini",       en:"Pines",     mat:"#46583c", m2:"#6b7e58", deep:"#283320" },
  ],
};
const ARCH = {
  palazzo:[
    { it:"La Sala", en:"Hall", kind:"a grand columned hall lined with gilded arches" },
    { it:"Il Salone", en:"Great Hall", kind:"a vast reception hall with a soaring vault" },
    { it:"La Galleria", en:"Gallery", kind:"a long mirrored gallery hung with lamps" },
    { it:"La Camera", en:"Chamber", kind:"an intimate chamber with silk-draped walls" },
    { it:"Il Gabinetto", en:"Cabinet", kind:"a small jewelled cabinet of curiosities" },
    { it:"La Sala del Trono", en:"Throne Room", kind:"a throne room beneath a canopy of gold", noMat:true, rare:true },
    { it:"La Sala a Cupola", en:"Domed Hall", kind:"a domed hall under a carved muqarnas cupola" },
    { it:"Il Bagno", en:"Bath", kind:"a marble bath with a sunken pool and steam" },
    { it:"La Biblioteca", en:"Library", kind:"a library of carved cedar shelves and gold" },
    { it:"La Sala dei Divani", en:"Divan Room", kind:"a salon of silk divans and lattice screens" },
    { it:"L'Anticamera", en:"Antechamber", kind:"an ornate antechamber with a fountain niche" },
  ],
  fuori:[
    { it:"Il Cortile", en:"Court", kind:"an arcaded courtyard around a tiered fountain" },
    { it:"Il Giardino", en:"Garden", kind:"a formal Italian garden of clipped hedges and statues" },
    { it:"La Loggia", en:"Loggia", kind:"an arcaded loggia overlooking the city" },
    { it:"Il Viale", en:"Avenue", kind:"a cypress-lined avenue to the gates" },
    { it:"La Terrazza", en:"Terrace", kind:"a rooftop terrace at golden dusk over Rome" },
    { it:"La Peschiera", en:"Water Garden", kind:"a still water garden with reflecting basins" },
    { it:"Il Belvedere", en:"Belvedere", kind:"a belvedere framing the dome of St. Peter's" },
    { it:"La Piazzetta", en:"Little Square", kind:"a small sunlit piazza with a baroque fountain" },
  ],
};
const DESC = {
  palazzo:[
    "Walk deeper and the palace offers another hall, conjured as you go.",
    "Gilt, shadow, and held light — no two visits arrange themselves alike.",
    "The cornices were finished an instant before you arrived.",
    "Lanterns answer the marble; the room was waiting to be named.",
  ],
  fuori:[
    "The grounds open onto another court, garden, or view over Rome.",
    "Cypress and water; the afternoon laid out long across the stone.",
    "Beyond the loggia the city softens into a warm distance.",
    "Citrus and travertine, arranged for a single unhurried hour.",
  ],
};

/* ---- the opening: the first rooms of each world are PRE-MADE (committed 4K webps).
   They cost zero Skybox credits and load instantly. Live generation only begins once a
   visitor walks PAST the opening ("build 360° in advance for the rest"). ---- */
const STATIC = {
  palazzo: [
    { panorama:'img/seed-palazzo.webp', it:"L'Atrio",      en:"The Atrium",          arch:{ it:"L'Atrio", en:"Atrium", noMat:true }, mat:MATERIALS.palazzo[6], desc:DESC.palazzo[0] },
    { panorama:'img/salone.webp',       it:"Il Salone",     en:"The Great Hall",      arch:ARCH.palazzo[1],                            mat:MATERIALS.palazzo[0], desc:DESC.palazzo[1] },
    { panorama:'img/scalone.webp',      it:"Lo Scalone",    en:"The Grand Staircase", arch:{ it:"Lo Scalone", en:"Staircase" },        mat:MATERIALS.palazzo[2], desc:DESC.palazzo[2] },
    { panorama:'img/biblioteca.webp',   it:"La Biblioteca", en:"The Library",         arch:ARCH.palazzo[8],                            mat:MATERIALS.palazzo[9], desc:DESC.palazzo[3] },
  ],
  fuori: [
    { panorama:'img/seed-fuori.webp', it:"Il Cortile d'Onore", en:"The Court of Honour", arch:{ it:"Il Cortile", en:"Court", noMat:true }, mat:MATERIALS.fuori[3], desc:DESC.fuori[0] },
    { panorama:'img/facade.webp',     it:"La Piazzetta",       en:"The Forecourt",       arch:ARCH.fuori[7],                               mat:MATERIALS.fuori[5], desc:DESC.fuori[1] },
    { panorama:'img/terrazza.webp',   it:"La Terrazza",        en:"The Terrace",         arch:ARCH.fuori[4],                               mat:MATERIALS.fuori[8], desc:DESC.fuori[2] },
    { panorama:'img/giardino.webp',   it:"Il Giardino",        en:"The Garden",          arch:ARCH.fuori[1],                               mat:MATERIALS.fuori[1], desc:DESC.fuori[3] },
  ],
};
const staticRoom = (world, def) => ({ world, ready:true, isStatic:true, ...def });

function makeRoom(world){
  const archs = ARCH[world], mats = MATERIALS[world];
  const a = coin(0.08) ? (archs.find(x => x.rare) || rand(archs)) : rand(archs.filter(x => !x.rare));
  const m = rand(mats);
  return {
    it: a.noMat ? a.it : `${a.it} ${m.it}`,
    en: a.noMat ? a.en : `The ${m.en} ${a.en}`,
    mat: m, arch: a, world, desc: rand(DESC[world]), panorama: null,
  };
}

/* ---- state ---- */
const CTX = {
  palazzo: { label:'Il Palazzo', rooms:[], cursor:0, sIdx:1, seed:'img/seed-palazzo.webp', queue:[], houseSeed:0 },
  fuori:   { label:'Fuori',      rooms:[], cursor:0, sIdx:1, seed:'img/seed-fuori.webp', queue:[], houseSeed:0 },
};
let ctx = 'palazzo', viewer = null, markers = null, busy = false, hintShown = false, shownPano = null;
let pendingExit = null;   // {yaw,pitch} the visitor double-clicked toward → the direction we walk
let exitYaw = 0;          // heading of the current room's single exit (the ground arrow)
const EXIT_PITCH = -0.55; // the exit arrow sits on the floor ahead
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

/* Place the single "walk on" exit arrow on the floor at the given heading. */
function placeExit(yaw){
  exitYaw = yaw;
  if (!markers) return;
  try { markers.clearMarkers(); } catch (e) {}
  try {
    markers.addMarker({
      id: 'exit', position: { yaw, pitch: EXIT_PITCH },
      html: '<div class="exit-arrow" role="button" aria-label="Walk on"></div>',
      anchor: 'center center', scale: { zoom: [0.55, 1.5] },
      tooltip: { content: 'Walk on', position: 'top center' },
    });
  } catch (e) {}
}
function clearExit(){ if (markers){ try { markers.clearMarkers(); } catch (e) {} } }

function seedWorlds(){
  CTX.palazzo.rooms = [ staticRoom('palazzo', STATIC.palazzo[0]) ]; CTX.palazzo.sIdx = 1;
  CTX.fuori.rooms   = [ staticRoom('fuori',   STATIC.fuori[0]) ];   CTX.fuori.sIdx = 1;
  // one fixed seed per world for this visit → every conjured room shares a coherent look,
  // so the palace reads as ONE continuous building rather than a slideshow of styles.
  CTX.palazzo.houseSeed = 8000000 + (Math.random() * 1900000 | 0);
  CTX.fuori.houseSeed   = 8000000 + (Math.random() * 1900000 | 0);
}
/* Warm the browser cache for a world's pre-made rooms so their crossfades are instant. */
function preloadStatics(world){ STATIC[world].forEach(d => preloadPano(d.panorama)); }

/* ---- viewer ---- */
function initViewer(){
  viewer = new Viewer({
    container: 'stage',
    panorama: CTX.palazzo.seed,
    navbar: false,
    defaultZoomLvl: 5, minFov: 35, maxFov: 80,
    moveInertia: true, mousewheel: true, loadingTxt: '',
    plugins: [[MarkersPlugin, {}]],
  });
  markers = viewer.getPlugin(MarkersPlugin);
  shownPano = CTX.palazzo.seed;
  viewer.addEventListener('ready', () => {
    document.documentElement.style.setProperty('--introbg', `url('${CTX.palazzo.seed}')`);
  }, { once: true });
  // clicking the exit arrow walks on
  if (markers) markers.addEventListener('select-marker', () => { if (!busy && !el('topbar').classList.contains('hidden')) walkThroughExit(); });
  // SINGLE-CLICK anywhere walks you on toward the spot you clicked — the next room is
  // conjured in that direction, so clicking the way you want to go just works. (Dragging
  // to look around does not emit a click, so you can still explore freely. Wheel to zoom.)
  viewer.addEventListener('click', (e) => {
    if (busy || el('topbar').classList.contains('hidden')) return;
    const d = e && e.data; if (!d) return;
    pendingExit = { yaw: d.yaw, pitch: Math.max(-0.3, Math.min(0.3, d.pitch || 0)) };
    walkOn();
  });
}
async function show(room, exit){
  if (room.panorama && room.panorama !== shownPano){
    shownPano = room.panorama;
    // never throw / never hard-hang: race the transition against a safety timeout, swallow errors
    try {
      if (exit){
        // step toward the chosen exit so it reads as walking through it, then arrive facing that heading
        const pitch = Math.max(-0.25, Math.min(0.25, exit.pitch || 0));
        try { await viewer.animate({ yaw: exit.yaw, pitch, zoom: 18, speed: '12rpm' }); } catch (e) {}
      }
      await Promise.race([
        viewer.setPanorama(room.panorama, {
          transition: true, showLoader: false, zoom: 5,
          position: exit ? { yaw: exit.yaw, pitch: 0 } : undefined,   // arrive facing where we walked
        }),
        sleep(12000),
      ]);
    } catch (e) { /* texture/transition hiccup — chrome already updated, image will settle */ }
  }
  placeExit(exit ? exit.yaw : exitYaw);   // (re)place the single "walk on" arrow ahead
}
/* Walk through the current room's single exit (arrow click or double-click in the exit area). */
function walkThroughExit(){ pendingExit = { yaw: exitYaw, pitch: 0 }; walkOn(); }

/* ---- the conjuring beat (designer choreography, driven by the real generation) ---- */
const PHRASES = {
  palazzo:["Drawing the marble from the quarry…","Gilding the cornices…","Hanging the lanterns…","Letting the light settle…","Naming the room…"],
  fuori:["Laying the travertine…","Planting the cypress…","Turning the fountains on…","Letting in the afternoon…","Naming the garden…"],
};
const ARC = 2 * Math.PI * 38;
let choreoRAF = 0, choreoDone = false, choreoProg = 0;

function startChoreo(room){
  el('conjure').style.setProperty('--gold', room.mat.mat);
  el('cjName').classList.remove('show'); el('cjName').textContent = '';
  el('cjSub').textContent = ctx === 'fuori' ? 'The grounds' : 'Palazzo Aventino';
  el('cjPhrase').textContent = PHRASES[ctx][0]; el('cjPhrase').style.opacity = 1;
  el('cjProg').style.strokeDasharray = ARC;
  el('conjure').classList.add('on');
  choreoDone = false; choreoProg = 0;
  const phrases = PHRASES[ctx], t0 = performance.now(); let pi = 0;
  cancelAnimationFrame(choreoRAF);
  const loop = () => {
    const e = performance.now() - t0;
    // ease toward 92% over ~16s; snap to 100% once the room is ready
    choreoProg = choreoDone ? Math.min(1, choreoProg + 0.025) : Math.min(0.92, 1 - Math.exp(-e / 16000));
    el('cjProg').style.strokeDashoffset = (ARC * (1 - choreoProg)).toFixed(1);
    const idx = choreoDone ? phrases.length - 1 : Math.min(phrases.length - 2, Math.floor(e / 4200));
    if (idx !== pi){ pi = idx; const ph = el('cjPhrase'); ph.style.opacity = 0; setTimeout(() => { ph.textContent = phrases[idx]; ph.style.opacity = 1; }, 200); }
    if (choreoDone && choreoProg >= 1) return; // stop; resolveName takes over
    choreoRAF = requestAnimationFrame(loop);
  };
  loop();
}
async function resolveName(room){
  choreoDone = true;
  await sleep(700);                       // let the arc complete
  el('cjPhrase').style.opacity = 0; await sleep(240); el('cjPhrase').textContent = '';
  el('cjName').textContent = room.it; el('cjName').classList.add('show');
  el('cjSub').textContent = room.en;
  await sleep(1100);
}

/* Download + decode a panorama into the browser cache so setPanorama is instant later.
   Resolves only once the image is actually in hand (crossOrigin matches PSV's texture loader
   so the cache key is identical → guaranteed hit). */
function preloadPano(url){
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => { try { img.decode && img.decode().catch(()=>{}); } catch(e){} resolve(url); }; // download done = cached; decode best-effort
    img.onerror = () => resolve(url);   // proceed even if preload fails; setPanorama will retry
    img.src = url;
    preloadPano._keep = (preloadPano._keep || []); preloadPano._keep.push(img); // hold ref so it isn't GC'd
  });
}

/* Generate one room AND preload its 360 image. Returns the room with .panorama set & cached. */
function genRoom(world, room){
  const style = STYLE_ID[root.getAttribute('data-style')] || 122;
  return fetch('/api/conjure', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ world, style, archetype: room.arch.kind || room.arch.en, material: room.mat.en, seed: CTX[world].houseSeed }),
  }).then(r => { if (!r.ok) throw new Error('conjure ' + r.status); return r.json(); })
    .then(({ id }) => pollStatus(id))
    .then(url => preloadPano('/api/pano?u=' + encodeURIComponent(url)))
    .then(panoUrl => { room.panorama = panoUrl; return room; });   // ready only after the image is downloaded+decoded
}

/* Keep a small BUFFER of rooms loaded AHEAD per world so the next few walk-ons are instant.
   Generation runs ONE room at a time (sequential single-flight) — the Essential plan gives no
   concurrency guarantee, so we never fire parallel Skybox jobs. Each queued room has its
   name/material decided up front; its 360 image is generated + preloaded, then it's marked ready.
   walkOn awaits a room's `promise` if it's still cooking. The loop refills as rooms are consumed. */
const BUFFER = 4;                              // rooms loaded ahead per world (each ≈ 1 Skybox credit)
const filling = { palazzo: false, fuori: false };
async function topUp(world){
  if (filling[world]) return;                  // one expansion at a time — never run two fills at once
  filling[world] = true;
  try {
    const C = CTX[world];
    while (C.queue.length < BUFFER){
      const room = makeRoom(world);
      room.ready = false;
      let resolve; room.promise = new Promise(r => { resolve = r; });
      C.queue.push(room);                      // queued (named) immediately; generates below, in turn
      try { await genRoom(world, room); room.ready = true; }
      catch (e) { room._failed = true; }
      resolve(room);                           // wake any walkOn awaiting this exact room
    }
  } finally {
    filling[world] = false;
  }
}

/* Walk on. Two regimes:
   1) the PRE-MADE opening — serve the next committed room: instant, no credits, no beat.
   2) past the opening — take the next buffered LIVE room: instant if its 360 is already
      loaded, else show the conjuring beat while it finishes. */
async function walkOn(){
  if (busy) return;
  busy = true; hideHint();
  const C = CTX[ctx], statics = STATIC[ctx];
  // the heading we're walking: where the visitor double-clicked, else straight ahead (button/key walks)
  const exit = pendingExit || { yaw: (viewer && viewer.getPosition) ? viewer.getPosition().yaw : 0, pitch: 0 };
  pendingExit = null;
  try {
    if (C.sIdx < statics.length){              // --- opening: pre-made, instant, free ---
      const room = staticRoom(ctx, statics[C.sIdx]); C.sIdx++;
      C.rooms = C.rooms.slice(0, C.cursor + 1); C.rooms.push(room); C.cursor = C.rooms.length - 1;
      paintChrome();
      await show(room, exit);
      return;
    }
    // --- the rest: live generation, buffered ahead ---
    if (C.queue.length === 0) topUp(ctx);
    let qi = C.queue.findIndex(r => r.ready); if (qi < 0) qi = 0;
    const room = C.queue.splice(qi, 1)[0];
    if (!room || !room.promise) throw new Error('no preparation');
    if (!room.ready){                          // image not in yet → designed wait, with its real name
      startChoreo(room);
      await room.promise;
      if (room._failed) throw new Error('generation failed');
      await resolveName(room);
      el('conjure').classList.remove('on');
    }
    C.rooms = C.rooms.slice(0, C.cursor + 1); C.rooms.push(room); C.cursor = C.rooms.length - 1;
    paintChrome();
    await show(room, exit);
  } catch (e) {
    cancelAnimationFrame(choreoRAF); el('conjure').classList.remove('on');
    notice('<b>Could not conjure the next room.</b> ' + (e.message || ''));
  } finally {
    busy = false;
    // start (or keep) the live buffer warming once we're within one room of the opening's end,
    // so the first generated room is ready by the time the visitor needs it. No credits are spent
    // until a visitor actually reaches this point.
    if (C.sIdx >= statics.length - 1) topUp(ctx);
  }
}
async function pollStatus(id){
  for (let i = 0; i < 80; i++){
    await sleep(4000);
    const r = await fetch('/api/status?id=' + encodeURIComponent(id));
    if (!r.ok) continue;
    const d = await r.json();
    if (d.status === 'complete' && d.file_url) return d.file_url;
    if (d.status === 'error' || d.status === 'abort') throw new Error(d.error_message || 'generation failed');
  }
  throw new Error('timed out');
}

/* ---- navigation ---- */
async function back(){ const C = CTX[ctx]; if (busy || C.cursor <= 0) return; C.cursor--; await show(C.rooms[C.cursor]); paintChrome(); }
async function forward(){
  const C = CTX[ctx]; if (busy) return;
  if (C.cursor < C.rooms.length - 1){ C.cursor++; await show(C.rooms[C.cursor]); paintChrome(); } else walkOn();
}
async function switchCtx(next){
  if (busy || next === ctx) return;
  ctx = next; root.setAttribute('data-world', ctx);
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.ctx === ctx));
  await show(CTX[ctx].rooms[CTX[ctx].cursor]); paintChrome();
  preloadStatics(ctx);                         // warm this world's pre-made opening
  if (CTX[ctx].sIdx >= STATIC[ctx].length - 1) topUp(ctx);   // only generate live once near/past the opening
}
function setStyle(st){
  // a style change discards rooms buffered in the old look; the buffer rebuilds in the new style
  CTX.palazzo.queue = []; CTX.fuori.queue = [];
  root.setAttribute('data-style', st);
  document.querySelectorAll('.sbtn').forEach(b => b.classList.toggle('active', b.dataset.style === st));
  try { localStorage.setItem('palazzo-style', st); } catch(e){}
}

/* ---- chrome ---- */
function paintChrome(){
  const C = CTX[ctx], room = C.rooms[C.cursor];
  el('counter').textContent = (ctx === 'fuori' ? 'Court ' : 'Room ') + roman(C.cursor + 1);
  el('capEyebrow').textContent = C.label;
  el('capTitle').textContent = room.it;
  el('capSub').textContent = room.en;
  el('capDesc').textContent = room.desc;
  el('capMat').innerHTML = `<i></i>${room.arch.noMat ? (ctx === 'fuori' ? 'Travertine & water' : 'Marble & gilt') : room.mat.en}`;
  el('caption').style.setProperty('--mat-2', room.mat.m2);
  el('caption').style.setProperty('--mat-deep', room.mat.deep);
  const a = el('capActions'); a.innerHTML = '';
  const b = capBtn('← Back', back, true); if (C.cursor <= 0) b.setAttribute('disabled','');
  a.appendChild(b);
  a.appendChild(capBtn(C.cursor < C.rooms.length - 1 ? 'Forward →' : 'Walk on ⤢', forward));
}
function capBtn(label, fn, ghost){ const b = document.createElement('button'); b.className = 'cap-btn' + (ghost ? ' ghost' : ''); b.textContent = label; b.addEventListener('click', fn); return b; }
function showChrome(on){
  el('topbar').classList.toggle('hidden', !on);
  el('caption').classList.toggle('hidden', !on);
  el('stylebar').classList.toggle('hidden', !on);
  el('veil').classList.toggle('on', on);
  if (!on) clearExit();                          // no exit arrow over the intro / closing screens
  if (on && !hintShown){ el('hint').classList.remove('hidden'); hintShown = true; setTimeout(hideHint, 6000); }
}
function hideHint(){ el('hint').classList.add('hidden'); }
function notice(html){ let n = el('notice'); if (!n){ n = document.createElement('div'); n.id = 'notice'; document.body.appendChild(n); } n.innerHTML = html; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 6000); }

/* ---- boot ---- */
async function enter(){ el('intro').classList.add('hidden'); showChrome(true); await show(CTX[ctx].rooms[CTX[ctx].cursor]); paintChrome(); preloadStatics(ctx); }
function start(){
  seedWorlds();
  initViewer();
  root.setAttribute('data-world', ctx);
  setStyle((()=>{ try { return localStorage.getItem('palazzo-style'); } catch(e){ return null; } })() || 'maximal');
  preloadStatics('palazzo'); preloadStatics('fuori');   // warm the free pre-made openings; no credits spent
  el('enter').addEventListener('click', enter);
  el('home').addEventListener('click', () => { el('intro').classList.remove('hidden'); showChrome(false); });
  el('restart').addEventListener('click', () => { el('closing').classList.add('hidden'); el('intro').classList.remove('hidden'); showChrome(false); });
  el('endTour').addEventListener('click', () => { showChrome(false); el('closing').classList.remove('hidden'); });
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchCtx(t.dataset.ctx)));
  document.querySelectorAll('.sbtn').forEach(b => b.addEventListener('click', () => { setStyle(b.dataset.style); if (CTX[ctx].sIdx >= STATIC[ctx].length) topUp(ctx); }));
  document.addEventListener('keydown', e => {
    if (el('topbar').classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') back();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') forward();
    else if (e.key === '1') setStyle('photoreal');
    else if (e.key === '2') setStyle('maximal');
    else if (e.key === '3') setStyle('cinematic');
  });
}
start();
