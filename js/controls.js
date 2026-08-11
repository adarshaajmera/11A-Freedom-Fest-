/**
 * First-person controls.
 *
 * Movement comes from three sources that all feed the same vector: the on-screen
 * joystick, WASD/arrows, and nothing else. Looking is drag-based rather than
 * pointer-locked, because pointer lock does not exist on touch and a single code
 * path for both is worth more than the small gain in desk comfort.
 *
 * Collision is per-axis against axis-aligned boxes. Resolving X and Z separately
 * is what lets the player slide along a counter instead of sticking to it.
 */

import * as THREE from 'three';

const EYE_HEIGHT = 1.62;
const RADIUS = 0.36;
const SPEED = 3.3;

/** Held-Shift multiplier, or a joystick pushed to the rim. */
const SPRINT = 1.8;

/** Joystick deflection past which you are sprinting. */
const SPRINT_DEFLECTION = 0.86;

const ACCEL = 12;
const PITCH_LIMIT = 1.15;

/** Radians of look per pixel dragged. */
const LOOK_SENSITIVITY = 0.0042;

/** Radians per second when turning with Shift + left/right. */
const KEY_TURN_SPEED = 2.1;

export function createControls({
  camera, colliders, spawn, zones, joystick, stick, lookZone, onStep,
}) {
  const state = {
    x: spawn.x,
    z: spawn.z,
    yaw: spawn.yaw,
    pitch: 0,
    vx: 0,
    vz: 0,
    locked: false,
    moving: false,
    sprinting: false,
    /** Metres since the last footstep. */
    travelled: 0,
  };

  const keys = new Set();
  const joy = { x: 0, y: 0, active: false, pointer: null };
  const look = { pointer: null, lastX: 0, lastY: 0 };

  /** Held Shift turns left/right into looking rather than strafing. */
  let turning = false;

  // ------------------------------------------------------------- keyboard ---

  const KEY_MAP = {
    w: 'f', arrowup: 'f',
    s: 'b', arrowdown: 'b',
    a: 'l', arrowleft: 'l',
    d: 'r', arrowright: 'r',
  };

  addEventListener('keydown', (e) => {
    if (isTyping()) return;
    turning = e.shiftKey;
    const k = KEY_MAP[e.key.toLowerCase()];
    if (k) {
      keys.add(k);
      e.preventDefault();
    }
  });

  addEventListener('keyup', (e) => {
    turning = e.shiftKey;
    const k = KEY_MAP[e.key.toLowerCase()];
    if (k) keys.delete(k);
  });

  // Losing focus mid-stride would otherwise leave the player walking forever.
  addEventListener('blur', () => {
    keys.clear();
    turning = false;
    joy.x = joy.y = 0;
  });

  function isTyping() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }

  // ------------------------------------------------------------- joystick ---

  const JOY_RANGE = 34;

  function setJoy(e) {
    const r = joystick.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const mag = Math.hypot(dx, dy);
    if (mag > JOY_RANGE) {
      dx = (dx / mag) * JOY_RANGE;
      dy = (dy / mag) * JOY_RANGE;
    }
    joy.x = dx / JOY_RANGE;
    joy.y = dy / JOY_RANGE;
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  joystick.addEventListener('pointerdown', (e) => {
    joy.active = true;
    joy.pointer = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    setJoy(e);
    e.preventDefault();
  });

  joystick.addEventListener('pointermove', (e) => {
    if (joy.active && e.pointerId === joy.pointer) setJoy(e);
  });

  const releaseJoy = (e) => {
    if (e.pointerId !== joy.pointer) return;
    joy.active = false;
    joy.pointer = null;
    joy.x = joy.y = 0;
    stick.style.transform = '';
  };

  joystick.addEventListener('pointerup', releaseJoy);
  joystick.addEventListener('pointercancel', releaseJoy);

  // ----------------------------------------------------------------- look ---

  lookZone.addEventListener('pointerdown', (e) => {
    if (look.pointer !== null) return;
    look.pointer = e.pointerId;
    look.lastX = e.clientX;
    look.lastY = e.clientY;
    lookZone.setPointerCapture(e.pointerId);
  });

  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== look.pointer || state.locked) return;
    state.yaw -= (e.clientX - look.lastX) * LOOK_SENSITIVITY;
    state.pitch -= (e.clientY - look.lastY) * LOOK_SENSITIVITY;
    state.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, state.pitch));
    look.lastX = e.clientX;
    look.lastY = e.clientY;
  });

  const endLook = (e) => {
    if (e.pointerId === look.pointer) look.pointer = null;
  };

  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  // ------------------------------------------------------------ collision ---

  /** True if a point sits inside a box grown by the player's radius. */
  function blocked(x, z) {
    for (const c of colliders) {
      if (
        x > c.minX - RADIUS &&
        x < c.maxX + RADIUS &&
        z > c.minZ - RADIUS &&
        z < c.maxZ + RADIUS
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * True if the point is on walkable floor.
   *
   * The shop is several overlapping rectangles rather than one room — the floor,
   * the doorway, the composing room behind it — so anywhere inside *any* of them
   * counts. The zones are already inset from the walls by shop.js, which is what
   * keeps the camera from pushing through plaster.
   */
  function walkable(x, z) {
    for (const zone of zones) {
      if (x > zone.minX && x < zone.maxX && z > zone.minZ && z < zone.maxZ) return true;
    }
    return false;
  }

  // ----------------------------------------------------------------- tick ---

  function update(dt) {
    // Intent, in camera-relative axes: +forward, +right.
    let forward = 0;
    let right = 0;

    if (!state.locked) {
      if (keys.has('f')) forward += 1;
      if (keys.has('b')) forward -= 1;

      if (turning) {
        // Shift + left/right swings the view instead of stepping sideways, so
        // the whole shop is reachable from the keyboard without a mouse drag.
        if (keys.has('l')) state.yaw += KEY_TURN_SPEED * dt;
        if (keys.has('r')) state.yaw -= KEY_TURN_SPEED * dt;
      } else {
        if (keys.has('r')) right += 1;
        if (keys.has('l')) right -= 1;
      }

      // The joystick's screen-down is the player's backward.
      forward -= joy.y;
      right += joy.x;
    }

    const mag = Math.hypot(forward, right);
    if (mag > 1) {
      forward /= mag;
      right /= mag;
    }

    // Sprinting. Shift on a keyboard — it doubles as the turn modifier, which
    // is fine because turning and running are not mutually exclusive — and on
    // touch, a joystick pushed to the rim, so no extra thumb button is needed.
    state.sprinting =
      !state.locked &&
      mag > 0.1 &&
      (turning || Math.hypot(joy.x, joy.y) > SPRINT_DEFLECTION);

    const speed = SPEED * (state.sprinting ? SPRINT : 1);

    // Rotate intent into world space. At yaw 0 the camera looks down -Z.
    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);
    const targetVx = (forward * -sin + right * cos) * speed;
    const targetVz = (forward * -cos - right * sin) * speed;

    const blend = Math.min(1, ACCEL * dt);
    state.vx += (targetVx - state.vx) * blend;
    state.vz += (targetVz - state.vz) * blend;

    state.moving = Math.hypot(state.vx, state.vz) > 0.35;

    const startX = state.x;
    const startZ = state.z;

    // Resolve one axis at a time so a blocked X still allows movement in Z.
    // That is what lets the player slide along a counter, and what lets them
    // walk through the back doorway without having to aim at it exactly.
    const nextX = state.x + state.vx * dt;
    if (walkable(nextX, state.z) && !blocked(nextX, state.z)) state.x = nextX;
    else state.vx = 0;

    const nextZ = state.z + state.vz * dt;
    if (walkable(state.x, nextZ) && !blocked(state.x, nextZ)) state.z = nextZ;
    else state.vz = 0;

    // Footsteps are fired by distance covered, not by a timer, so they stay in
    // step whatever the speed and never tick while standing still.
    const travelled = Math.hypot(state.x - startX, state.z - startZ);
    state.travelled += travelled;
    if (state.travelled > (state.sprinting ? 1.05 : 1.45)) {
      state.travelled = 0;
      onStep?.(state);
    }

    // A slight bob while walking, quicker at a run.
    const bobRate = state.sprinting ? 14 : 9;
    const bob = state.moving
      ? Math.sin((performance.now() / 1000) * bobRate) * (state.sprinting ? 0.034 : 0.022)
      : 0;

    camera.position.set(state.x, EYE_HEIGHT + bob, state.z);
    camera.rotation.set(0, 0, 0, 'YXZ');
    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
  }

  /** The direction the camera is facing, flattened to the floor plane. */
  function facing() {
    return new THREE.Vector2(-Math.sin(state.yaw), -Math.cos(state.yaw));
  }

  return {
    state,
    update,
    facing,
    setLocked(locked) {
      state.locked = locked;
      if (locked) {
        keys.clear();
        joy.x = joy.y = 0;
        stick.style.transform = '';
        state.vx = state.vz = 0;
      }
    },
  };
}
