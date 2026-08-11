/**
 * Sound, synthesised.
 *
 * No audio files: everything here is oscillators and filtered noise through the
 * Web Audio API, so the game is still just the files in this folder. That also
 * means every cue can be tuned by ear in code rather than re-exported.
 *
 * Browsers refuse to start audio before a gesture, so the context is created
 * lazily and `unlock()` is called from the ENTER THE SHOP button.
 */

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctx) return null;

  ctx = new Ctx();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from a click/tap. Safe to call repeatedly. */
export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

/** A short shaped tone. */
function tone({ freq, to = freq, type = 'sine', gain = 0.2, attack = 0.005, decay = 0.18, delay = 0 }) {
  const c = ensure();
  if (!c || muted) return;

  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const env = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + decay);

  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);

  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + decay + 0.05);
}

/** Filtered noise — footsteps, paper, the mill. */
function noise({ duration = 0.12, gain = 0.15, freq = 900, q = 1, type = 'bandpass', delay = 0 }) {
  const c = ensure();
  if (!c || muted) return;

  const t = c.currentTime + delay;
  const frames = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;

  const env = c.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  src.connect(filter).connect(env).connect(master);
  src.start(t);
  src.stop(t + duration);
}

// ---------------------------------------------------------------- cues ------

/** Alternating heel and toe, so a run does not sound like a metronome. */
let stepToggle = 0;
export function footstep(onStone = false) {
  stepToggle ^= 1;
  noise({
    duration: 0.09,
    gain: onStone ? 0.1 : 0.075,
    freq: (onStone ? 1500 : 620) + stepToggle * 130,
    q: onStone ? 1.4 : 0.8,
  });
}

export function openPanel() {
  noise({ duration: 0.18, gain: 0.09, freq: 2600, q: 0.7 });
  tone({ freq: 320, to: 460, type: 'triangle', gain: 0.05, decay: 0.12 });
}

export function closePanel() {
  tone({ freq: 380, to: 240, type: 'triangle', gain: 0.05, decay: 0.11 });
}

export function correct() {
  tone({ freq: 523.25, type: 'sine', gain: 0.16, decay: 0.16 });
  tone({ freq: 659.25, type: 'sine', gain: 0.14, decay: 0.2, delay: 0.09 });
  tone({ freq: 783.99, type: 'sine', gain: 0.12, decay: 0.3, delay: 0.18 });
}

export function wrong() {
  tone({ freq: 196, to: 130, type: 'sawtooth', gain: 0.11, decay: 0.32 });
  tone({ freq: 185, to: 120, type: 'square', gain: 0.05, decay: 0.28, delay: 0.03 });
}

/** Reading an exhibit: a page turning. */
export function page() {
  noise({ duration: 0.16, gain: 0.07, freq: 3200, q: 0.5 });
}

/** The officer has you — a whistle, then the order. */
export function caught() {
  tone({ freq: 1900, to: 2350, type: 'sine', gain: 0.13, attack: 0.02, decay: 0.5 });
  tone({ freq: 2350, to: 1750, type: 'sine', gain: 0.11, decay: 0.42, delay: 0.42 });
  tone({ freq: 110, to: 70, type: 'sawtooth', gain: 0.08, decay: 0.6, delay: 0.1 });
}

/** A heart gone. */
export function heartLost() {
  tone({ freq: 260, to: 90, type: 'triangle', gain: 0.2, decay: 0.55 });
  noise({ duration: 0.3, gain: 0.07, freq: 220, q: 0.6 });
}

export function gameOver() {
  tone({ freq: 330, to: 220, type: 'triangle', gain: 0.16, decay: 0.6 });
  tone({ freq: 220, to: 146, type: 'triangle', gain: 0.15, decay: 0.8, delay: 0.35 });
  tone({ freq: 146, to: 98, type: 'sine', gain: 0.14, decay: 1.4, delay: 0.8 });
}

export function scoreFiled() {
  tone({ freq: 587.33, gain: 0.13, decay: 0.18 });
  tone({ freq: 880, gain: 0.12, decay: 0.35, delay: 0.12 });
}

/** A double thump, played faster the closer he gets. */
export function heartbeat(intensity = 1) {
  const gain = 0.06 + intensity * 0.1;
  tone({ freq: 62, to: 40, type: 'sine', gain, decay: 0.17 });
  tone({ freq: 55, to: 36, type: 'sine', gain: gain * 0.75, decay: 0.2, delay: 0.19 });
}
