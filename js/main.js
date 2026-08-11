/**
 * Boot the shop.
 *
 * Owns the renderer, the frame loop and the panels. Score lives in play.js;
 * this file's job is to turn "player pressed E near the case cabinet" into
 * "open that panel", and to hand each opened exhibit to play.open().
 */

import * as THREE from 'three';
import { buildShop, REACH } from './shop.js';
import { createControls } from './controls.js';
import { createPlay } from './play.js';
import { createInspector } from './chase.js';
import { loadBoard, renderBoard } from './leaderboard.js';
import * as sfx from './sound.js';
import * as Q from './quality.js';
import {
  PAPERS, BROADCASTS, FRAMES, PLATES, FILES, CELLS, YARD,
  SAFEHOUSE, RECORDS, MEMORIAL, questionsFor,
} from './content.js';

const $ = (sel) => document.querySelector(sel);

const quality = Q.settings();
const shadows = quality.shadows;

// ---------------------------------------------------------------- renderer ---

const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
if (shadows) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 130);
const shop = buildShop(quality);

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // A narrow phone held upright needs a wider field of view to see the room.
  camera.fov = w / h < 0.75 ? 84 : 72;
  camera.updateProjectionMatrix();
}

addEventListener('resize', resize);
resize();

const controls = createControls({
  camera,
  colliders: shop.colliders,
  zones: shop.zones,
  spawn: shop.spawn,
  joystick: $('#joystick'),
  stick: $('#stick'),
  lookZone: $('#look'),
  // Stone underfoot from the jail wing onward, boards before it.
  onStep: (s) => sfx.footstep(s.z < -22),
});

// ------------------------------------------------------------------- play ---

const play = createPlay({
  els: {
    ask: $('#ask'),
    points: $('#hudPoints'),
    readCount: $('#readCount'),
    readFill: $('#readFill'),
    answered: $('#answeredCount'),
    streak: $('#hudStreak'),
    hearts: $('#hearts'),
    caught: $('#caught'),
    caughtBody: $('#caughtBody'),
    caughtWhere: $('#caughtWhere'),
    over: $('#over'),
    overPoints: $('#overPoints'),
    overLines: $('#overLines'),
    overName: $('#overName'),
    overFile: $('#overFile'),
    overStatus: $('#overStatus'),
    restart: $('#restart'),
    name: $('#username'),
    file: $('#fileScore'),
    status: $('#ledgerStatus'),
    leaders: $('#leaders'),
  },
  onCaughtResolved: () => {
    inspector.release();
    controls.setLocked(Boolean(openId));
  },
  onGameOver: () => controls.setLocked(true),
});

const inspector = createInspector({
  scene: shop.scene,
  colliders: shop.colliders,
  zones: shop.zones,
  onCatch: (area) => {
    // Being caught interrupts whatever you were doing: any open panel closes and
    // the question he asks takes over.
    closePanel();
    controls.setLocked(true);
    sfx.caught();
    play.caught(area);
  },
});

// ----------------------------------------------------------------- panels ---

const panels = {
  print: $('#printPanel'),
  radio: $('#radioPanel'),
  tv: $('#tvPanel'),
  press: $('#pressPanel'),
  files: $('#filesPanel'),
  ledger: $('#ledgerPanel'),
};

/**
 * Places that are their own spot in the world but share one panel, refilled
 * from whichever you are standing at. Each entry is [prefix, count, panel id,
 * the content array].
 */
const PLACE_SETS = [
  ['cell', 6, 'cellPanel', CELLS],
  ['yard', 6, 'yardPanel', YARD],
  ['safe', 7, 'safePanel', SAFEHOUSE],
  ['rec', 6, 'recPanel', RECORDS],
  ['mem', 10, 'memPanel', MEMORIAL],
];

for (const [prefix, count, panelId] of PLACE_SETS) {
  for (let i = 0; i < count; i++) panels[`${prefix}${i}`] = $(`#${panelId}`);
}

let openId = null;

function openPanel(id) {
  if (openId === id) return;
  closePanel();
  openId = id;
  panels[id].classList.add('open');
  controls.setLocked(true);
  document.body.classList.add('panel-open');
  sfx.openPanel();
}

function closePanel() {
  if (!openId) return;
  play.dismiss();
  panels[openId].classList.remove('open');
  openId = null;
  controls.setLocked(false);
  document.body.classList.remove('panel-open');
  sfx.closePanel();
}

for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', closePanel);
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});

// ------------------------------------------------------- exhibit browsers ---

/**
 * Wire a grid of cards to a reader pane. Used by the print rack, the composing
 * bench and the case cabinet, which differ only in their labels.
 */
function browser({ items, prefix, gridEl, readerEl, label, title, body }) {
  items.forEach((item, i) => {
    const key = `${prefix}:${i}`;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'paper';
    card.innerHTML =
      `<span class="vol">${label(item)}</span>` +
      `<b>${item.headline}</b>` +
      `<span class="teaser">${item.body.slice(0, 60)}…</span>`;

    card.addEventListener('click', () => {
      card.classList.add('opened');
      title.textContent = item.headline;
      body.textContent = item.body;
      readerEl.querySelector('[data-ref]').textContent = label(item);
      readerEl.classList.add('show');
      play.open(key, item, readerEl);
    });

    gridEl.append(card);
  });
}

browser({
  items: PAPERS,
  prefix: 'paper',
  gridEl: $('#papers'),
  readerEl: $('#paperReader'),
  label: (p) => `VOL. I · ${p.year}`,
  title: $('#paperHeadline'),
  body: $('#paperBody'),
});

browser({
  items: PLATES,
  prefix: 'plate',
  gridEl: $('#plates'),
  readerEl: $('#plateReader'),
  label: (p) => `PLATE · ${p.year}`,
  title: $('#plateHeadline'),
  body: $('#plateBody'),
});

browser({
  items: FILES,
  prefix: 'file',
  gridEl: $('#files'),
  readerEl: $('#fileReader'),
  label: (f) => f.ref,
  title: $('#fileHeadline'),
  body: $('#fileBody'),
});

// ------------------------------------------------------------- the cells ---

/**
 * The six cells are separate places rather than a grid on one panel — walking
 * the length of the wing is the point of the wing. They share one panel, filled
 * in with whichever cell you are standing at.
 */
function showPlace(prefix, items, panelId, index) {
  const item = items[index];
  $(`#${panelId} [data-ref]`).textContent = item.ref;
  $(`#${panelId} [data-headline]`).textContent = item.headline;
  $(`#${panelId} [data-body]`).textContent = item.body;
  $(`#${panelId} .panel-head span`).textContent = item.ref;
  play.open(`${prefix}:${index}`, item, $(`#${panelId} .reader`));
}

// -------------------------------------------------------------- the radio ---

let broadcast = 0;

function showBroadcast() {
  const item = BROADCASTS[broadcast];
  $('#radioText').textContent = item.text;
  $('#radioIndex').textContent = `BROADCAST ${broadcast + 1} OF ${BROADCASTS.length}`;
  play.open(`radio:${broadcast}`, item, $('#radioReader'));
}

$('#tune').addEventListener('click', () => {
  broadcast = (broadcast + 1) % BROADCASTS.length;
  showBroadcast();
});

// ----------------------------------------------------------------- the tv ---

let frame = 0;

function showFrame() {
  const item = FRAMES[frame];
  $('#frameTitle').textContent = item.title;
  $('#frameCaption').textContent = item.caption;
  $('#frameIndex').textContent = `CARD ${frame + 1} OF ${FRAMES.length}`;
  play.open(`tv:${frame}`, item, $('#tvReader'));
}

$('#nextFrame').addEventListener('click', () => {
  frame = (frame + 1) % FRAMES.length;
  showFrame();
});

// ---------------------------------------------------------------- interact --

const prompt = $('#prompt');
let near = null;

function findNear() {
  const { x, z } = controls.state;
  const look = controls.facing();

  let best = null;
  let bestDist = Infinity;

  for (const s of shop.stations) {
    const dx = s.position.x - x;
    const dz = s.position.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist > REACH || dist > bestDist) continue;

    // Require the station to be roughly ahead, so standing back-to-back with
    // the radio does not offer to open it.
    const facingIt = dist < 0.7 || (dx / dist) * look.x + (dz / dist) * look.y > 0.15;
    if (!facingIt) continue;

    best = s;
    bestDist = dist;
  }

  return best;
}

function interact() {
  // While the Inspector is holding you, nothing else responds.
  if (play.isHeld() || play.state.over) return;

  if (openId) {
    closePanel();
    return;
  }
  if (!near) return;

  openPanel(near.id);

  // The radio, the television and the cells have no card grid — opening them is
  // the same action as looking at whatever they are showing.
  if (near.id === 'radio') showBroadcast();
  if (near.id === 'tv') showFrame();

  for (const [prefix, , panelId, items] of PLACE_SETS) {
    if (near.id.startsWith(prefix)) {
      showPlace(prefix, items, panelId, Number(near.id.slice(prefix.length)));
      break;
    }
  }
}

$('#action').addEventListener('click', interact);

addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'e' && document.activeElement?.tagName !== 'INPUT') {
    interact();
  }
});

// ------------------------------------------------------------------- loop --

let lastFrame = performance.now();
let beatTimer = 99;

function frameLoop() {
  requestAnimationFrame(frameLoop);

  // Clamp so a backgrounded tab does not teleport the player on return.
  const now = performance.now();
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  controls.update(dt);

  const player = { x: controls.state.x, z: controls.state.z };
  if (!play.state.over) inspector.update(dt, player);

  // Proximity warning: the HUD reddens as he closes, which is the only cue you
  // get when he is behind you.
  const away = inspector.distanceTo(player);
  document.body.dataset.danger = away < 4 ? 'close' : away < 9 ? 'near' : 'clear';

  // Heartbeat, quickening as he closes. Driven off distance rather than a fixed
  // timer so it tracks the chase instead of nagging.
  if (!play.state.over && !play.isHeld() && away < 9) {
    const urgency = 1 - away / 9;
    const interval = 1.15 - urgency * 0.6;
    beatTimer += dt;
    if (beatTimer >= interval) {
      beatTimer = 0;
      sfx.heartbeat(urgency);
    }
  } else {
    beatTimer = 99;
  }

  near = openId || play.isHeld() ? null : findNear();
  prompt.classList.toggle('show', Boolean(near));
  if (near) $('#promptLabel').textContent = near.label;

  shop.update(dt, { near, frame, at: player });
  renderer.render(shop.scene, camera);
}

// -------------------------------------------------------------------- init --

loadBoard().then(({ board, online }) => {
  renderBoard($('#leaders'), board, { online });
});

$('#begin').addEventListener('click', () => {
  $('#intro').classList.add('gone');
  // Audio has to be started from a gesture; this is the only one guaranteed.
  sfx.unlock();
  play.state.startedAt = performance.now();
  lastFrame = performance.now();
  frameLoop();
});

// ----------------------------------------------------------- quality UI -----

{
  const picker = $('#qualityPicker');
  const note = $('#qualityNote');
  const chosen = Q.current();

  for (const [name, level] of Object.entries(Q.LEVELS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quality-option';
    button.textContent = level.label;
    button.dataset.on = name === chosen ? 'yes' : 'no';

    button.addEventListener('click', () => {
      if (name === Q.current()) return;
      Q.set(name);
      // Antialiasing and the light-pool size are baked in at boot, so the honest
      // way to apply them is to start again rather than to half-apply them.
      location.reload();
    });

    picker.append(button);
  }

  note.textContent = Q.LEVELS[chosen].note;
}

$('#mute').addEventListener('click', () => {
  sfx.setMuted(!sfx.isMuted());
  $('#mute').dataset.off = sfx.isMuted() ? 'yes' : 'no';
  $('#mute').textContent = sfx.isMuted() ? '♪̸' : '♪';
});

// Exposed for console-driven checks; the only way to verify the scene without a
// screenshot.
window.__newsstand = { shop, controls, camera, renderer, play, inspector, questionsFor };
