/* Palazzo Aventino — v2 tour engine (Photo Sphere Viewer + VirtualTourPlugin).
 *
 * No Google, no API key: a dedicated 360 viewer over AI-generated equirectangular
 * panoramas. Drag to look, scroll to zoom, click the floor arrows to walk room→room.
 * Each room is one node with a `panorama` URL (img/<id>.webp) and `links` to neighbours.
 * Swap a room's image by changing its panorama path — nothing else.
 */
import { Viewer } from '@photo-sphere-viewer/core';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';

/* room order = tour path. Copy is material-specific and feeling-led (benchmark findings). */
const ROOMS = [
  { id:'facade',     it:'La Facciata',              en:'The Façade',
    desc:'Travertine and time. The seventeenth-century front holds the Aventine’s quiet crown — pilasters, a deep cornice, and Rome falling away below.' },
  { id:'cortile',    it:'Il Cortile',               en:'The Courtyard',
    desc:'An arcade of honey-coloured stone open to the Roman sky. A single citrus tree, a worn fountain, and the particular hush of an inner court.' },
  { id:'scalone',    it:'Lo Scalone d’Onore',   en:'The Grand Staircase',
    desc:'Pale stone rising under a high lantern of light. Balustraded, monumental, and deliberately bare — the ascent is the ceremony.' },
  { id:'salone',     it:'Il Salone Affrescato',     en:'The Frescoed Salon',
    desc:'The piano nobile. A coffered vault carries a faded allegory of the seasons; light enters through tall shutters onto a polished travertine floor.' },
  { id:'biblioteca', it:'La Biblioteca',            en:'The Library',
    desc:'Walnut to the cornice, a long reading table, and shutters folded back to the garden. The room keeps its own warm silence.' },
  { id:'pranzo',     it:'La Sala da Pranzo',        en:'The Dining Room',
    desc:'Walls in deep Roman ochre, a long table beneath low iron light. Intimate by design — made for evenings, not numbers.' },
  { id:'padronale',  it:'L’Appartamento Padronale', en:'The Master Suite',
    desc:'A private apartment of bedroom and loggia in pale stone and soft linen, opening over the courtyard. Serene, and entirely apart.' },
  { id:'terrazza',   it:'La Terrazza',              en:'The Roof Terrace',
    desc:'Above the rooftops at dusk: clipped hedges, terracotta, and the dome of St. Peter’s held on the skyline. The city, arranged for one.' },
];
const LAST = ROOMS.length;            // index of closing screen (9)
const STORE = 'palazzo-aventino-v2';
const PANO = id => `img/${id}.webp`;  // swap point for real/other imagery
const idxOf = id => ROOMS.findIndex(r => r.id === id) + 1;
const el = id => document.getElementById(id);
const pad = n => (n < 10 ? '0' + n : '' + n);

/* VirtualTour nodes — bidirectional links walk the path; arrows sit on the floor. */
const NODES = ROOMS.map((r, i) => {
  const links = [];
  if (i < ROOMS.length - 1) links.push({ nodeId: ROOMS[i+1].id, position: { yaw: '0deg',   pitch: '-22deg' } });
  if (i > 0)                links.push({ nodeId: ROOMS[i-1].id, position: { yaw: '180deg', pitch: '-22deg' } });
  return { id: r.id, panorama: PANO(r.id), name: `${r.it} — ${r.en}`, links };
});

let viewer, tour, started = false, idx = 1, navigating = false;

function notice(html, sticky){
  const n = el('notice'); n.innerHTML = html; n.classList.add('show');
  if(!sticky) setTimeout(() => n.classList.remove('show'), 5200);
}
const save = () => { try{ localStorage.setItem(STORE, String(idx)); }catch(e){} };
const load = () => { try{ const v = parseInt(localStorage.getItem(STORE),10); return isNaN(v)?0:v; }catch(e){ return 0; } };

function initViewer(){
  viewer = new Viewer({
    container: 'viewer',
    // no initial `panorama` — VirtualTourPlugin owns the first load (startNodeId),
    // which avoids a double-fetch/abort of the facade pano.
    navbar: false,
    defaultZoomLvl: 0,
    minFov: 38, maxFov: 85,
    mousewheelCtrlKey: false,
    touchmoveTwoFingers: false,
    loadingTxt: '',
    plugins: [
      MarkersPlugin,
      [VirtualTourPlugin, {
        positionMode: 'manual',
        renderMode: '3d',
        nodes: NODES,
        startNodeId: 'facade',
        preload: true,
        transitionOptions: { showLoader: true, speed: '6rpm', fadeIn: true, rotation: true },
      }],
    ],
  });
  tour = viewer.getPlugin(VirtualTourPlugin);

  tour.addEventListener('node-changed', ({ node }) => {
    idx = idxOf(node.id) || idx; save(); paintChrome();
  });
  viewer.addEventListener('ready', () => {
    document.documentElement.style.setProperty('--introbg', `url('${PANO('facade')}')`);
  }, { once: true });
  viewer.addEventListener('panorama-error', () => {
    notice('<b>A panorama failed to load.</b> Imagery may still be generating — refresh shortly.', true);
  });
}

/* ---- screen flow ---- */
function showViewerChrome(on){
  el('topbar').classList.toggle('hidden', !on);
  el('caption').classList.toggle('hidden', !on);
  el('veil').classList.toggle('on', on);
}
function goRoom(i){
  i = Math.max(1, Math.min(LAST-0, i));
  if(i > ROOMS.length){ goClosing(); return; }
  el('intro').classList.add('hidden');
  el('closing').classList.add('hidden');
  showViewerChrome(true);
  const id = ROOMS[i-1].id;
  if(tour && !navigating){ navigating = true; Promise.resolve(tour.setCurrentNode(id)).finally(()=>{ navigating = false; }); }
  idx = i; save(); paintChrome();
}
function goIntro(){ el('intro').classList.remove('hidden'); el('closing').classList.add('hidden'); showViewerChrome(false); }
function goClosing(){ el('closing').classList.remove('hidden'); el('intro').classList.add('hidden'); showViewerChrome(false); idx = LAST; save(); }

function paintChrome(){
  const r = ROOMS[idx-1]; if(!r) return;
  el('counter').innerHTML = `<b>${pad(idx)}</b> / 08`;
  el('capEyebrow').textContent = `Room ${pad(idx)} — 08`;
  el('capTitle').textContent = r.it;
  el('capEn').textContent = r.en;
  el('capDesc').textContent = r.desc;
  const a = el('capActions'); a.innerHTML = '';
  if(idx > 1) a.appendChild(capBtn('← Previous', () => goRoom(idx-1), true));
  if(idx < ROOMS.length) a.appendChild(capBtn('Next →', () => goRoom(idx+1)));
  else a.appendChild(capBtn('Conclude the tour →', goClosing));
}
function capBtn(label, fn, ghost){
  const b = document.createElement('button');
  b.className = 'cap-btn' + (ghost ? ' ghost' : '');
  b.textContent = label; b.addEventListener('click', fn);
  return b;
}

function buildIndex(){
  const list = el('ixList'); list.innerHTML = '';
  ROOMS.forEach((r, i) => {
    const b = document.createElement('button');
    b.className = 'ix-row';
    b.innerHTML = `<span class="num">${pad(i+1)}</span><span class="nm">${r.it}</span><span class="en">${r.en}</span>`;
    b.addEventListener('click', () => { el('index').classList.add('hidden'); goRoom(i+1); });
    list.appendChild(b);
  });
}

function start(){
  if(started) return; started = true;
  buildIndex();
  el('enter').addEventListener('click', () => goRoom(load() >= 1 && load() <= ROOMS.length ? load() : 1));
  el('home').addEventListener('click', goIntro);
  el('restart').addEventListener('click', goIntro);
  el('openIndex').addEventListener('click', () => el('index').classList.remove('hidden'));
  el('closeIndex').addEventListener('click', () => el('index').classList.add('hidden'));
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ el('index').classList.add('hidden'); return; }
    const open = !el('index').classList.contains('hidden');
    const inViewer = !el('topbar').classList.contains('hidden');
    if(inViewer && !open){
      if(e.key === 'ArrowRight') goRoom(Math.min(idx+1, LAST));
      if(e.key === 'ArrowLeft')  goRoom(Math.max(idx-1, 1));
    }
  });
}

initViewer();
start();
