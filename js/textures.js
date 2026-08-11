/**
 * Canvas-drawn textures.
 *
 * Nothing here loads an image file — every surface in the shop is painted at
 * runtime into a 2D canvas and uploaded as a texture. That keeps the whole game
 * to the files in this folder and means the newspapers can be regenerated for
 * any headline without an artist in the loop.
 *
 * Newspaper body copy is drawn as abstract line-runs rather than glyphs. This is
 * deliberate: a legible block of filler text on a 1920s Indian newspaper would be
 * words Sanyal never wrote. Only the mastheads and headlines say anything, and
 * those come from `content.js`.
 */

import * as THREE from 'three';

const INK = '#2a1d16';
const PAPER = '#e8d5ab';
const RED = '#9d3a2e';

function surface(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function finish(canvas, { repeat, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.anisotropy = 4;
  return texture;
}

/** Deterministic pseudo-random, so a reload paints the same shop. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Speckle a surface with fine grain so flat colours do not read as plastic. */
function grain(ctx, w, h, amount, alpha, seed = 7) {
  const rand = rng(seed);
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(rand() * alpha).toFixed(3)})`;
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
}

export function woodFloor() {
  const { canvas, ctx } = surface(512, 512);
  const rand = rng(11);

  ctx.fillStyle = '#7d5433';
  ctx.fillRect(0, 0, 512, 512);

  const plank = 64;
  for (let i = 0; i < 512 / plank; i++) {
    const shade = 0.82 + rand() * 0.3;
    ctx.fillStyle = `rgb(${125 * shade | 0},${84 * shade | 0},${51 * shade | 0})`;
    ctx.fillRect(0, i * plank, 512, plank - 2);

    // Grain lines running the length of each plank.
    for (let g = 0; g < 14; g++) {
      ctx.strokeStyle = `rgba(60,36,20,${0.05 + rand() * 0.13})`;
      ctx.lineWidth = 0.5 + rand();
      ctx.beginPath();
      const y = i * plank + rand() * plank;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + rand() * 6 - 3, 340, y + rand() * 6 - 3, 512, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(35,20,10,.45)';
    ctx.fillRect(0, i * plank + plank - 2, 512, 2);
  }

  grain(ctx, 512, 512, 2600, 0.16, 3);
  return finish(canvas, { repeat: [6, 4] });
}

/**
 * Brickwork. `tone` shifts the whole course between a warm red-brown and a pale
 * colonial buff, so one texture serves every room by tinting rather than by
 * generating a separate canvas per wall.
 */
export function brick({ tone = 0, seed = 601, courses = 8 } = {}) {
  const W = 512;
  const H = 512;
  const { canvas, ctx } = surface(W, H);
  const rand = rng(seed);

  // Mortar first — the bricks are laid on top of it.
  ctx.fillStyle = '#a39d8c';
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 2200, 0.14, seed + 3);

  const courseH = H / courses;
  const brickW = W / 4;

  for (let row = 0; row < courses; row++) {
    // Every other course is offset by half a brick — a stretcher bond.
    const offset = row % 2 ? brickW / 2 : 0;

    for (let x = -brickW; x < W + brickW; x += brickW) {
      const warm = 0.82 + rand() * 0.36;
      const r = (150 + tone * 46) * warm;
      const gch = (96 + tone * 52) * warm;
      const b = (74 + tone * 54) * warm;

      const bx = x + offset + 3;
      const by = row * courseH + 3;
      const bw = brickW - 6;
      const bh = courseH - 6;

      ctx.fillStyle = `rgb(${Math.min(255, r) | 0},${Math.min(255, gch) | 0},${Math.min(255, b) | 0})`;
      ctx.fillRect(bx, by, bw, bh);

      // A lit top edge and a shaded bottom, which is what gives depth at a
      // glance without a normal map.
      ctx.fillStyle = 'rgba(255,240,215,.16)';
      ctx.fillRect(bx, by, bw, 2);
      ctx.fillStyle = 'rgba(40,24,16,.24)';
      ctx.fillRect(bx, by + bh - 2, bw, 2);

      // Weathering blotches on some bricks only.
      if (rand() < 0.35) {
        ctx.fillStyle = `rgba(60,40,26,${0.05 + rand() * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(bx + rand() * bw, by + rand() * bh, 6 + rand() * 16, 4 + rand() * 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  grain(ctx, W, H, 2600, 0.1, seed + 11);
  return finish(canvas, { repeat: [3, 2] });
}

export function plaster() {
  const { canvas, ctx } = surface(256, 256);
  ctx.fillStyle = '#cbb289';
  ctx.fillRect(0, 0, 256, 256);

  const rand = rng(23);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,240,210' : '120,95,66'},${rand() * 0.09})`;
    const r = 8 + rand() * 34;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, r, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, 256, 256, 900, 0.1, 5);
  return finish(canvas, { repeat: [3, 2] });
}

/**
 * A front page. `paper` is one entry from PAPERS.
 *
 * Layout is fixed: masthead, rule, dateline, headline, then columns of abstract
 * line-runs standing in for body copy.
 */
export function newspaper(paper, seed = 1) {
  const W = 512;
  const H = 700;
  const { canvas, ctx } = surface(W, H);
  const rand = rng(seed * 97 + 5);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Age the sheet — warmer and dirtier towards the edges.
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  vignette.addColorStop(0, 'rgba(255,245,215,0)');
  vignette.addColorStop(1, 'rgba(120,88,48,.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = "bold 44px 'Playfair Display', Georgia, serif";
  ctx.fillText('THE INDEPENDENCE', W / 2, 62);
  ctx.fillText('GAZETTE', W / 2, 104);

  ctx.fillRect(28, 122, W - 56, 3);
  ctx.font = "16px 'DM Mono', monospace";
  ctx.fillText(`VARANASI · ${paper.year} · ONE ANNA`, W / 2, 148);
  ctx.fillRect(28, 160, W - 56, 1);

  // Headline, wrapped to the sheet.
  ctx.font = "bold 40px 'Playfair Display', Georgia, serif";
  const words = paper.headline.toUpperCase().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > W - 60 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  let y = 212;
  for (const l of lines) {
    ctx.fillText(l, W / 2, y);
    y += 44;
  }

  ctx.fillStyle = RED;
  ctx.fillRect(W / 2 - 60, y - 22, 120, 3);
  y += 18;

  // Body copy as line-runs. Three columns, ragged like justified type.
  const colW = (W - 76) / 3;
  const rand2 = rng(seed * 31 + 17);
  for (let c = 0; c < 3; c++) {
    const x = 38 + c * colW;
    let cy = y;
    while (cy < H - 46) {
      const isBreak = rand2() < 0.08;
      if (isBreak) {
        cy += 9;
        continue;
      }
      const w = colW - 12 - (rand2() < 0.18 ? rand2() * colW * 0.45 : rand2() * 6);
      ctx.fillStyle = `rgba(42,29,22,${0.55 + rand2() * 0.35})`;
      ctx.fillRect(x, cy, w, 2.4);
      cy += 8.5;
    }
    if (c < 2) {
      ctx.fillStyle = 'rgba(42,29,22,.35)';
      ctx.fillRect(x + colW - 8, y, 1, H - 46 - y);
    }
  }

  grain(ctx, W, H, 1500, 0.12, seed * 13);
  return finish(canvas);
}

/** The board over the door. */
export function shopSign() {
  const { canvas, ctx } = surface(1024, 256);
  ctx.fillStyle = '#7a2f26';
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#e3c07f';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 1024 - 36, 256 - 36);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f6e3b6';
  ctx.font = "bold 76px 'Playfair Display', Georgia, serif";
  ctx.fillText('SANYAL’S NEWSSTAND', 512, 118);

  ctx.font = "26px 'DM Mono', monospace";
  ctx.fillStyle = '#e0b978';
  ctx.fillText('PRINT · WIRELESS · TELEVISION', 512, 170);

  grain(ctx, 1024, 256, 900, 0.2, 41);
  return finish(canvas);
}

/** The wireless set's front panel: dial, tuning scale, speaker cloth. */
export function radioFace() {
  const { canvas, ctx } = surface(512, 384);
  ctx.fillStyle = '#7b4a25';
  ctx.fillRect(0, 0, 512, 384);

  // Speaker cloth.
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(40, 150, 432, 190);
  const rand = rng(61);
  for (let x = 44; x < 468; x += 7) {
    for (let y = 154; y < 336; y += 7) {
      ctx.fillStyle = `rgba(215,175,105,${0.25 + rand() * 0.3})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // Tuning scale.
  ctx.fillStyle = '#e8c876';
  ctx.fillRect(40, 36, 432, 88);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 36, 432, 88);
  for (let i = 0; i <= 22; i++) {
    const x = 52 + i * 19;
    const tall = i % 4 === 0;
    ctx.fillStyle = INK;
    ctx.fillRect(x, 44, 2, tall ? 26 : 14);
  }
  ctx.fillStyle = RED;
  ctx.fillRect(238, 40, 4, 80);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = "bold 20px 'DM Mono', monospace";
  ctx.fillText('VARANASI WIRELESS', 256, 108);

  grain(ctx, 512, 384, 700, 0.18, 71);
  return finish(canvas);
}

/**
 * The television picture. Returns the texture plus a `draw(frame)` so the set
 * can change cards without rebuilding the material.
 */
export function television() {
  const W = 512;
  const H = 384;
  const { canvas, ctx } = surface(W, H);

  const texture = finish(canvas);

  function draw(frame, scanPhase = 0) {
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, 30, W / 2, H * 0.42, W * 0.72);
    glow.addColorStop(0, '#e9cd92');
    glow.addColorStop(0.55, '#87a06f');
    glow.addColorStop(1, '#20362c');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#2b1f14';

    ctx.font = "bold 44px 'Playfair Display', Georgia, serif";
    const words = frame.title.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > W - 70 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    let y = H / 2 - (lines.length - 1) * 26 - 10;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += 52;
    }

    ctx.font = "20px 'DM Mono', monospace";
    ctx.fillText(frame.caption, W / 2, y + 22);

    // Scanlines, drifting so the set reads as live rather than as a poster.
    for (let sy = (scanPhase % 6) - 6; sy < H; sy += 6) {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(0, sy, W, 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.fillRect(0, 0, W, H);

    texture.needsUpdate = true;
  }

  return { texture, draw };
}

/** The placard over the counter, where scores are filed. */
export function counterSign() {
  const { canvas, ctx } = surface(512, 256);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, 484, 228);

  ctx.textAlign = 'center';
  ctx.fillStyle = RED;
  ctx.font = "bold 66px 'Playfair Display', Georgia, serif";
  ctx.fillText('THE LEDGER', 256, 100);

  ctx.fillStyle = INK;
  ctx.font = "22px 'DM Mono', monospace";
  ctx.fillText('READ THE SHOP.', 256, 152);
  ctx.fillText('ANSWER WHAT IT ASKS.', 256, 186);
  ctx.fillText('FILE YOUR SCORE HERE.', 256, 220);

  grain(ctx, 512, 256, 600, 0.14, 91);
  return finish(canvas);
}

/**
 * What the shopfront looks out onto.
 *
 * A flat white pane read as a sheet of blank paper rather than as daylight, so
 * this paints a bright sky graded down to a street, with rooftops blocked in
 * across the horizon. It is deliberately vague — an impression of a street, not
 * a claim about a particular one.
 */
export function windowView() {
  const W = 512;
  const H = 256;
  const { canvas, ctx } = surface(W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#fdf0cf');
  sky.addColorStop(0.55, '#f6dda8');
  sky.addColorStop(1, '#d8bc8e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Rooftops across the far side of the street.
  const rand = rng(131);
  ctx.fillStyle = '#c9a878';
  let x = -10;
  while (x < W + 10) {
    const w = 30 + rand() * 55;
    const top = H * 0.52 + rand() * 34;
    ctx.fillRect(x, top, w, H - top);
    x += w + 3;
  }

  // A wash of haze over the lot, so it stays background rather than scenery.
  ctx.fillStyle = 'rgba(252,238,205,.42)';
  ctx.fillRect(0, 0, W, H);

  grain(ctx, W, H, 500, 0.06, 137);
  return finish(canvas);
}

/**
 * Lined wooden panelling for the wainscot: vertical boards separated by battens,
 * with a shadow line where each board meets the next.
 */
export function plankWall() {
  const { canvas, ctx } = surface(512, 256);
  const rand = rng(307);

  ctx.fillStyle = '#6b431f';
  ctx.fillRect(0, 0, 512, 256);

  const board = 64;
  for (let i = 0; i < 512 / board; i++) {
    const shade = 0.86 + rand() * 0.28;
    ctx.fillStyle = `rgb(${118 * shade | 0},${74 * shade | 0},${38 * shade | 0})`;
    ctx.fillRect(i * board, 0, board - 4, 256);

    // Grain running the length of the board.
    for (let g = 0; g < 10; g++) {
      ctx.strokeStyle = `rgba(48,26,10,${0.06 + rand() * 0.14})`;
      ctx.lineWidth = 0.6 + rand();
      const x = i * board + 5 + rand() * (board - 14);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + rand() * 5 - 2.5, 85, x + rand() * 5 - 2.5, 170, x, 256);
      ctx.stroke();
    }

    // The batten shadow between boards.
    ctx.fillStyle = 'rgba(28,14,5,.55)';
    ctx.fillRect(i * board + board - 4, 0, 4, 256);
    ctx.fillStyle = 'rgba(255,214,150,.09)';
    ctx.fillRect(i * board, 0, 2, 256);
  }

  grain(ctx, 512, 256, 1400, 0.16, 311);
  return finish(canvas, { repeat: [8, 1] });
}

/**
 * The strip of sky over the yard.
 *
 * Seen edge-on from below, so it is graded across its width rather than being a
 * flat fill — a flat plane reads as a low grey ceiling, which is exactly what
 * the yard should not feel like.
 */
export function skyDome() {
  const { canvas, ctx } = surface(256, 256);

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#fdf6e2');
  grad.addColorStop(0.35, '#dfe9f3');
  grad.addColorStop(0.75, '#b9cde0');
  grad.addColorStop(1, '#9db7cf');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // A few soft banks of cloud, kept very low contrast.
  const rand = rng(401);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.11})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 30 + rand() * 60, 12 + rand() * 26, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  return finish(canvas);
}

/**
 * A noticeboard face: a headed board with an aged paper notice pinned to it.
 * `title` is the only text — the body is line-runs, same rule as the papers.
 */
export function noticeBoard(title) {
  const W = 512;
  const H = 320;
  const { canvas, ctx } = surface(W, H);

  ctx.fillStyle = '#4f4433';
  ctx.fillRect(0, 0, W, H);

  // Board planks behind the notice.
  const rand = rng(509);
  for (let x = 0; x < W; x += 74) {
    const shade = 0.9 + rand() * 0.2;
    ctx.fillStyle = `rgb(${79 * shade | 0},${68 * shade | 0},${51 * shade | 0})`;
    ctx.fillRect(x, 0, 70, H);
  }

  // The pinned notice.
  ctx.fillStyle = '#e9dcba';
  ctx.fillRect(34, 26, W - 68, H - 52);
  ctx.strokeStyle = '#8b7a54';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 26, W - 68, H - 52);

  ctx.textAlign = 'center';
  ctx.fillStyle = RED;
  ctx.font = "bold 34px 'Playfair Display', Georgia, serif";
  ctx.fillText(title.toUpperCase(), W / 2, 84);

  ctx.fillStyle = INK;
  ctx.fillRect(W / 2 - 80, 100, 160, 3);

  for (let i = 0; i < 9; i++) {
    const w = W - 120 - (rand() < 0.3 ? rand() * 150 : rand() * 30);
    ctx.fillStyle = `rgba(42,29,22,${0.5 + rand() * 0.3})`;
    ctx.fillRect(60, 128 + i * 17, w, 3);
  }

  // Pins.
  for (const [px, py] of [[52, 42], [W - 52, 42], [52, H - 42], [W - 52, H - 42]]) {
    ctx.fillStyle = '#8d6a34';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  grain(ctx, W, H, 900, 0.16, 511);
  return finish(canvas);
}

/** Whitewashed prison stone: coursed blocks, damp-stained. */
export function stone() {
  const { canvas, ctx } = surface(512, 512);
  const rand = rng(211);

  ctx.fillStyle = '#9c9382';
  ctx.fillRect(0, 0, 512, 512);

  const courseH = 64;
  for (let row = 0; row * courseH < 512; row++) {
    const offset = row % 2 ? 48 : 0;
    for (let x = -96; x < 512; x += 96) {
      const shade = 0.9 + rand() * 0.2;
      ctx.fillStyle = `rgb(${162 * shade | 0},${154 * shade | 0},${137 * shade | 0})`;
      ctx.fillRect(x + offset + 2, row * courseH + 2, 92, courseH - 4);
    }
  }

  // Damp creeping up from the floor of the texture.
  const damp = ctx.createLinearGradient(0, 512, 0, 300);
  damp.addColorStop(0, 'rgba(64,72,62,.5)');
  damp.addColorStop(1, 'rgba(64,72,62,0)');
  ctx.fillStyle = damp;
  ctx.fillRect(0, 0, 512, 512);

  grain(ctx, 512, 512, 3000, 0.2, 213);
  return finish(canvas, { repeat: [4, 2] });
}

/**
 * The Inspector's notice — the thing that follows you around the map.
 *
 * Deliberately nobody: a cap, a silhouette, a rank. Sanyal's own photograph
 * hangs on the shop wall and is not used here. Being pursued by the colonial
 * police is the history; wearing his face while doing it would not be.
 */
export function inspectorFace() {
  const W = 384;
  const H = 512;
  const { canvas, ctx } = surface(W, H);

  /** The window the photograph occupies, once it arrives. */
  const PANE = { x: 34, y: 92, w: W - 68, h: 300 };

  function notice() {
    ctx.fillStyle = '#d8cbab';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, W - 32, H - 32);

    ctx.textAlign = 'center';
    ctx.fillStyle = RED;
    ctx.font = "bold 30px 'DM Mono', monospace";
    ctx.fillText('BY ORDER', W / 2, 62);

    ctx.fillStyle = INK;
    ctx.font = "bold 26px 'Playfair Display', Georgia, serif";
    ctx.fillText('DETENTION ORDER', W / 2, 436);
    ctx.font = "15px 'DM Mono', monospace";
    ctx.fillStyle = '#5c4630';
    ctx.fillText('PENAL SETTLEMENT', W / 2, 462);
    ctx.fillText('PORT BLAIR', W / 2, 484);
  }

  notice();

  // Until the photograph loads, the pane holds a shoulders-and-cap silhouette —
  // deliberately nobody, so no real face is ever the thing hunting you.
  ctx.fillStyle = '#aa9c7e';
  ctx.fillRect(PANE.x, PANE.y, PANE.w, PANE.h);
  ctx.fillStyle = '#3a3128';
  ctx.beginPath();
  ctx.arc(W / 2, PANE.y + 118, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 112, PANE.y + PANE.h);
  ctx.quadraticCurveTo(W / 2, PANE.y + 168, W / 2 + 112, PANE.y + PANE.h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(PANE.x, PANE.y, PANE.w, PANE.h);

  grain(ctx, W, H, 900, 0.18, 217);

  const texture = finish(canvas);

  /**
   * Drop a photograph into the pane, cropped to fill it, then re-lay the notice
   * text over the top so the order still reads.
   */
  function setPhoto(image) {
    notice();

    const scale = Math.max(PANE.w / image.width, PANE.h / image.height);
    const w = image.width * scale;
    const h = image.height * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(PANE.x, PANE.y, PANE.w, PANE.h);
    ctx.clip();
    ctx.drawImage(image, PANE.x + (PANE.w - w) / 2, PANE.y + (PANE.h - h) / 2, w, h);

    // Cool the photograph towards the notice's ink so it sits in the paper
    // rather than on top of it.
    ctx.fillStyle = 'rgba(60,40,24,.34)';
    ctx.fillRect(PANE.x, PANE.y, PANE.w, PANE.h);
    ctx.restore();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(PANE.x, PANE.y, PANE.w, PANE.h);

    grain(ctx, W, H, 900, 0.18, 217);
    texture.needsUpdate = true;
  }

  return { texture, setPhoto };
}

/** A framed portrait plate, drawn as an empty archival mount. */
export function portraitPlate() {
  const { canvas, ctx } = surface(384, 512);
  ctx.fillStyle = '#d8c398';
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = '#b9a074';
  ctx.fillRect(34, 34, 316, 380);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = "bold 30px 'Playfair Display', Georgia, serif";
  ctx.fillText('SACHINDRA NATH', 192, 456);
  ctx.fillText('SANYAL', 192, 490);

  ctx.font = "18px 'DM Mono', monospace";
  ctx.fillStyle = '#6d4f33';
  ctx.fillText('1893 — 1942', 192, 424);

  grain(ctx, 384, 512, 800, 0.15, 101);
  return finish(canvas);
}
