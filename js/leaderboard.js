/**
 * The leaderboard client.
 *
 * The board is global — it lives in D1 behind /api/scores. But the game has to
 * stay playable when that endpoint is unreachable (opened from disk, offline
 * phone, Worker not deployed yet), so every call falls back to an on-device
 * board kept in localStorage and says so in the UI. A run is never lost just
 * because the network was.
 */

const ENDPOINT = '/api/scores';
const STORE_KEY = 'sanyal-newsstand-scores';
const TIMEOUT = 6000;

/** Wrap fetch so a hung request cannot leave the player staring at a spinner. */
async function call(options) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT);
  try {
    const res = await fetch(ENDPOINT, { ...options, signal: abort.signal });
    if (!res.ok) throw new Error(`leaderboard responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------ local board ---

function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(rows.slice(0, 50)));
  } catch {
    // A full or disabled localStorage is not worth interrupting the game for.
  }
}

/** Collapse to one row per name, best run first — the same shape the API returns. */
function rank(rows) {
  const best = new Map();
  for (const row of rows) {
    const held = best.get(row.name);
    if (!held || row.points > held.points ||
        (row.points === held.points && row.seconds < held.seconds)) {
      best.set(row.name, row);
    }
  }
  return [...best.values()].sort(
    (a, b) => b.points - a.points || a.seconds - b.seconds
  );
}

function recordLocal(entry) {
  const rows = readLocal();
  rows.push(entry);
  writeLocal(rows);
  const board = rank(rows);
  return {
    board: board.slice(0, 20),
    rank: board.findIndex((r) => r.name === entry.name) + 1,
    online: false,
  };
}

// ------------------------------------------------------------------ API ----

export async function loadBoard() {
  try {
    const data = await call({ method: 'GET' });
    return { board: data.board ?? [], online: true };
  } catch {
    return { board: rank(readLocal()).slice(0, 20), online: false };
  }
}

/**
 * Submit a finished run. Always writes to the local board too, so the player
 * keeps their history even when the global board took the score.
 */
export async function submitScore(entry) {
  const local = recordLocal(entry);

  try {
    const data = await call({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return { board: data.board ?? [], rank: data.rank ?? null, online: true };
  } catch {
    return local;
  }
}

// --------------------------------------------------------------- render ----

const FLAGS = { IN: '🇮🇳', GB: '🇬🇧', US: '🇺🇸', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷' };

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

export function renderBoard(el, board, { highlight, online } = {}) {
  const status = el.parentElement?.querySelector('[data-board-status]');
  if (status) {
    status.textContent = online ? 'WORLD LEADERBOARD' : 'ON THIS DEVICE · OFFLINE';
    status.dataset.online = online ? 'yes' : 'no';
  }

  if (!board.length) {
    el.innerHTML =
      '<div class="rank empty"><span>—</span><span>No reader has sat the examination yet.</span><span></span></div>';
    return;
  }

  el.innerHTML = board
    .map((row, i) => {
      const me = highlight && row.name === highlight ? ' me' : '';
      const flag = row.country && FLAGS[row.country] ? `${FLAGS[row.country]} ` : '';
      const place = String(i + 1).padStart(2, '0');
      return (
        `<div class="rank${me}">` +
        `<span class="place">${place}</span>` +
        `<span class="who">${flag}${escapeHtml(row.name)}</span>` +
        `<span class="pts">${row.points.toLocaleString()}<small> pts</small></span>` +
        `<span class="detail">${row.correct}/${row.total} · ${row.seconds}s</span>` +
        `</div>`
      );
    })
    .join('');
}
