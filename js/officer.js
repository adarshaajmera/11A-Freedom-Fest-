/**
 * The officer — a walking figure built from primitives.
 *
 * No model file: the whole game is still the files in this folder, so he is
 * boxes and cylinders with a hand-driven walk cycle. That is enough at the range
 * you ever see him, and it costs nothing to load.
 *
 * He is deliberately nobody. A uniform, a cap and a lantern; no face beyond eyes,
 * no name, no likeness of any real person.
 */

import * as THREE from 'three';

const KHAKI = '#8a7a55';
const KHAKI_DARK = '#6d5f41';
const BELT = '#3b2b1c';
const SKIN = '#b98a5f';
const CAP = '#3c3524';

/** Hip and shoulder swing at full stride, in radians. */
const STRIDE = 0.85;

export function createOfficer() {
  const group = new THREE.Group();

  const mat = (color, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness });

  const khaki = mat(KHAKI);
  const khakiDark = mat(KHAKI_DARK);
  const skin = mat(SKIN, 0.9);
  const belt = mat(BELT, 0.6);
  const capMat = mat(CAP, 0.7);

  // --- torso ---------------------------------------------------------------

  const body = new THREE.Group();
  body.position.y = 1.02;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.26), khaki);
  chest.position.y = 0.28;
  chest.castShadow = true;
  body.add(chest);

  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.28), belt);
  sash.position.set(0, 0.3, 0);
  sash.rotation.z = 0.5;
  body.add(sash);

  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.28), belt);
  waist.position.y = 0.02;
  body.add(waist);

  // --- head ----------------------------------------------------------------

  const head = new THREE.Group();
  head.position.y = 0.72;
  body.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skin);
  skull.castShadow = true;
  head.add(skull);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 10), skin);
  neck.position.y = -0.15;
  head.add(neck);

  for (const dx of [-0.055, 0.055]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.021, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#1d1712' })
    );
    eye.position.set(dx, 0.02, 0.132);
    head.add(eye);
  }

  const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.148, 0.11, 16), capMat);
  capCrown.position.y = 0.12;
  head.add(capCrown);

  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.158, 0.04, 16), belt);
  capBand.position.y = 0.062;
  head.add(capBand);

  const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.022, 16, 1, false, 0, Math.PI), belt);
  peak.position.set(0, 0.055, 0.075);
  peak.rotation.x = -0.16;
  head.add(peak);

  // --- limbs ---------------------------------------------------------------

  /** A limb hinged at the top, so rotating the group swings the whole leg/arm. */
  function limb(width, upperLen, lowerLen, upperMat, lowerMat, footMat) {
    const hinge = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.BoxGeometry(width, upperLen, width), upperMat);
    upper.position.y = -upperLen / 2;
    upper.castShadow = true;
    hinge.add(upper);

    const knee = new THREE.Group();
    knee.position.y = -upperLen;
    hinge.add(knee);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, lowerLen, width * 0.92), lowerMat);
    lower.position.y = -lowerLen / 2;
    lower.castShadow = true;
    knee.add(lower);

    if (footMat) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(width * 1.05, 0.09, width * 1.7), footMat);
      foot.position.set(0, -lowerLen - 0.04, 0.04);
      knee.add(foot);
    }

    return { hinge, knee };
  }

  const boots = mat('#2c2118', 0.7);

  const legL = limb(0.16, 0.42, 0.42, khakiDark, khakiDark, boots);
  const legR = limb(0.16, 0.42, 0.42, khakiDark, khakiDark, boots);
  legL.hinge.position.set(-0.12, 0.02, 0);
  legR.hinge.position.set(0.12, 0.02, 0);
  body.add(legL.hinge, legR.hinge);

  const armL = limb(0.13, 0.3, 0.3, khaki, skin, null);
  const armR = limb(0.13, 0.3, 0.3, khaki, skin, null);
  armL.hinge.position.set(-0.29, 0.52, 0);
  armR.hinge.position.set(0.29, 0.52, 0);
  body.add(armL.hinge, armR.hinge);

  // --- lantern -------------------------------------------------------------

  // Carried in the left hand. It is also how he announces himself down a dark
  // passage before you can make him out.
  const lantern = new THREE.Group();
  lantern.position.y = -0.32;
  armL.knee.add(lantern);

  const lanternBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.16, 0.12),
    new THREE.MeshStandardMaterial({ color: '#c08b3e', roughness: 0.4, metalness: 0.7 })
  );
  lantern.add(lanternBody);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#ffd9a0' })
  );
  lantern.add(flame);

  const lanternLight = new THREE.PointLight('#ffb06a', 1.1, 9, 2);
  lantern.add(lanternLight);

  // --- animation -----------------------------------------------------------

  let phase = 0;

  /**
   * Drive the walk.
   *
   * `speed` is metres per second actually travelled, so the cycle slows and
   * stops with him instead of running on the spot.
   */
  function update(dt, { speed = 0, stunned = false } = {}) {
    const gait = Math.min(1, speed / 2.05);
    phase += dt * (3.2 + gait * 5.5);

    const swing = Math.sin(phase) * STRIDE * gait;
    const counter = Math.sin(phase + Math.PI) * STRIDE * gait;

    legL.hinge.rotation.x = swing;
    legR.hinge.rotation.x = counter;

    // Knees only bend on the backswing, which is what stops it looking like a
    // pair of scissors.
    legL.knee.rotation.x = Math.max(0, -swing) * 0.9;
    legR.knee.rotation.x = Math.max(0, -counter) * 0.9;

    armL.hinge.rotation.x = counter * 0.6;
    armR.hinge.rotation.x = swing * 0.6;
    armL.knee.rotation.x = 0.35 + Math.max(0, counter) * 0.3;
    armR.knee.rotation.x = 0.25;

    // Bob twice per stride, and lean very slightly into the walk.
    body.position.y = 1.02 + Math.abs(Math.sin(phase)) * 0.035 * gait;
    body.rotation.x = gait * 0.06;
    head.rotation.x = -gait * 0.06 + Math.sin(phase * 2) * 0.02;

    if (stunned) {
      // Caught up with you and waiting on an answer: lantern raised, held still.
      armR.hinge.rotation.x = -0.9;
      armR.knee.rotation.x = -0.8;
      body.rotation.x = 0;
      lanternLight.intensity = 1.5;
      flame.scale.setScalar(1.25);
    } else {
      lanternLight.intensity = 1.1 + Math.sin(phase * 3) * 0.12;
      flame.scale.setScalar(1);
    }
  }

  return { group, update };
}
