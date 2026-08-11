/**
 * The Inspector — a framed police notice that follows you through the map.
 *
 * Catching you is not a fail state on its own: it stops you and asks a question
 * drawn from whichever area it caught you in. Answer correctly and it lets you
 * go. Answer wrong and it takes a heart.
 *
 * It moves slower than you do, so it is always escapable and never shakeable.
 * The rooms form a straight chain, so "pathfinding" is: if we are in the same
 * area, walk at them; otherwise walk at the doorway that leads their way.
 */

import * as THREE from 'three';
import { createOfficer } from './officer.js';
import { AREA_CHAIN, GATES, areaAt } from './shop.js';

/** Slower than the player's 3.3, so running away always works. */
const SPEED = 2.05;

/** How close it has to get to stop you. */
const CATCH_RANGE = 1.25;

/** Seconds of freedom after a catch is resolved, either way. */
const STUN = 5;

/** Seconds of grace at the start, before it begins hunting. */
const GRACE = 15;

const RADIUS = 0.4;

/** How far past a doorway to aim, so it steps through instead of parking on it. */
const THROUGH = 1.4;

/** How far in front of a doorway to square up before crossing. */
const APPROACH = 1.6;

/** How near the door's centreline counts as lined up. */
const ALIGN = 0.3;

export function createInspector({ scene, colliders, zones, onCatch }) {
  const group = new THREE.Group();

  const officer = createOfficer();
  group.add(officer.group);
  scene.add(group);

  const state = {
    x: 5,
    z: -9,
    active: false,
    stunnedUntil: 0,
    startedAt: performance.now(),
    stuckFor: 0,
    /** Distance covered this frame, and the heading — both drive the walk cycle. */
    moved: 0,
    dirX: 0,
    dirZ: -1,
    /** The deflection that last got him moving; retried first to avoid dither. */
    lastDeflection: 0,
  };

  function blocked(x, z) {
    for (const c of colliders) {
      if (x > c.minX - RADIUS && x < c.maxX + RADIUS &&
          z > c.minZ - RADIUS && z < c.maxZ + RADIUS) return true;
    }
    return false;
  }

  function walkable(x, z) {
    for (const zone of zones) {
      if (x > zone.minX && x < zone.maxX && z > zone.minZ && z < zone.maxZ) return true;
    }
    return false;
  }

  /**
   * The point to walk at: the player, or the doorway leading toward them.
   *
   * Doorways are crossed in two stages, and both matter:
   *
   *  - Aiming straight at a point *past* the door means approaching the wall
   *    diagonally. Per-axis collision then slides it along the wall and it
   *    wedges in the corner beside the opening, which is the sticking.
   *  - Aiming at the gate itself parks it on the threshold: it arrives, the
   *    distance drops under the movement epsilon, and it stops there forever.
   *
   * So it first squares up in front of the door on the door's own centreline,
   * and only once it is lined up does it aim through.
   */
  function target(player) {
    const mine = areaAt(state.z);
    const theirs = areaAt(player.z);
    if (mine === theirs) return { x: player.x, z: player.z };

    const here = AREA_CHAIN.indexOf(mine);
    const there = AREA_CHAIN.indexOf(theirs);
    const step = there > here ? 1 : -1;
    const from = step > 0 ? mine : AREA_CHAIN[here - 1];
    const to = step > 0 ? AREA_CHAIN[here + 1] : mine;

    const gate = GATES[`${from}|${to}`];
    if (!gate) return { x: player.x, z: player.z };

    // The chain runs back along -Z, so "onward" is -Z and "back" is +Z.
    const onward = -step;
    const lined = Math.abs(state.x - gate.x) < ALIGN;
    const close = Math.abs(state.z - gate.z) < APPROACH + 0.4;

    return lined && close
      ? { x: gate.x, z: gate.z + THROUGH * onward }
      : { x: gate.x, z: gate.z - APPROACH * onward };
  }

  /** Deflections tried, in order, when the straight line is blocked. */
  const DEFLECTIONS = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.4, -2.4];

  /**
   * Move one step along `heading`, steering around anything in the way.
   *
   * Resolving X and Z separately slides nicely along a flat wall but cannot get
   * around a free-standing obstacle — the watchtower sits square on the route to
   * the yard, and per-axis sliding pinned him against it every run. Trying the
   * straight line first and then progressively wider deflections walks him round
   * anything convex, and subsumes wall-sliding as the ±90° case.
   *
   * The last deflection that worked is retried first, which stops him dithering
   * left-right-left around a symmetrical obstacle.
   */
  function stepToward(heading, dt) {
    const order = state.lastDeflection
      ? [state.lastDeflection, ...DEFLECTIONS]
      : DEFLECTIONS;

    for (const offset of order) {
      const angle = heading + offset;
      const vx = Math.sin(angle) * SPEED * dt;
      const vz = Math.cos(angle) * SPEED * dt;
      const nx = state.x + vx;
      const nz = state.z + vz;

      if (walkable(nx, nz) && !blocked(nx, nz)) {
        state.x = nx;
        state.z = nz;
        // Only hold on to a deflection that actually turned him.
        state.lastDeflection = offset === 0 ? 0 : offset;
        return;
      }
    }

    state.lastDeflection = 0;

    // Nothing worked in any direction, which happens when he is standing inside
    // a collider — a spawn point that overlaps furniture, or geometry that moved
    // under him. Push straight out of whatever he is embedded in, otherwise he
    // is stuck there permanently.
    for (const c of colliders) {
      const inside =
        state.x > c.minX - RADIUS && state.x < c.maxX + RADIUS &&
        state.z > c.minZ - RADIUS && state.z < c.maxZ + RADIUS;
      if (!inside) continue;

      // Leave by the nearest face. Pushing away from the box's centre looks
      // simpler but gives a zero-length direction when he is standing exactly on
      // it, which is precisely the case that leaves him embedded forever.
      const exits = [
        { dx: c.minX - RADIUS - state.x, dz: 0 },
        { dx: c.maxX + RADIUS - state.x, dz: 0 },
        { dx: 0, dz: c.minZ - RADIUS - state.z },
        { dx: 0, dz: c.maxZ + RADIUS - state.z },
      ];

      let best = exits[0];
      for (const exit of exits) {
        if (Math.hypot(exit.dx, exit.dz) < Math.hypot(best.dx, best.dz)) best = exit;
      }

      const mag = Math.hypot(best.dx, best.dz) || 1;
      state.x += (best.dx / mag) * SPEED * dt * 2;
      state.z += (best.dz / mag) * SPEED * dt * 2;
      return;
    }
  }

  function update(dt, player) {
    const now = performance.now();

    if (!state.active && now - state.startedAt > GRACE * 1000) state.active = true;

    const stunned = now < state.stunnedUntil;
    const hunting = state.active && !stunned;

    state.moved = 0;

    if (hunting) {
      const aim = target(player);
      const dx = aim.x - state.x;
      const dz = aim.z - state.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.05) {
        const beforeX = state.x;
        const beforeZ = state.z;

        stepToward(Math.atan2(dx, dz), dt);

        state.moved = Math.hypot(state.x - beforeX, state.z - beforeZ);
        if (state.moved > 1e-5) {
          state.dirX = (state.x - beforeX) / state.moved;
          state.dirZ = (state.z - beforeZ) / state.moved;
        }

        // ponytail: last resort only. Steering handles furniture and the door
        // staging handles doorways, so this should never fire — it exists so a
        // geometry change can never strand him permanently.
        state.stuckFor = state.moved < SPEED * dt * 0.25 ? state.stuckFor + dt : 0;
        if (state.stuckFor > 4) {
          const gate = target(player);
          state.x = gate.x;
          state.z = gate.z;
          state.stuckFor = 0;
        }
      }

      if (Math.hypot(player.x - state.x, player.z - state.z) < CATCH_RANGE) {
        state.stunnedUntil = now + 1e9; // held until the catch is resolved
        onCatch(areaAt(player.z));
      }
    }

    // He stands on the floor now rather than floating, so no vertical offset —
    // the walk cycle supplies the bob.
    group.position.set(state.x, 0, state.z);

    // Face where he is going while walking, and face the player once he has you.
    const facing = stunned || state.moved < 1e-4
      ? { x: player.x, z: player.z }
      : { x: state.x + state.dirX, z: state.z + state.dirZ };
    group.lookAt(facing.x, 0, facing.z);

    officer.update(dt, { speed: state.moved / Math.max(dt, 1e-4), stunned });
  }

  return {
    state,
    update,

    /** Called once the caught-question is answered, either way. */
    release() {
      state.stunnedUntil = performance.now() + STUN * 1000;
      state.stuckFor = 0;
    },

    reset() {
      state.x = 5;
      state.z = -9;
      state.active = false;
      state.stunnedUntil = 0;
      state.startedAt = performance.now();
      state.stuckFor = 0;
    },

    /** Distance to the player, for the HUD's proximity warning. */
    distanceTo(player) {
      return Math.hypot(player.x - state.x, player.z - state.z);
    },
  };
}
