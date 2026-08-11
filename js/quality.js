/**
 * Graphics quality.
 *
 * The expensive things here are fill rate (how many pixels get shaded, and how
 * many lights each one pays for) and shadow maps. Everything below is chosen to
 * trade those off rather than to reduce what is actually in the world — a low
 * setting still has all eight areas and all fifty-five exhibits, it just draws
 * them cheaper.
 *
 * The choice is stored per device and applied at boot, because antialiasing and
 * the light-pool size cannot change without recreating the renderer or
 * recompiling every material.
 */

const KEY = 'sanyal-newsstand-quality';

export const LEVELS = {
  low: {
    label: 'LOW',
    note: 'For older phones and laptops. No shadows, fewer lights, half resolution.',
    pixelRatio: 1,
    antialias: false,
    shadows: false,
    lightPool: 3,
    shadowMap: 0,
    fog: [12, 26],
    tvFps: 5,
  },
  medium: {
    label: 'MEDIUM',
    note: 'The default on most devices. No shadows, full light pool.',
    pixelRatio: 1.5,
    antialias: true,
    shadows: false,
    lightPool: 5,
    shadowMap: 0,
    fog: [16, 40],
    tvFps: 10,
  },
  high: {
    label: 'HIGH',
    note: 'Shadows and antialiasing. Wants a desktop or a recent phone.',
    pixelRatio: 2,
    antialias: true,
    shadows: true,
    lightPool: 6,
    shadowMap: 2048,
    fog: [18, 48],
    tvFps: 15,
  },
};

/**
 * A first guess for a device we know nothing about.
 *
 * Deliberately conservative: guessing low on a fast machine costs a little
 * sharpness the player can undo in one click, guessing high on a slow one makes
 * the game feel broken before they find the setting.
 */
export function detect() {
  const cores = navigator.hardwareConcurrency ?? 4;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const memory = navigator.deviceMemory ?? 4;

  if (cores <= 4 || memory <= 2) return 'low';
  if (small || cores <= 6) return 'medium';
  return 'high';
}

export function current() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LEVELS[saved]) return saved;
  } catch {
    // Private mode, or storage disabled — fall through to detection.
  }
  return detect();
}

export function set(name) {
  if (!LEVELS[name]) return;
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // Not being able to remember the choice is not worth failing over.
  }
}

export function settings() {
  return LEVELS[current()];
}
