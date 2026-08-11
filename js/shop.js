/**
 * The shop, built from primitives.
 *
 * Two rooms: the shop floor, and a composing room through a doorway in the back
 * wall. Returns the scene plus the three things the rest of the game needs to
 * reason about it — `stations` (what you can walk up to), `colliders` (furniture
 * you cannot walk through) and `zones` (floor you are allowed to stand on).
 *
 * All three are plain data. No raycasting is involved in movement or in
 * interaction, which keeps the whole thing cheap enough for a phone.
 */

import * as THREE from 'three';
import * as TX from './textures.js';
import { PAPERS, FRAMES } from './content.js';

export const ROOM = { width: 16, depth: 11, height: 3.6 };

const HALF_W = ROOM.width / 2;
const HALF_D = ROOM.depth / 2;

/** The composing room, behind the shop. */
const BACK = { minX: 1, maxX: 9, minZ: -13, maxZ: -HALF_D, height: 3.1 };

/** The passage running back from the composing room to the jail. */
const HALL = { minX: 4, maxX: 6.6, minZ: -22, maxZ: -13, height: 2.8 };

/** The jail wing. */
const JAIL = { minX: -3, maxX: 13, minZ: -36, maxZ: -22, height: 5 };

/** The labour yard behind it — open to the sky. */
const YARD_A = { minX: -6, maxX: 16, minZ: -54, maxZ: -36, height: 7 };

/**
 * Three museum halls beyond the yard.
 *
 * The jail became a national memorial, so the wing past the yard is the museum
 * built inside it: a reconstructed safe house, the colonial file, and a
 * memorial hall carrying the chronology.
 */
const SAFE = { minX: -2, maxX: 14, minZ: -70, maxZ: -54, height: 3.4 };
const RECS = { minX: -2, maxX: 14, minZ: -84, maxZ: -70, height: 3.6 };
const MEMO = { minX: -8, maxX: 20, minZ: -106, maxZ: -84, height: 6.5 };

/** The gaps joining them. */
const DOOR = { minX: 5, maxX: 6.8, height: 2.5 };
const DOOR2 = { minX: 4.5, maxX: 6.1, height: 2.4 };
const DOOR3 = { minX: 4.5, maxX: 6.1, height: 2.6 };
const DOOR4 = { minX: 4.2, maxX: 6.4, height: 3 };
const DOOR5 = { minX: 4.4, maxX: 6.2, height: 2.7 };
const DOOR6 = { minX: 4.4, maxX: 6.2, height: 2.7 };
const DOOR7 = { minX: 4.2, maxX: 6.6, height: 3.2 };

/**
 * Where one area hands over to the next, for anything that has to walk between
 * them. The rooms form a straight chain, so this is a list rather than a graph.
 */
export const AREA_CHAIN = [
  'shop', 'composing', 'corridor', 'jail', 'yard', 'safehouse', 'records', 'memorial',
];

export const GATES = {
  'shop|composing': { x: 5.9, z: -HALF_D },
  'composing|corridor': { x: 5.3, z: -13 },
  'corridor|jail': { x: 5.3, z: -22 },
  'jail|yard': { x: 5.3, z: -36 },
  'yard|safehouse': { x: 5.3, z: -54 },
  'safehouse|records': { x: 5.3, z: -70 },
  'records|memorial': { x: 5.4, z: -84 },
};

/** Which area a point is in. The chain runs back along -Z, so z decides it. */
export function areaAt(z) {
  if (z > -HALF_D) return 'shop';
  if (z > -13) return 'composing';
  if (z > -22) return 'corridor';
  if (z > -36) return 'jail';
  if (z > -54) return 'yard';
  if (z > -70) return 'safehouse';
  if (z > -84) return 'records';
  return 'memorial';
}

/** How close the player must stand before a station can be opened. */
export const REACH = 2.7;

/** How far the walkable floor is inset from each wall. */
const WALL_MARGIN = 0.34;

export function buildShop({
  shadows = true, lightPool = 5, shadowMap = 2048, fog = [16, 40], tvFps = 10,
} = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a120c');
  scene.fog = new THREE.Fog('#1a120c', fog[0], fog[1]);

  const colliders = [];
  const stations = [];
  const tickers = [];

  // Rooms are built before the lighting helper exists, so lamps they ask for are
  // queued here and hung once it does.
  const hangLampLater = [];

  /**
   * Light fixtures as data, not as lights.
   *
   * Every point light in the scene is evaluated by every material's fragment
   * shader for every pixel it covers, so thirty of them made standing near a
   * wall crawl — the wall fills the screen and each pixel pays for all thirty.
   *
   * Instead the map registers fixtures here, and a small fixed pool of real
   * lights follows the player, snapping to the nearest ones. The shader cost is
   * then constant wherever you stand, and because the *count* never changes
   * Three.js never has to recompile a material mid-walk.
   */
  const fixtures = [];
  const addFixture = (x, y, z, color, intensity, distance = 12) =>
    fixtures.push({ x, y, z, color: new THREE.Color(color), intensity, distance });

  /** How many point lights actually exist. Raising this costs real frame time. */
  const LIGHT_POOL = lightPool;

  /** Register an axis-aligned no-go box, given a centre and a footprint. */
  const block = (x, z, w, d) =>
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });

  /**
   * Walkable floor. Three overlapping rectangles: the shop, the doorway, and the
   * composing room. They must overlap, or the player gets stuck on the seam.
   */
  const zones = [
    {
      minX: -HALF_W + WALL_MARGIN,
      maxX: HALF_W - WALL_MARGIN,
      minZ: -HALF_D + WALL_MARGIN,
      maxZ: HALF_D - WALL_MARGIN,
    },
    {
      minX: DOOR.minX + 0.2,
      maxX: DOOR.maxX - 0.2,
      minZ: -HALF_D - 0.6,
      maxZ: -HALF_D + 0.6,
    },
    {
      minX: BACK.minX + WALL_MARGIN,
      maxX: BACK.maxX - WALL_MARGIN,
      minZ: BACK.minZ + WALL_MARGIN,
      // Stops short of the shared wall. Reaching past it to meet the shop zone
      // would open the whole wall as walkable, not just the doorway — the door
      // zone below is what joins the two rooms.
      maxZ: BACK.maxZ - WALL_MARGIN,
    },
    {
      minX: DOOR2.minX + 0.2,
      maxX: DOOR2.maxX - 0.2,
      minZ: HALL.maxZ - 0.6,
      maxZ: HALL.maxZ + 0.6,
    },
    {
      minX: HALL.minX + WALL_MARGIN,
      maxX: HALL.maxX - WALL_MARGIN,
      minZ: HALL.minZ + WALL_MARGIN,
      maxZ: HALL.maxZ - WALL_MARGIN,
    },
    {
      minX: DOOR3.minX + 0.2,
      maxX: DOOR3.maxX - 0.2,
      minZ: JAIL.maxZ - 0.6,
      maxZ: JAIL.maxZ + 0.6,
    },
    {
      minX: JAIL.minX + WALL_MARGIN,
      maxX: JAIL.maxX - WALL_MARGIN,
      minZ: JAIL.minZ + WALL_MARGIN,
      maxZ: JAIL.maxZ - WALL_MARGIN,
    },
    {
      minX: DOOR4.minX + 0.2,
      maxX: DOOR4.maxX - 0.2,
      minZ: YARD_A.maxZ - 0.6,
      maxZ: YARD_A.maxZ + 0.6,
    },
    {
      minX: YARD_A.minX + WALL_MARGIN,
      maxX: YARD_A.maxX - WALL_MARGIN,
      minZ: YARD_A.minZ + WALL_MARGIN,
      maxZ: YARD_A.maxZ - WALL_MARGIN,
    },
    ...[
      [DOOR5, YARD_A.minZ], [DOOR6, SAFE.minZ], [DOOR7, RECS.minZ],
    ].map(([door, z]) => ({
      minX: door.minX + 0.2,
      maxX: door.maxX - 0.2,
      minZ: z - 0.6,
      maxZ: z + 0.6,
    })),
    ...[SAFE, RECS, MEMO].map((room) => ({
      minX: room.minX + WALL_MARGIN,
      maxX: room.maxX - WALL_MARGIN,
      minZ: room.minZ + WALL_MARGIN,
      maxZ: room.maxZ - WALL_MARGIN,
    })),
  ];

  const woodTex = TX.woodFloor();

  // One brick texture, tinted per room. Generating a canvas per wall would cost
  // memory and load time for a difference nobody can see.
  const brickTex = TX.brick({ tone: 0.15 });

  const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.86 });
  const wall = new THREE.MeshStandardMaterial({
    map: brickTex,
    color: '#c9a678',
    roughness: 0.94,
  });
  const trim = new THREE.MeshStandardMaterial({ color: '#5d3520', roughness: 0.7 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#4b2e1c', roughness: 0.65 });
  const brass = new THREE.MeshStandardMaterial({
    color: '#c08b3e',
    roughness: 0.35,
    metalness: 0.75,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: '#33302c',
    roughness: 0.5,
    metalness: 0.6,
  });

  /** A wall panel, given its centre, size and rotation. */
  const panel = (w, h, x, y, z, rotY = 0, material = wall) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = shadows;
    scene.add(mesh);
    return mesh;
  };

  // ------------------------------------------------------------ shop shell ---

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), wood);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = shadows;
  scene.add(floor);

  // Boarded ceiling rather than a flat brown plane: the same plank texture as
  // the wainscot, which gives it a direction and something to catch the lamps.
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: TX.plankWall(),
    color: '#8a6a4a',
    roughness: 1,
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);

  // Joists across the shop ceiling, so it reads as a built thing.
  for (let i = -3; i <= 3; i++) {
    const joist = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, 0.16, 0.22), trim);
    joist.position.set(0, ROOM.height - 0.09, i * 1.5);
    scene.add(joist);
  }

  panel(ROOM.width, ROOM.height, 0, ROOM.height / 2, HALF_D, Math.PI); // shopfront
  panel(ROOM.depth, ROOM.height, -HALF_W, ROOM.height / 2, 0, Math.PI / 2); // west
  panel(ROOM.depth, ROOM.height, HALF_W, ROOM.height / 2, 0, -Math.PI / 2); // east

  // Back wall, in three pieces so the doorway is a real hole.
  const leftW = DOOR.minX - -HALF_W;
  panel(leftW, ROOM.height, -HALF_W + leftW / 2, ROOM.height / 2, -HALF_D);
  const rightW = HALF_W - DOOR.maxX;
  panel(rightW, ROOM.height, DOOR.maxX + rightW / 2, ROOM.height / 2, -HALF_D);
  panel(
    DOOR.maxX - DOOR.minX,
    ROOM.height - DOOR.height,
    (DOOR.minX + DOOR.maxX) / 2,
    DOOR.height + (ROOM.height - DOOR.height) / 2,
    -HALF_D
  );

  /**
   * A finished doorway: jambs, a lintel, an architrave standing proud of the
   * wall on both faces, and a threshold board underfoot. Every opening in the
   * map gets one, so no door is just a hole cut in a plane.
   */
  const doorway = (door, z, height, depth = 0.34) => {
    const width = door.maxX - door.minX;
    const centre = (door.minX + door.maxX) / 2;

    for (const x of [door.minX, door.maxX]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, depth), trim);
      jamb.position.set(x, height / 2, z);
      jamb.castShadow = shadows;
      scene.add(jamb);

      for (const dz of [-depth / 2 - 0.03, depth / 2 + 0.03]) {
        const casing = new THREE.Mesh(new THREE.BoxGeometry(0.28, height + 0.16, 0.06), darkWood);
        casing.position.set(x, (height + 0.16) / 2, z + dz);
        scene.add(casing);
      }
    }

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.32, 0.2, depth), trim);
    lintel.position.set(centre, height, z);
    lintel.castShadow = shadows;
    scene.add(lintel);

    for (const dz of [-depth / 2 - 0.03, depth / 2 + 0.03]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(width + 0.56, 0.16, 0.06), darkWood);
      head.position.set(centre, height + 0.08, z + dz);
      scene.add(head);
    }

    const threshold = new THREE.Mesh(new THREE.BoxGeometry(width + 0.32, 0.05, depth), darkWood);
    threshold.position.set(centre, 0.025, z);
    scene.add(threshold);
  };

  doorway(DOOR, -HALF_D, DOOR.height);

  /**
   * Wainscot: lined wooden boarding to waist height, capped with a chair rail
   * and finished with a skirting at the floor. Three bands rather than one flat
   * block — the rail and skirting are what stop a wall reading as a tinted
   * rectangle, because they catch light at different angles.
   */
  const panelling = new THREE.MeshStandardMaterial({ map: TX.plankWall(), roughness: 0.8 });
  const boardGeo = new THREE.BoxGeometry(1, 0.82, 1);
  const railGeo = new THREE.BoxGeometry(1, 0.1, 1);
  const skirtingGeo = new THREE.BoxGeometry(1, 0.16, 1);

  const skirt = (x, z, w, d) => {
    const boards = new THREE.Mesh(boardGeo, panelling);
    boards.position.set(x, 0.49, z);
    boards.scale.set(w, 1, d);
    boards.receiveShadow = shadows;
    scene.add(boards);

    // The rail and skirting stand proud of the boarding — but only across the
    // wall's *thickness*. A run along Z is passed (0.12, length), so scaling the
    // depth would stretch the rail to nearly twice the wall's length and send it
    // out across the room as a floating beam.
    const alongX = w >= d;
    const proudW = alongX ? w : w * 1.9 + 0.06;
    const proudD = alongX ? d * 1.9 + 0.06 : d;

    const rail = new THREE.Mesh(railGeo, trim);
    rail.position.set(x, 0.93, z);
    rail.scale.set(proudW, 1, proudD);
    scene.add(rail);

    const skirting = new THREE.Mesh(skirtingGeo, trim);
    skirting.position.set(x, 0.08, z);
    skirting.scale.set(proudW, 1, proudD);
    scene.add(skirting);
  };
  skirt(-HALF_W + leftW / 2, -HALF_D + 0.06, leftW, 0.12);
  skirt(DOOR.maxX + rightW / 2, -HALF_D + 0.06, rightW, 0.12);
  skirt(0, HALF_D - 0.06, ROOM.width, 0.12);
  skirt(-HALF_W + 0.06, 0, 0.12, ROOM.depth);
  skirt(HALF_W - 0.06, 0, 0.12, ROOM.depth);

  // ---------------------------------------------------- composing room shell ---

  const backW = BACK.maxX - BACK.minX;
  const backD = BACK.maxZ - BACK.minZ;
  const backCX = (BACK.minX + BACK.maxX) / 2;
  const backCZ = (BACK.minZ + BACK.maxZ) / 2;

  const backFloor = new THREE.Mesh(new THREE.PlaneGeometry(backW, backD), wood);
  backFloor.rotation.x = -Math.PI / 2;
  backFloor.position.set(backCX, 0, backCZ);
  backFloor.receiveShadow = shadows;
  scene.add(backFloor);

  const backCeiling = new THREE.Mesh(new THREE.PlaneGeometry(backW, backD), ceilingMat);
  backCeiling.rotation.x = Math.PI / 2;
  backCeiling.position.set(backCX, BACK.height, backCZ);
  scene.add(backCeiling);

  // No far wall here: it is built in segments further down, around the doorway
  // through to the passage. A solid panel at BACK.minZ would sit right over that
  // opening and seal it.
  panel(backD, BACK.height, BACK.minX, BACK.height / 2, backCZ, Math.PI / 2); // west
  panel(backD, BACK.height, BACK.maxX, BACK.height / 2, backCZ, -Math.PI / 2); // east

  // The composing room's own side of the shared wall, either side of the door.
  const bLeft = DOOR.minX - BACK.minX;
  panel(bLeft, BACK.height, BACK.minX + bLeft / 2, BACK.height / 2, BACK.maxZ, Math.PI);
  const bRight = BACK.maxX - DOOR.maxX;
  panel(bRight, BACK.height, DOOR.maxX + bRight / 2, BACK.height / 2, BACK.maxZ, Math.PI);

  skirt(BACK.minX + 0.06, backCZ, 0.12, backD);
  skirt(BACK.maxX - 0.06, backCZ, 0.12, backD);

  // The composing room's far wall, with the passage cut out of it.
  const cLeft = DOOR2.minX - BACK.minX;
  panel(cLeft, BACK.height, BACK.minX + cLeft / 2, BACK.height / 2, BACK.minZ);
  const cRight = BACK.maxX - DOOR2.maxX;
  panel(cRight, BACK.height, DOOR2.maxX + cRight / 2, BACK.height / 2, BACK.minZ);
  panel(
    DOOR2.maxX - DOOR2.minX,
    BACK.height - DOOR2.height,
    (DOOR2.minX + DOOR2.maxX) / 2,
    DOOR2.height + (BACK.height - DOOR2.height) / 2,
    BACK.minZ
  );
  skirt(BACK.minX + cLeft / 2, BACK.minZ + 0.06, cLeft, 0.12);
  skirt(DOOR2.maxX + cRight / 2, BACK.minZ + 0.06, cRight, 0.12);
  doorway(DOOR2, BACK.minZ, DOOR2.height);

  // ------------------------------------------------------------- passage ---

  const hallW = HALL.maxX - HALL.minX;
  const hallD = HALL.maxZ - HALL.minZ;
  const hallCX = (HALL.minX + HALL.maxX) / 2;
  const hallCZ = (HALL.minZ + HALL.maxZ) / 2;

  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallD), wood);
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(hallCX, 0, hallCZ);
  hallFloor.receiveShadow = shadows;
  scene.add(hallFloor);

  const hallCeiling = new THREE.Mesh(new THREE.PlaneGeometry(hallW, hallD), ceilingMat);
  hallCeiling.rotation.x = Math.PI / 2;
  hallCeiling.position.set(hallCX, HALL.height, hallCZ);
  scene.add(hallCeiling);

  panel(hallD, HALL.height, HALL.minX, HALL.height / 2, hallCZ, Math.PI / 2);
  panel(hallD, HALL.height, HALL.maxX, HALL.height / 2, hallCZ, -Math.PI / 2);
  skirt(HALL.minX + 0.06, hallCZ, 0.12, hallD);
  skirt(HALL.maxX - 0.06, hallCZ, 0.12, hallD);

  // A few bulbs down the passage, spaced so it reads as a long walk.
  // The passage is long and windowless, so it gets a lamp roughly every three
  // metres rather than the three it had, which left black stretches between.
  for (const z of [-14.5, -17, -19.5, -21.5]) {
    hangLampLater.push([hallCX, z, HALL.height, 0.9]);
  }

  // -------------------------------------------------------- the jail wing ---

  const jailW = JAIL.maxX - JAIL.minX;
  const jailD = JAIL.maxZ - JAIL.minZ;
  const jailCX = (JAIL.minX + JAIL.maxX) / 2;
  const jailCZ = (JAIL.minZ + JAIL.maxZ) / 2;

  // The jail is the same brickwork, colder and greyer — one texture, one tint.
  const stoneMat = new THREE.MeshStandardMaterial({
    map: brickTex,
    color: '#aab0ad',
    roughness: 1,
  });

  const jailFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(jailW, jailD),
    new THREE.MeshStandardMaterial({ color: '#6e6a5e', roughness: 1 })
  );
  jailFloor.rotation.x = -Math.PI / 2;
  jailFloor.position.set(jailCX, 0, jailCZ);
  jailFloor.receiveShadow = shadows;
  scene.add(jailFloor);

  // Vaulted brick overhead rather than a black slab — the jail's ceiling was
  // reading as a hole in the world.
  const jailCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(jailW, jailD),
    new THREE.MeshStandardMaterial({ map: brickTex, color: '#7b7d78', roughness: 1 })
  );
  jailCeiling.rotation.x = Math.PI / 2;
  jailCeiling.position.set(jailCX, JAIL.height, jailCZ);
  scene.add(jailCeiling);

  // Far wall omitted here too — it is segmented around the gate to the yard.
  panel(jailD, JAIL.height, JAIL.minX, JAIL.height / 2, jailCZ, Math.PI / 2, stoneMat);
  panel(jailD, JAIL.height, JAIL.maxX, JAIL.height / 2, jailCZ, -Math.PI / 2, stoneMat);

  // The wall you come in through, either side of the passage door.
  const jLeft = DOOR3.minX - JAIL.minX;
  panel(jLeft, JAIL.height, JAIL.minX + jLeft / 2, JAIL.height / 2, JAIL.maxZ, Math.PI, stoneMat);
  const jRight = JAIL.maxX - DOOR3.maxX;
  panel(jRight, JAIL.height, DOOR3.maxX + jRight / 2, JAIL.height / 2, JAIL.maxZ, Math.PI, stoneMat);
  doorway(DOOR3, JAIL.maxZ, DOOR3.height, 0.5);

  // The central watchtower: seven wings radiated from one of these, which is the
  // fact CELL 03 is about, so it is worth being able to walk around it.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.7, JAIL.height, 20),
    stoneMat
  );
  tower.position.set(jailCX, JAIL.height / 2, jailCZ + 1);
  tower.castShadow = shadows;
  scene.add(tower);
  block(jailCX, jailCZ + 1, 3.4, 3.4);

  const towerRail = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.85, 0.22, 20),
    new THREE.MeshStandardMaterial({ color: '#4b463c', roughness: 0.8 })
  );
  towerRail.position.set(jailCX, 3.1, jailCZ + 1);
  scene.add(towerRail);

  addFixture(jailCX, 3.6, jailCZ + 1, '#cfe0ff', 1.1, 20);

  // The jail's far wall, with the gate through to the yard.
  const yLeft = DOOR4.minX - JAIL.minX;
  panel(yLeft, JAIL.height, JAIL.minX + yLeft / 2, JAIL.height / 2, JAIL.minZ, 0, stoneMat);
  const yRight = JAIL.maxX - DOOR4.maxX;
  panel(yRight, JAIL.height, DOOR4.maxX + yRight / 2, JAIL.height / 2, JAIL.minZ, 0, stoneMat);
  panel(
    DOOR4.maxX - DOOR4.minX,
    JAIL.height - DOOR4.height,
    (DOOR4.minX + DOOR4.maxX) / 2,
    DOOR4.height + (JAIL.height - DOOR4.height) / 2,
    JAIL.minZ,
    0,
    stoneMat
  );

  // ------------------------------------------------------- the labour yard ---

  const yardW = YARD_A.maxX - YARD_A.minX;
  const yardD = YARD_A.maxZ - YARD_A.minZ;
  const yardCX = (YARD_A.minX + YARD_A.maxX) / 2;
  const yardCZ = (YARD_A.minZ + YARD_A.maxZ) / 2;

  const yardFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(yardW, yardD),
    new THREE.MeshStandardMaterial({ color: '#7a7361', roughness: 1 })
  );
  yardFloor.rotation.x = -Math.PI / 2;
  yardFloor.position.set(yardCX, 0, yardCZ);
  yardFloor.receiveShadow = shadows;
  scene.add(yardFloor);

  // Open to the sky. A flat grey plane read as a low ceiling rather than as
  // outdoors, so this is a graded sky with the light coming from one side.
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(yardW, yardD),
    new THREE.MeshBasicMaterial({ map: TX.skyDome() })
  );
  sky.rotation.x = Math.PI / 2;
  sky.position.set(yardCX, YARD_A.height, yardCZ);
  scene.add(sky);

  // Sides only. The far wall is segmented around the gate to the museum wing
  // further down — a solid panel here would seal it, which it did.
  for (const [w, x, z, rot] of [
    [yardD, YARD_A.minX, yardCZ, Math.PI / 2],
    [yardD, YARD_A.maxX, yardCZ, -Math.PI / 2],
  ]) {
    panel(w, YARD_A.height, x, YARD_A.height / 2, z, rot, stoneMat);
  }

  const wLeft = DOOR4.minX - YARD_A.minX;
  panel(wLeft, YARD_A.height, YARD_A.minX + wLeft / 2, YARD_A.height / 2, YARD_A.maxZ, Math.PI, stoneMat);
  const wRight = YARD_A.maxX - DOOR4.maxX;
  panel(wRight, YARD_A.height, DOOR4.maxX + wRight / 2, YARD_A.height / 2, YARD_A.maxZ, Math.PI, stoneMat);
  doorway(DOOR4, YARD_A.maxZ, DOOR4.height, 0.5);

  // The yard's daylight comes from the single roaming sun, retargeted when the
  // player steps outdoors — see the lighting section below.

  // ------------------------------------------------------- museum halls -----

  /**
   * A room shell: floor, ceiling, four walls, and a gap in whichever end walls
   * carry a doorway. Written once because the museum wing needs it three times
   * and the earlier rooms each hand-rolled it — which is how two of them ended
   * up with a solid panel sealing their own door.
   */
  function roomShell(room, {
    floorMat, ceilingColor, wallMat, nearDoor, farDoor, skirting = false,
  }) {
    const w = room.maxX - room.minX;
    const d = room.maxZ - room.minZ;
    const cx = (room.minX + room.maxX) / 2;
    const cz = (room.minZ + room.maxZ) / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = shadows;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: ceilingColor, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, room.height, cz);
    scene.add(ceiling);

    panel(d, room.height, room.minX, room.height / 2, cz, Math.PI / 2, wallMat);
    panel(d, room.height, room.maxX, room.height / 2, cz, -Math.PI / 2, wallMat);

    /** An end wall, split around a doorway if there is one. */
    const endWall = (z, door, rotY) => {
      if (!door) {
        panel(w, room.height, cx, room.height / 2, z, rotY, wallMat);
        if (skirting) skirt(cx, z + (rotY ? 0.06 : -0.06), w, 0.12);
        return;
      }

      const left = door.minX - room.minX;
      const right = room.maxX - door.maxX;
      panel(left, room.height, room.minX + left / 2, room.height / 2, z, rotY, wallMat);
      panel(right, room.height, door.maxX + right / 2, room.height / 2, z, rotY, wallMat);
      panel(
        door.maxX - door.minX,
        room.height - door.height,
        (door.minX + door.maxX) / 2,
        door.height + (room.height - door.height) / 2,
        z, rotY, wallMat
      );

      if (skirting) {
        skirt(room.minX + left / 2, z + (rotY ? 0.06 : -0.06), left, 0.12);
        skirt(door.maxX + right / 2, z + (rotY ? 0.06 : -0.06), right, 0.12);
      }
    };

    endWall(room.minZ, farDoor, 0);
    endWall(room.maxZ, nearDoor, Math.PI);

    if (skirting) {
      skirt(room.minX + 0.06, cz, 0.12, d);
      skirt(room.maxX - 0.06, cz, 0.12, d);
    }

    return { cx, cz, w, d };
  }

  // The yard's own far wall, with the gate through to the museum wing.
  {
    const left = DOOR5.minX - YARD_A.minX;
    panel(left, YARD_A.height, YARD_A.minX + left / 2, YARD_A.height / 2, YARD_A.minZ, 0, stoneMat);
    const right = YARD_A.maxX - DOOR5.maxX;
    panel(right, YARD_A.height, DOOR5.maxX + right / 2, YARD_A.height / 2, YARD_A.minZ, 0, stoneMat);
    panel(
      DOOR5.maxX - DOOR5.minX,
      YARD_A.height - DOOR5.height,
      (DOOR5.minX + DOOR5.maxX) / 2,
      DOOR5.height + (YARD_A.height - DOOR5.height) / 2,
      YARD_A.minZ, 0, stoneMat
    );
    doorway(DOOR5, YARD_A.minZ, DOOR5.height, 0.5);
  }

  // --- the safe house: a domestic room, shuttered ----------------------------

  const safe = roomShell(SAFE, {
    floorMat: wood,
    ceilingColor: '#3d2c1e',
    wallMat: wall,
    nearDoor: DOOR5,
    farDoor: DOOR6,
    skirting: true,
  });
  doorway(DOOR6, SAFE.minZ, DOOR6.height);
  hangLampLater.push([safe.cx - 4, safe.cz, SAFE.height, 0.7]);
  hangLampLater.push([safe.cx + 4, safe.cz, SAFE.height, 0.7]);

  // --- the record office: filing, lit like an office -------------------------

  const recs = roomShell(RECS, {
    floorMat: new THREE.MeshStandardMaterial({ color: '#5f5a4e', roughness: 1 }),
    ceilingColor: '#413c33',
    wallMat: new THREE.MeshStandardMaterial({ map: TX.plaster(), roughness: 0.95 }),
    nearDoor: DOOR6,
    farDoor: DOOR7,
    skirting: true,
  });
  doorway(DOOR7, RECS.minZ, DOOR7.height, 0.45);

  for (const x of [recs.cx - 4.5, recs.cx + 4.5]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 3),
      new THREE.MeshBasicMaterial({ color: '#e8f0ff' })
    );
    strip.position.set(x, RECS.height - 0.14, recs.cz);
    scene.add(strip);

    addFixture(x, RECS.height - 0.4, recs.cz, '#dbe6f7', 1.2, 17);
  }

  // --- the memorial hall: tall, quiet, top-lit -------------------------------

  const memo = roomShell(MEMO, {
    floorMat: new THREE.MeshStandardMaterial({ color: '#6d675c', roughness: 0.9 }),
    ceilingColor: '#2a2721',
    wallMat: stoneMat,
    nearDoor: DOOR7,
    farDoor: null,
  });

  // A clerestory slot down the middle, so the hall is lit from above like a
  // memorial rather than by bulbs like a shop.
  const clerestory = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, MEMO.maxZ - MEMO.minZ - 4),
    new THREE.MeshBasicMaterial({ map: TX.skyDome() })
  );
  clerestory.rotation.x = Math.PI / 2;
  clerestory.position.set(memo.cx, MEMO.height - 0.02, memo.cz);
  scene.add(clerestory);

  for (const z of [memo.cz - 7, memo.cz, memo.cz + 7]) {
    addFixture(memo.cx, 3.2, z, '#ffe9c4', 0.9, 17);
  }

  // ------------------------------------------------------------- lighting ---

  // One hemisphere and one ambient for the whole map — both are effectively free
  // per pixel, unlike point lights, and they are retinted per area below.
  const hemi = new THREE.HemisphereLight('#ffe8c4', '#6a4a30', 1.15);
  scene.add(hemi);

  // A real floor of light, so nowhere on the map ever goes to black.
  scene.add(new THREE.AmbientLight('#ffe6c0', 0.34));

  // One directional light for the entire map, moved and retinted as the player
  // crosses between indoors and the open yard.
  const sun = new THREE.DirectionalLight('#ffdca8', 1.5);
  sun.position.set(3.5, 5.5, 11);
  sun.target.position.set(0, 0.8, -2);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowMap, shadowMap);
    sun.shadow.camera.left = -11;
    sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -6;
    sun.shadow.camera.far = 30;

    // normalBias, not a bigger depth bias. The wainscot is a thin box lit at a
    // grazing angle, which self-shadows into a dotted moiré across its face;
    // offsetting along the surface normal is what actually clears that, and it
    // does not detach contact shadows the way a large bias does.
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.045;
  }
  scene.add(sun, sun.target);

  // The roaming pool. Created once, never added to or removed from, so the
  // shader's light count is fixed and no material ever recompiles mid-walk.
  const pool = [];
  for (let i = 0; i < LIGHT_POOL; i++) {
    const light = new THREE.PointLight('#ffc987', 0, 12, 2);
    scene.add(light);
    pool.push(light);
  }

  /**
   * How each area should be lit overall.
   *
   * The hemisphere floor is deliberately generous everywhere. Interiors lit only
   * by their own lamps came out near-black between fixtures — atmospheric in a
   * screenshot, unplayable when you are trying to find a doorway. Contrast now
   * comes from the *colour* difference between areas rather than from darkness.
   */
  const MOOD = {
    shop: { sky: '#ffe8c4', ground: '#6a4a30', hemi: 1.15, sun: 1.6, sunColor: '#ffdca8',
            from: [3.5, 5.5, 11], at: [0, 0.8, -2] },
    composing: { sky: '#ffe4bc', ground: '#5e4429', hemi: 1.1, sun: 0.6, sunColor: '#ffdca8',
            from: [3.5, 5.5, 11], at: [0, 0.8, -2] },
    corridor: { sky: '#f0dcbc', ground: '#54402a', hemi: 1.05, sun: 0.5, sunColor: '#ffdca8',
            from: [5, 8, -14], at: [5, 0, -20] },
    jail: { sky: '#cfdcf0', ground: '#55524a', hemi: 1.05, sun: 0.6, sunColor: '#cfe0ff',
            from: [5, 12, -24], at: [5, 0, -29] },
    yard: { sky: '#dceaff', ground: '#8a7a5c', hemi: 1.25, sun: 2.2, sunColor: '#fff2d2',
            from: [14, 16, -34], at: [5, 0, -44] },
    safehouse: { sky: '#ffe2ba', ground: '#5a4229', hemi: 1.1, sun: 0.55, sunColor: '#ffdca8',
            from: [5, 10, -56], at: [5, 0, -62] },
    records: { sky: '#e6eefa', ground: '#5e5a4e', hemi: 1.15, sun: 0.55, sunColor: '#dbe6f7',
            from: [5, 10, -72], at: [5, 0, -78] },
    memorial: { sky: '#eef2ff', ground: '#6b6458', hemi: 1.2, sun: 1.6, sunColor: '#fff4e0',
            from: [8, 16, -88], at: [6, 0, -95] },
  };

  let mood = MOOD.shop;

  /**
   * Point the pool at the nearest fixtures and blend the area's mood in.
   *
   * Selection is a partial sort — with a few dozen fixtures and five slots, a
   * linear scan per slot is cheaper than sorting the whole list every frame.
   */
  function relight(dt, at) {
    const taken = new Set();

    for (const light of pool) {
      let best = -1;
      let bestDist = Infinity;

      for (let i = 0; i < fixtures.length; i++) {
        if (taken.has(i)) continue;
        const f = fixtures[i];
        const dist = (f.x - at.x) ** 2 + (f.z - at.z) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }

      if (best < 0) {
        light.intensity = 0;
        continue;
      }

      taken.add(best);
      const f = fixtures[best];
      light.position.set(f.x, f.y, f.z);
      light.color.copy(f.color);
      light.distance = f.distance;

      // Fade in rather than snap, so a fixture handing over to the next one
      // behind you does not pop.
      const target = Math.sqrt(bestDist) > f.distance * 1.3 ? 0 : f.intensity;
      light.intensity += (target - light.intensity) * Math.min(1, dt * 6);
    }

    const want = MOOD[areaAt(at.z)] ?? MOOD.shop;
    if (want !== mood) mood = want;

    const k = Math.min(1, dt * 2.2);
    hemi.color.lerp(new THREE.Color(mood.sky), k);
    hemi.groundColor.lerp(new THREE.Color(mood.ground), k);
    hemi.intensity += (mood.hemi - hemi.intensity) * k;

    sun.color.lerp(new THREE.Color(mood.sunColor), k);
    sun.intensity += (mood.sun - sun.intensity) * k;
    sun.position.lerp(new THREE.Vector3(...mood.from), k);
    sun.target.position.lerp(new THREE.Vector3(...mood.at), k);
    sun.target.updateMatrixWorld();
  }

  /** A shaded bulb on a cord. */
  const hangLamp = (x, z, ceilingY, intensity = 0.85) => {
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.75),
      new THREE.MeshStandardMaterial({ color: '#2a1c12' })
    );
    cord.position.set(x, ceilingY - 0.37, z);
    scene.add(cord);

    // A proper enamel shade: a wide cone, a rolled rim, and a bright inner face
    // so the underside glows instead of going flat black.
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 0.34, 22, 1, true),
      new THREE.MeshStandardMaterial({
        color: '#9d4f31',
        roughness: 0.45,
        metalness: 0.15,
        side: THREE.FrontSide,
      })
    );
    shade.position.set(x, ceilingY - 0.8, z);
    scene.add(shade);

    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.44, 0.32, 22, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffe9c2', side: THREE.BackSide })
    );
    inner.position.set(x, ceilingY - 0.8, z);
    scene.add(inner);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.028, 6, 22), new THREE.MeshStandardMaterial({
      color: '#5f2f1c', roughness: 0.5,
    }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, ceilingY - 0.96, z);
    scene.add(rim);

    const rose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: '#4b2e1c', roughness: 0.7 })
    );
    rose.position.set(x, ceilingY - 0.03, z);
    scene.add(rose);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#fff1cf' })
    );
    bulb.position.set(x, ceilingY - 0.94, z);
    scene.add(bulb);

    addFixture(x, ceilingY - 1, z, '#ffd9a0', intensity * 2.4, 18);
  };

  hangLamp(-5, -1, ROOM.height);
  hangLamp(0, -1, ROOM.height);
  hangLamp(5, -1, ROOM.height);
  hangLamp(3, -8, BACK.height, 0.8);
  hangLamp(7, -11.4, BACK.height, 0.8);
  for (const args of hangLampLater) hangLamp(...args);

  // The jail is lit coldly and sparsely, against the shop's warm bulbs. Each
  // bracket gets a shade so the light has a visible source and throws a pool
  // rather than washing the stone evenly.
  for (const [x, z] of [[-1, -26], [11, -26], [-1, -33], [11, -33], [5, -29.5]]) {
    addFixture(x, 3.5, z, '#a8bfdd', 1.2, 19);

    const hood = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.24, 12, 1, true),
      new THREE.MeshStandardMaterial({
        color: '#3b3f46',
        roughness: 0.7,
        side: THREE.DoubleSide,
      })
    );
    hood.position.set(x, 3.72, z);
    scene.add(hood);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#e6f0ff' })
    );
    bulb.position.set(x, 3.5, z);
    scene.add(bulb);
  }

  // ------------------------------------------------------------ shopfront ---

  // Glass sits low enough to clear the sign, which used to overlap it — and the
  // sign now clears the ceiling, which it used to poke through.
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 1.7),
    new THREE.MeshBasicMaterial({ map: TX.windowView() })
  );
  glass.position.set(0, 1.7, HALF_D - 0.05);
  glass.rotation.y = Math.PI;
  scene.add(glass);

  const mullion = new THREE.MeshStandardMaterial({ color: '#4a2c1a', roughness: 0.7 });
  for (const x of [-3.7, -1.24, 1.24, 3.7]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), mullion);
    bar.position.set(x, 1.7, HALF_D - 0.09);
    scene.add(bar);
  }
  const cill = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.12, 0.22), trim);
  cill.position.set(0, 0.83, HALF_D - 0.12);
  scene.add(cill);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 0.95),
    new THREE.MeshStandardMaterial({ map: TX.shopSign(), roughness: 0.8 })
  );
  sign.position.set(0, 3.05, HALF_D - 0.12);
  sign.rotation.y = Math.PI;
  scene.add(sign);

  // ----------------------------------------------------- counter / ledger ---

  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.05, 1.5), darkWood);
  counter.position.set(0, 0.525, 1.6);
  counter.castShadow = shadows;
  counter.receiveShadow = shadows;
  scene.add(counter);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.1, 1.75), wood);
  counterTop.position.set(0, 1.1, 1.6);
  counterTop.castShadow = shadows;
  scene.add(counterTop);
  block(0, 1.6, 4.7, 1.75);

  /**
   * A stack of papers.
   *
   * The top sheet is a plane laid flat rather than a textured box: a box maps the
   * same texture onto all six faces, and the top face came out mirrored, so the
   * masthead read backwards. A plane rotated -90° about X puts the texture's top
   * edge at the far side of the counter, which is how a paper lying on a counter
   * actually faces someone standing at it.
   */
  const paperStack = (x, z, paper, seed, count = 4) => {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.018 * count, 0.88),
      new THREE.MeshStandardMaterial({ color: '#d9c79c', roughness: 0.95 })
    );
    edge.position.set(x, 1.15 + (0.018 * count) / 2, z);
    scene.add(edge);

    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(0.64, 0.88),
      new THREE.MeshStandardMaterial({ map: TX.newspaper(paper, seed), roughness: 0.92 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, 1.151 + 0.018 * count, z);
    scene.add(top);
  };

  paperStack(-1.4, 1.5, PAPERS[0], 21);
  paperStack(-0.5, 1.62, PAPERS[3], 22, 6);

  const ledgerBook = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.5), darkWood);
  ledgerBook.position.set(1.3, 1.2, 1.55);
  ledgerBook.rotation.y = 0.16;
  scene.add(ledgerBook);

  const ledgerPage = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.42),
    new THREE.MeshStandardMaterial({ color: '#f2e2ba', roughness: 0.95 })
  );
  ledgerPage.rotation.x = -Math.PI / 2;
  ledgerPage.rotation.z = -0.16;
  ledgerPage.position.set(1.3, 1.246, 1.55);
  scene.add(ledgerPage);

  const counterPlacard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 0.88),
    new THREE.MeshStandardMaterial({ map: TX.counterSign(), roughness: 0.85 })
  );
  counterPlacard.position.set(0, 2.45, -HALF_D + 0.08);
  scene.add(counterPlacard);

  // ------------------------------------------------------------- portrait ---

  const PORTRAIT = { x: -3, y: 2.05, z: -HALF_D + 0.07 };

  // The drawn mount, which carries the name and dates.
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.47),
    new THREE.MeshStandardMaterial({ map: TX.portraitPlate(), roughness: 0.85 })
  );
  plate.position.set(PORTRAIT.x, PORTRAIT.y, PORTRAIT.z);
  scene.add(plate);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.65, 0.08), trim);
  frame.position.set(PORTRAIT.x, PORTRAIT.y, PORTRAIT.z - 0.05);
  scene.add(frame);

  /** The window in the mount that the photograph sits inside. */
  const WINDOW = { w: 0.905, h: 1.09, dy: 0.092 };

  // The only genuine photograph in the shop. It is public domain, and it is
  // loaded rather than drawn — but if it fails (offline, blocked, CORS) the
  // drawn mount stays, so the frame is never empty-looking for a missing file.
  // Pointed straight at upload.wikimedia.org rather than at Special:FilePath:
  // the redirect hops through commons.wikimedia.org, which does not send
  // access-control-allow-origin, so a cross-origin load dies before it arrives.
  // 960px is one of the thumbnail widths Wikimedia will actually serve — the
  // arbitrary ones (320, 480, 640) come back 400.
  new THREE.TextureLoader().setCrossOrigin('anonymous').load(
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sachindra_Nath_Sanyal.jpg/960px-Sachindra_Nath_Sanyal.jpg',
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      // Fit inside the mount's window without distorting the photograph: scale
      // to whichever axis runs out first and letterbox the other.
      const aspect = texture.image.width / texture.image.height;
      const boxAspect = WINDOW.w / WINDOW.h;
      const w = aspect > boxAspect ? WINDOW.w : WINDOW.h * aspect;
      const h = aspect > boxAspect ? WINDOW.w / aspect : WINDOW.h;

      const photo = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88 })
      );
      photo.position.set(PORTRAIT.x, PORTRAIT.y + WINDOW.dy, PORTRAIT.z + 0.005);
      scene.add(photo);
    },
    undefined,
    () => {
      /* offline or blocked: the drawn mount stands on its own */
    }
  );

  // ------------------------------------------------------------- stations ---

  /** A ring on the floor that brightens when the player is in reach. */
  const makeMarker = (x, z) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.82, 32),
      new THREE.MeshBasicMaterial({
        color: '#c99a5e',
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.02, z);
    scene.add(ring);
    return ring;
  };

  const station = (id, label, x, z) => {
    stations.push({
      id,
      label,
      position: new THREE.Vector3(x, 0, z),
      marker: makeMarker(x, z),
    });
  };

  station('ledger', 'THE LEDGER', 0, 3.1);

  // --- print rack, west wall -------------------------------------------------

  const rackX = -HALF_W + 0.55;
  const rackBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 4.6), darkWood);
  rackBody.position.set(rackX, 0.8, -0.5);
  rackBody.castShadow = shadows;
  scene.add(rackBody);
  block(rackX, -0.5, 0.7, 4.6);

  PAPERS.forEach((paper, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(0.82, 1.12),
      new THREE.MeshStandardMaterial({ map: TX.newspaper(paper, i + 1), roughness: 0.9 })
    );
    sheet.position.set(rackX + 0.38, 1.42 - row * 0.78, -1.9 + col * 1.4);
    sheet.rotation.y = Math.PI / 2;
    sheet.rotation.x = -0.16;
    scene.add(sheet);
  });

  station('print', 'THE PRINT RACK', rackX + 1.5, -0.5);

  // --- wireless set, back wall left -----------------------------------------

  const radioX = -3.6;
  const radioZ = -HALF_D + 0.7;

  const radioTable = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 1), darkWood);
  radioTable.position.set(radioX, 0.45, radioZ);
  radioTable.castShadow = shadows;
  scene.add(radioTable);
  block(radioX, radioZ, 2.1, 1);

  const radioBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.72), darkWood);
  radioBox.position.set(radioX, 1.45, radioZ);
  radioBox.castShadow = shadows;
  scene.add(radioBox);

  const radioPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.02),
    new THREE.MeshStandardMaterial({ map: TX.radioFace(), roughness: 0.75 })
  );
  radioPanel.position.set(radioX, 1.45, radioZ + 0.37);
  scene.add(radioPanel);

  for (const dx of [-0.52, 0.52]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.08, 14), brass);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(radioX + dx, 1.1, radioZ + 0.4);
    scene.add(knob);
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5), brass);
  antenna.position.set(radioX + 0.6, 2.7, radioZ);
  antenna.rotation.z = 0.24;
  scene.add(antenna);

  station('radio', 'VARANASI WIRELESS', radioX, radioZ + 1.7);

  // --- television, east side ------------------------------------------------

  const tvX = HALF_W - 1.1;
  const tvZ = -2.2;
  const tv = TX.television();
  tv.draw(FRAMES[0]);

  const tvCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.55, 2), darkWood);
  tvCabinet.position.set(tvX, 1.05, tvZ);
  tvCabinet.castShadow = shadows;
  scene.add(tvCabinet);
  block(tvX, tvZ, 1.1, 2);

  for (const dz of [-0.75, 0.75]) {
    for (const dx of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.28), darkWood);
      leg.position.set(tvX + dx, 0.14, tvZ + dz);
      scene.add(leg);
    }
  }

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.12),
    new THREE.MeshBasicMaterial({ map: tv.texture })
  );
  screen.position.set(tvX - 0.56, 1.22, tvZ);
  screen.rotation.y = -Math.PI / 2;
  scene.add(screen);

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.34, 1.72), trim);
  bezel.position.set(tvX - 0.5, 1.22, tvZ);
  scene.add(bezel);

  addFixture(tvX - 1.1, 1.3, tvZ, '#a8c98a', 0.7, 6);

  station('tv', 'THE MOVING PICTURE', tvX - 1.9, tvZ);

  // --- the press, composing room --------------------------------------------

  const pressX = 3.1;
  const pressZ = -10.4;

  const pressBed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.5), iron);
  pressBed.position.set(pressX, 0.5, pressZ);
  pressBed.castShadow = shadows;
  scene.add(pressBed);
  block(pressX, pressZ, 2.2, 1.5);

  const pressFrameGeo = new THREE.BoxGeometry(0.22, 1.9, 0.22);
  for (const dx of [-0.85, 0.85]) {
    for (const dz of [-0.55, 0.55]) {
      const post = new THREE.Mesh(pressFrameGeo, iron);
      post.position.set(pressX + dx, 1.45, pressZ + dz);
      scene.add(post);
    }
  }

  const pressHead = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1.4), iron);
  pressHead.position.set(pressX, 2.5, pressZ);
  scene.add(pressHead);

  // The screw and its bar, the parts that make a press read as a press.
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1), brass);
  screw.position.set(pressX, 1.9, pressZ);
  scene.add(screw);

  const barGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(barGeo, brass);
    bar.position.set(pressX, 2.3, pressZ);
    bar.rotation.z = Math.PI / 2;
    bar.rotation.y = (i * Math.PI) / 2;
    scene.add(bar);
  }

  const platen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.8),
    new THREE.MeshStandardMaterial({ color: '#e7d3a4', roughness: 0.95 })
  );
  platen.rotation.x = -Math.PI / 2;
  platen.position.set(pressX, 1.01, pressZ);
  scene.add(platen);

  station('press', 'THE COMPOSING BENCH', pressX, pressZ + 1.9);

  // --- the case cabinet, composing room -------------------------------------

  const fileX = BACK.maxX - 0.7;
  const fileZ = -7.6;

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 2.4), darkWood);
  cabinet.position.set(fileX, 1, fileZ);
  cabinet.castShadow = shadows;
  scene.add(cabinet);
  block(fileX, fileZ, 0.9, 2.4);

  // Drawer fronts with brass pulls.
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.1), trim);
      drawer.position.set(fileX - 0.47, 1.72 - row * 0.47, fileZ - 0.58 + col * 1.16);
      scene.add(drawer);

      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.24), brass);
      pull.position.set(fileX - 0.52, 1.72 - row * 0.47, fileZ - 0.58 + col * 1.16);
      scene.add(pull);
    }
  }

  station('files', 'THE CASE CABINET', fileX - 1.7, fileZ);

  // --- the cells, jail wing --------------------------------------------------

  const barMat = new THREE.MeshStandardMaterial({
    color: '#20242a',
    roughness: 0.55,
    metalness: 0.7,
  });

  /**
   * One cell: a recess in the wall, barred, with a number plate. Six of them
   * line the long walls, so crossing the wing is the point of the wing.
   */
  const cell = (index, x, z, facing) => {
    const inward = facing === 1 ? 1 : -1;

    const recess = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2.5, 1.7),
      new THREE.MeshStandardMaterial({ color: '#20201d', roughness: 1 })
    );
    recess.position.set(x - inward * 0.28, 1.25, z);
    scene.add(recess);

    // Bars across the opening.
    for (let i = 0; i < 7; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.4, 8), barMat);
      bar.position.set(x, 1.2, z - 0.72 + i * 0.24);
      scene.add(bar);
    }
    for (const y of [0.15, 2.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.7), barMat);
      rail.position.set(x, y, z);
      scene.add(rail);
    }

    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.3),
      new THREE.MeshStandardMaterial({ color: '#c6bda4', roughness: 0.9 })
    );
    plate.position.set(x + inward * 0.06, 2.62, z);
    plate.rotation.y = inward * Math.PI / 2;
    scene.add(plate);

    station(`cell${index}`, `CELL ${String(index + 1).padStart(2, '0')}`, x + inward * 1.5, z);
  };

  // Three down the west wall, three down the east.
  cell(0, JAIL.minX + 0.25, -25.5, 1);
  cell(1, JAIL.minX + 0.25, -29, 1);
  cell(2, JAIL.minX + 0.25, -32.5, 1);
  cell(3, JAIL.maxX - 0.25, -25.5, -1);
  cell(4, JAIL.maxX - 0.25, -29, -1);
  cell(5, JAIL.maxX - 0.25, -32.5, -1);

  // --- the labour yard -------------------------------------------------------

  /**
   * The oil mill — a kolhu. A stone mortar sunk in a circular apron, a heavy
   * wooden pestle standing in it, and a long beam yoked to the pestle that the
   * prisoners pushed. The beam turns, slowly and forever, which is the point.
   */
  const millX = 5;
  const millZ = -43;

  const apron = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, 0.34, 32), stoneMat);
  apron.position.set(millX, 0.17, millZ);
  apron.receiveShadow = shadows;
  scene.add(apron);

  // The circular rut worn by generations of feet.
  const rut = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 2.62, 40),
    new THREE.MeshStandardMaterial({ color: '#5c5344', roughness: 1 })
  );
  rut.rotation.x = -Math.PI / 2;
  rut.position.set(millX, 0.345, millZ);
  scene.add(rut);

  const mortar = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 1.25, 24), stoneMat);
  mortar.position.set(millX, 0.96, millZ);
  mortar.castShadow = shadows;
  mortar.receiveShadow = shadows;
  scene.add(mortar);
  block(millX, millZ, 2.7, 2.7);

  // The mortar's bowl, open at the top.
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.72, 0.5, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: '#2c2620', roughness: 1, side: THREE.DoubleSide })
  );
  bowl.position.set(millX, 1.35, millZ);
  scene.add(bowl);

  const oil = new THREE.Mesh(
    new THREE.CircleGeometry(0.74, 24),
    new THREE.MeshStandardMaterial({ color: '#4a3a16', roughness: 0.25, metalness: 0.15 })
  );
  oil.rotation.x = -Math.PI / 2;
  oil.position.set(millX, 1.16, millZ);
  scene.add(oil);

  // Everything that turns hangs off this, so the whole assembly rotates as one.
  const millArm = new THREE.Group();
  millArm.position.set(millX, 0, millZ);
  scene.add(millArm);

  const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 2.3, 14), darkWood);
  pestle.position.set(0, 1.5, 0);
  pestle.rotation.z = 0.12;
  pestle.castShadow = shadows;
  millArm.add(pestle);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.26, 0.3), darkWood);
  beam.position.set(2.5, 1.75, 0);
  beam.castShadow = shadows;
  millArm.add(beam);

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), darkWood);
  brace.position.set(0.9, 1.1, 0);
  brace.rotation.z = -0.5;
  millArm.add(brace);

  // The yoke at the far end, where a man or a bullock was harnessed.
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 1.5), darkWood);
  yoke.position.set(5.3, 1.6, 0);
  millArm.add(yoke);

  for (const dz of [-0.6, 0.6]) {
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), iron);
    strap.position.set(5.3, 1.1, dz);
    millArm.add(strap);
  }

  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 20), iron);
  hoop.position.set(0, 2.5, 0);
  hoop.rotation.x = Math.PI / 2;
  millArm.add(hoop);

  tickers.push((dt) => {
    // Slow enough to read as labour rather than machinery.
    millArm.rotation.y += dt * 0.16;
  });

  station('yard0', 'THE OIL MILL', millX, millZ + 4.2);

  /** Coir-beating benches down the west side. */
  for (let i = 0; i < 2; i++) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 2.6), darkWood);
    bench.position.set(YARD_A.minX + 1.6, 0.28, -41 - i * 5);
    bench.castShadow = shadows;
    scene.add(bench);
    block(YARD_A.minX + 1.6, -41 - i * 5, 1.1, 2.6);
  }
  station('yard1', 'THE COIR BENCH', YARD_A.minX + 3.1, -41);

  /**
   * The well. Open-ended cylinders rather than a capped one, so it is a shaft
   * you can look down rather than a solid drum with a lid — a closed top was
   * the whole reason it read as a barrel.
   */
  const wellX = YARD_A.maxX - 3;
  const wellZ = -40;

  const wellOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.22, 1, 24, 1, true),
    stoneMat
  );
  wellOuter.position.set(wellX, 0.5, wellZ);
  wellOuter.castShadow = shadows;
  scene.add(wellOuter);

  // The shaft, dropping away into the dark.
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 6, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: '#1c1a17', roughness: 1, side: THREE.BackSide })
  );
  shaft.position.set(wellX, -2.2, wellZ);
  scene.add(shaft);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 24),
    new THREE.MeshStandardMaterial({ color: '#0e1a1c', roughness: 0.12, metalness: 0.5 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(wellX, -4.4, wellZ);
  scene.add(water);

  // The coping ring around the mouth, which is what makes the hole read as a hole.
  const coping = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.14, 10, 26), stoneMat);
  coping.rotation.x = Math.PI / 2;
  coping.position.set(wellX, 1.02, wellZ);
  coping.castShadow = shadows;
  scene.add(coping);

  block(wellX, wellZ, 2.5, 2.5);

  // Windlass over the mouth.
  for (const dx of [-1.15, 1.15]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), darkWood);
    post.position.set(wellX + dx, 1.95, wellZ);
    post.castShadow = shadows;
    scene.add(post);
  }

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.1, 12), darkWood);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(wellX, 2.8, wellZ);
  scene.add(drum);

  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), iron);
  crank.position.set(wellX + 1.3, 2.8, wellZ);
  scene.add(crank);

  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 6), darkWood);
  rope.position.set(wellX, 2.05, wellZ);
  scene.add(rope);

  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.3, 12), darkWood);
  bucket.position.set(wellX, 1.2, wellZ);
  scene.add(bucket);

  station('yard2', 'THE WELL', wellX, wellZ + 2.6);

  /**
   * Three boards along the far wall. They carry what happened to the place
   * rather than anything in it, so a board is the honest object for them.
   */
  const boardMat = new THREE.MeshStandardMaterial({ color: '#4a4032', roughness: 0.9 });

  // Kept clear of x 4.4—6.2: the gate through to the museum wing is there, and
  // a board on the centreline walls it off.
  [['yard3', 'THE REPATRIATION BOARD', 'Repatriation', -3.5],
   ['yard4', 'THE WINGS BOARD', 'Three Wings', 0.5],
   ['yard5', 'THE MEMORIAL BOARD', 'A Memorial', 12]].forEach(([id, label, title, x]) => {
    const z = YARD_A.minZ + 0.6;

    // Backing board, angled back slightly like a real notice stand.
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.6, 0.12), boardMat);
    back.position.set(x, 1.62, z);
    back.rotation.x = -0.09;
    back.castShadow = shadows;
    back.receiveShadow = shadows;
    scene.add(back);

    // The notice itself, standing proud of the backing.
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 1.44),
      new THREE.MeshStandardMaterial({ map: TX.noticeBoard(title), roughness: 0.85 })
    );
    face.position.set(x, 1.63, z + 0.07);
    face.rotation.x = -0.09;
    scene.add(face);

    // A little pitched hood to throw the notice into shade and give it a top.
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 0.5), darkWood);
    hood.position.set(x, 2.47, z + 0.14);
    hood.rotation.x = 0.22;
    hood.castShadow = shadows;
    scene.add(hood);

    for (const dx of [-1.05, 1.05]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.7, 0.15), darkWood);
      leg.position.set(x + dx, 0.85, z);
      leg.castShadow = shadows;
      scene.add(leg);

      // Diagonal brace back to the ground, so they do not look pasted on.
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.05, 0.1), darkWood);
      brace.position.set(x + dx, 0.62, z - 0.36);
      brace.rotation.x = 0.62;
      scene.add(brace);
    }

    block(x, z, 2.6, 0.7);
    station(id, label, x, z + 2.3);
  });

  // --- safe house artefacts --------------------------------------------------

  /** A small table with something on it — the safe house is all tabletops. */
  const bench = (x, z, w = 1.6, d = 1) => {
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, d), wood);
    top.position.set(x, 0.86, z);
    top.castShadow = shadows;
    scene.add(top);
    for (const dx of [-w / 2 + 0.14, w / 2 - 0.14]) {
      for (const dz of [-d / 2 + 0.12, d / 2 - 0.12]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, 0.09), darkWood);
        leg.position.set(x + dx, 0.41, z + dz);
        scene.add(leg);
      }
    }
    block(x, z, w, d);
  };

  const safeSpots = [
    ['safe0', 'THE SAMITI ROOM', SAFE.minX + 1.6, -56.5],
    ['safe1', 'THE NETWORK MAP', SAFE.minX + 1.6, -60.5],
    ['safe2', 'THE PLAN OF 1915', SAFE.minX + 1.6, -64.5],
    ['safe3', 'THE CIPHER DESK', SAFE.maxX - 1.6, -56.5],
    ['safe4', 'THE LETTER TRAY', SAFE.maxX - 1.6, -60.5],
    ['safe5', 'THE INK BOTTLES', SAFE.maxX - 1.6, -64.5],
  ];

  safeSpots.forEach(([id, label, x, z], i) => {
    bench(x, z);
    const inward = x < SAFE.minX + 4 ? 1 : -1;

    // Something on each bench, so they are not six identical tables.
    if (i === 0 || i === 1 || i === 2) {
      const sheet = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.62),
        new THREE.MeshStandardMaterial({
          map: TX.noticeBoard(['Samiti', 'Network', '1915'][i]),
          roughness: 0.9,
        })
      );
      sheet.rotation.x = -Math.PI / 2;
      sheet.position.set(x, 0.912, z);
      scene.add(sheet);
    } else {
      for (let b = 0; b < 3; b++) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.08, 0.22, 10),
          new THREE.MeshStandardMaterial({
            color: ['#3e5a3a', '#6b4a2a', '#2f3f52'][b],
            roughness: 0.3,
          })
        );
        bottle.position.set(x + (b - 1) * 0.28, 0.99, z + 0.1);
        scene.add(bottle);
      }
      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.42),
        new THREE.MeshStandardMaterial({ color: '#e9dcba', roughness: 0.95 })
      );
      paper.rotation.x = -Math.PI / 2;
      paper.position.set(x, 0.912, z - 0.22);
      scene.add(paper);
    }

    station(id, label, x + inward * 1.5, z);
  });

  // The press itself, at the far end, since a press was the room's real asset.
  const pressBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.1), iron);
  pressBody.position.set(safe.cx, 0.65, -67.5);
  pressBody.castShadow = shadows;
  scene.add(pressBody);
  block(safe.cx, -67.5, 1.8, 1.1);

  const pressScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 12), brass);
  pressScrew.position.set(safe.cx, 1.9, -67.5);
  scene.add(pressScrew);

  const pressLever = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), brass);
  pressLever.rotation.z = Math.PI / 2;
  pressLever.position.set(safe.cx, 2.4, -67.5);
  scene.add(pressLever);

  station('safe6', 'THE PRESS', safe.cx, -65.9);

  // --- record office artefacts -----------------------------------------------

  const cabinetMat = new THREE.MeshStandardMaterial({ color: '#4d4a42', roughness: 0.6, metalness: 0.4 });

  [['rec0', 'THE WATCH REGISTER', RECS.minX + 1.1, -72.5],
   ['rec1', 'THE WARRANTS', RECS.minX + 1.1, -76.5],
   ['rec2', 'THE INFORMANT FILES', RECS.minX + 1.1, -80.5],
   ['rec3', 'THE NOTICE BOARD', RECS.maxX - 1.1, -72.5],
   ['rec4', 'THE COURT PAPERS', RECS.maxX - 1.1, -76.5],
   ['rec5', 'THE WATCH LIST', RECS.maxX - 1.1, -80.5]].forEach(([id, label, x, z]) => {
    const inward = x < recs.cx ? 1 : -1;

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1, 2.1, 2.2), cabinetMat);
    cab.position.set(x, 1.05, z);
    cab.castShadow = shadows;
    scene.add(cab);
    block(x, z, 1, 2.2);

    for (let row = 0; row < 5; row++) {
      const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 1), trim);
      drawer.position.set(x - inward * -0.52, 1.75 - row * 0.4, z);
      scene.add(drawer);

      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), brass);
      pull.position.set(x + inward * 0.55, 1.75 - row * 0.4, z);
      scene.add(pull);
    }

    station(id, label, x + inward * 1.7, z);
  });

  // --- memorial hall artefacts -----------------------------------------------

  /**
   * Ten plinths down the hall, alternating sides, each with a stone tablet.
   * The chronology panel gets the centre of the room to itself.
   */
  const memoMat = new THREE.MeshStandardMaterial({ color: '#8e8779', roughness: 0.95 });

  [['mem0', 'WHAT HE PASSED ON'], ['mem1', 'THE CHRONOLOGY'],
   ['mem2', 'BHAGAT SINGH'], ['mem3', 'RAM PRASAD BISMIL'],
   ['mem4', 'ASHFAQULLA KHAN'], ['mem5', 'CHANDRASHEKHAR AZAD'],
   ['mem6', 'H.R.A. TO H.S.R.A.'], ['mem7', 'RELEASED, 1937'],
   ['mem8', 'GORAKHPUR, 1942'], ['mem9', 'AMONG THE UNSUNG']]
    .forEach(([id, label], i) => {
      // The chronology stands alone in the middle; the rest line the walls.
      const central = i === 1;
      const side = i % 2 === 0 ? -1 : 1;
      const x = central ? memo.cx : memo.cx + side * 9.5;
      const z = central ? MEMO.maxZ - 4 : MEMO.maxZ - 6.5 - Math.floor(i / 2) * 3.4;

      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(central ? 3.4 : 1.5, central ? 1.1 : 1, central ? 1.2 : 0.9),
        memoMat
      );
      plinth.position.set(x, (central ? 1.1 : 1) / 2, z);
      plinth.castShadow = shadows;
      plinth.receiveShadow = shadows;
      scene.add(plinth);
      block(x, z, central ? 3.4 : 1.5, central ? 1.2 : 0.9);

      const tablet = new THREE.Mesh(
        new THREE.PlaneGeometry(central ? 3.1 : 1.3, central ? 1 : 0.72),
        new THREE.MeshStandardMaterial({
          map: TX.noticeBoard(central ? '1893 — 1942' : label.split(' ')[0]),
          roughness: 0.85,
        })
      );
      tablet.rotation.x = -Math.PI / 3;
      tablet.position.set(x, (central ? 1.32 : 1.16), z + 0.2);
      scene.add(tablet);

      station(id, label, x + (central ? 0 : -side * 1.8), z + (central ? 2 : 0));
    });

  // ------------------------------------------------------------------ tick ---

  // The television repaints a 512×384 canvas and re-uploads it as a texture.
  // Doing that every frame is pure waste when you are four rooms away, so it
  // only runs when you are near enough to see it, and then only at 10fps.
  let scan = 0;
  let tvClock = 0;
  tickers.push((dt, ctx) => {
    if (!ctx.at || Math.hypot(ctx.at.x - tvX, ctx.at.z - tvZ) > 14) return;
    tvClock += dt;
    if (tvClock < 1 / tvFps) return;
    scan += tvClock * 26;
    tvClock = 0;
    tv.draw(FRAMES[ctx.frame % FRAMES.length], scan);
  });

  tickers.push((dt, ctx) => {
    if (ctx.at) relight(dt, ctx.at);
  });

  tickers.push((dt, ctx) => {
    const t = performance.now() / 1000;
    for (const s of stations) {
      const active = ctx.near && ctx.near.id === s.id;
      const target = active ? 0.55 + Math.sin(t * 3.4) * 0.22 : 0.14;
      s.marker.material.opacity += (target - s.marker.material.opacity) * 0.15;
      s.marker.material.color.set(active ? '#ffe4a8' : '#c99a5e');
    }
  });

  return {
    scene,
    stations,
    colliders,
    zones,
    /** Just inside the door. Yaw 0 faces -Z, into the shop. */
    spawn: { x: 0, z: HALF_D - 1.6, yaw: 0 },
    update(dt, ctx) {
      for (const tick of tickers) tick(dt, ctx);
    },
  };
}
