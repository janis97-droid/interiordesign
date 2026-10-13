import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { OBB } from "three/addons/math/OBB.js";
import {
  buildBaseCabinet,
  buildBlindCorner,
  buildShelfDecor,
  buildTower,
  buildIsland,
  buildStool,
  buildShelf,
  buildLantern,
  setDrawerExtension,
} from "../src/kitchen-furniture.js";
import {
  kitchenUnits,
  kitchenIsland,
  kitchenStools,
  kitchenShelves,
  kitchenLanterns,
  kitchenRoom,
  kitchenCorner,
  kitchenFloorY,
  kitchenObstacles,
} from "../src/kitchen-layout.js";
import {
  walls,
  kitchenBay,
  HEIGHT,
  rooms,
  canOccupy,
  moveWithCollision,
} from "../src/plan.js";
import { ensuiteObstacles } from "../src/ensuite-layout.js";
import { bathroomObstacles } from "../src/bathroom-details-layout.js";

// Mesh construction is identical to the browser. Geometry checks don't need a
// DOM canvas, procedural textures, WebGL or a particular graphics driver.
const materials = Object.fromEntries(
  [
    "wood",
    "carved",
    "interior",
    "recess",
    "stone",
    "brass",
    "black",
    "ceramic",
    "woven",
    "glow",
    "amber",
  ].map((name) => [name, new THREE.MeshStandardMaterial({ name })]),
);
const epsilon = 2e-6;
const near = (actual, expected, label) =>
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `${label}: ${actual} vs ${expected}`,
  );
const bounds = (object) => new THREE.Box3().setFromObject(object);
const place = (object, config, y = kitchenFloorY) => {
  object.position.set(config.x, y, config.z);
  object.rotation.y = config.rotation || 0;
  object.updateMatrixWorld(true);
  return object;
};
const buildUnit = (unit) =>
  place(
    unit.kind === "tower"
      ? buildTower(unit, materials)
      : unit.kind === "corner"
        ? buildBlindCorner(unit, materials)
        : buildBaseCabinet(
            {
              ...unit,
              drawers: unit.kind === "drawers",
              sink: unit.kind === "sink",
            },
            materials,
          ),
    unit,
  );
const cabinetObjects = kitchenUnits.map(buildUnit);
const islandObject = place(
  buildIsland(kitchenIsland, materials),
  kitchenIsland,
);
const stoolObjects = kitchenStools.map((stool) =>
  place(buildStool({ ...stool, seatHeight: stool.height }, materials), stool),
);
const shelfObjects = kitchenShelves.map((shelf, variant) => {
  const object = buildShelf(shelf, materials);
  object.add(buildShelfDecor({ ...shelf, variant }, materials));
  return place(object, { ...shelf, rotation: Math.PI }, shelf.height);
});
const lanternObjects = kitchenLanterns.map((lantern) =>
  place(
    buildLantern(
      {
        drop: lantern.ceilingHeight - lantern.bottom,
        height: 0.43,
        radius: 0.105,
      },
      materials,
    ),
    lantern,
    lantern.ceilingHeight,
  ),
);
const placedObjects = [
  ...cabinetObjects,
  islandObject,
  ...stoolObjects,
  ...shelfObjects,
  ...lanternObjects,
];
const allObstacles = [
  ...ensuiteObstacles,
  ...bathroomObstacles,
  ...kitchenObstacles,
];

function volumetricOverlap(a, b) {
  return (
    a.min.x < b.max.x - epsilon &&
    a.max.x > b.min.x + epsilon &&
    a.min.y < b.max.y - epsilon &&
    a.max.y > b.min.y + epsilon &&
    a.min.z < b.max.z - epsilon &&
    a.max.z > b.min.z + epsilon
  );
}

test("real cabinet geometry, handles and countertop bevels fit the allocated 60 cm modules", () => {
  for (let i = 0; i < kitchenUnits.length; i++) {
    const unit = kitchenUnits[i],
      object = cabinetObjects[i],
      box = bounds(object);
    const width =
      Math.abs(Math.cos(unit.rotation)) * unit.width +
      Math.abs(Math.sin(unit.rotation)) * unit.depth;
    const depth =
      Math.abs(Math.sin(unit.rotation)) * unit.width +
      Math.abs(Math.cos(unit.rotation)) * unit.depth;
    near(box.min.x, unit.x - width / 2, `${unit.id} minimum X`);
    near(box.max.x, unit.x + width / 2, `${unit.id} maximum X`);
    near(box.min.z, unit.z - depth / 2, `${unit.id} minimum Z including pulls`);
    near(box.max.z, unit.z + depth / 2, `${unit.id} maximum Z including pulls`);
    assert.ok(box.min.y >= kitchenFloorY - epsilon);
    if (unit.kind !== "sink")
      near(box.max.y, kitchenFloorY + unit.height, `${unit.id} top`);
    else {
      const top = object.children.find(
        (child) => child.name === "Warm limestone countertop",
      );
      near(
        bounds(top).max.y,
        kitchenFloorY + 0.9,
        "sink counter height includes stone",
      );
      assert.ok(box.max.y < 1.28, "faucet stays below the first shelf");
    }
  }
  for (let i = 0; i < cabinetObjects.length; i++)
    for (let j = i + 1; j < cabinetObjects.length; j++)
      assert.equal(
        volumetricOverlap(bounds(cabinetObjects[i]), bounds(cabinetObjects[j])),
        false,
        `${kitchenUnits[i].id} and ${kitchenUnits[j].id} do not interpenetrate`,
      );
  const island = bounds(islandObject);
  near(island.max.x - island.min.x, 2.1, "island length");
  near(island.max.z - island.min.z, 0.95, "island width including hardware");
  near(island.max.y, kitchenFloorY + 0.9, "island surface");
  for (let i = 0; i < stoolObjects.length; i++) {
    const box = bounds(stoolObjects[i]),
      spec = kitchenStools[i];
    assert.ok(box.max.x - box.min.x <= spec.width + epsilon);
    assert.ok(box.max.z - box.min.z <= spec.depth + epsilon);
    assert.ok(
      box.min.y >= kitchenFloorY - epsilon,
      "stool legs stay on the floor",
    );
  }
});

test("the inset sink has a real stone cutout and an upward-facing basin floor", () => {
  const unit = kitchenUnits.find((unit) => unit.kind === "sink");
  const object = buildBaseCabinet({ ...unit, sink: true }, materials);
  const countertop = object.children.find(
    (child) => child.name === "Warm limestone countertop",
  );
  object.updateMatrixWorld(true);
  const down = new THREE.Vector3(0, -1, 0);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), down);
  assert.equal(
    ray.intersectObject(countertop, true).length,
    0,
    "countertop cannot cover the sink opening",
  );
  ray.ray.origin.x = unit.width / 2 - 0.015;
  assert.ok(
    ray.intersectObject(countertop, true).length > 0,
    "stone remains at both ends of the cutout",
  );
  const sink = object.children.find(
    (child) => child.name === "Inset sink and matte black mixer",
  );
  ray.ray.origin.set(0.16, 1.2, 0.07);
  const hit = ray.intersectObject(sink, true)[0];
  assert.ok(hit, "sink bowl has an interior floor");
  near(hit.point.y, 0.9 - 0.185, "basin depth is 18.5 cm");
  assert.ok(hit.face.normal.y > 0.99, "basin floor faces into the bowl");
});

// The approved recess adds usable floor only south of its north return. This
// union prevents fitting furniture in the main facade's nonexistent NE corner.
const insideKitchen = (x, z) =>
  (x >= kitchenRoom.west - epsilon &&
    x <= kitchenRoom.east + epsilon &&
    z >= kitchenRoom.north - epsilon &&
    z <= kitchenRoom.south + epsilon) ||
  (x >= kitchenRoom.east - epsilon &&
    x <= kitchenBay.backInside + epsilon &&
    z >= kitchenBay.northInside - epsilon &&
    z <= kitchenBay.southInside + epsilon);

const meshBounds = (object) => {
  const boxes = [];
  object.updateMatrixWorld(true);
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    boxes.push({
      mesh,
      box: mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),
    });
  });
  return boxes;
};
// A swept door is rotated: testing only its enclosing world box would falsely
// report a collision at the empty corner of that box. Resolve candidate pairs
// using each real mesh's oriented geometry bounds.
const meshOverlap = (a, b) => {
  if (!volumetricOverlap(bounds(a), bounds(b))) return false;
  const candidatesA = meshBounds(a),
    candidatesB = meshBounds(b);
  for (const first of candidatesA)
    for (const second of candidatesB)
      if (volumetricOverlap(first.box, second.box)) {
        const obbA = new OBB()
          .fromBox3(first.mesh.geometry.boundingBox)
          .applyMatrix4(first.mesh.matrixWorld);
        const obbB = new OBB()
          .fromBox3(second.mesh.geometry.boundingBox)
          .applyMatrix4(second.mesh.matrixWorld);
        if (obbA.intersectsOBB(obbB, epsilon)) return true;
      }
  return false;
};
const openingBounds = (wall, opening) => {
  const dx = wall.b[0] - wall.a[0],
    dz = wall.b[1] - wall.a[1],
    length = Math.hypot(dx, dz),
    ux = dx / length,
    uz = dz / length;
  // Include the black frames and 12 cm of interior reveal. Expanding both
  // faces is conservative and works independently of the wall orientation.
  const padding = wall.thickness / 2 + 0.12;
  return new THREE.Box3().setFromPoints(
    [
      [opening.from, -padding],
      [opening.from, padding],
      [opening.to, -padding],
      [opening.to, padding],
    ].flatMap(([along, across]) =>
      [opening.bottom, opening.top].map(
        (y) =>
          new THREE.Vector3(
            wall.a[0] + ux * along - uz * across,
            y,
            wall.a[1] + uz * along + ux * across,
          ),
      ),
    ),
  );
};

test("all furniture geometry fits the PDF room plus approved recessed bay without blocking windows", () => {
  near(kitchenRoom.east - kitchenRoom.west, 5.8, "PDF kitchen width");
  assert.ok(
    kitchenRoom.south - kitchenRoom.north <= kitchenRoom.pdfDepth,
    "use the smaller traced depth, not extra unverified floor",
  );
  near(
    kitchenBay.backInside - kitchenBay.mainEastInside,
    31.44 / (280.8 / 5.8),
    "PDF recess depth",
  );
  const windows = walls.flatMap((wall, index) =>
    wall.openings
      .filter((opening) => opening.type === "window")
      .map((opening) => ({ box: openingBounds(wall, opening), index })),
  );
  const point = new THREE.Vector3();
  for (const object of placedObjects) {
    assert.ok(
      bounds(object).max.y <= HEIGHT + epsilon,
      `${object.name} fits ceiling`,
    );
    for (const { mesh, box } of meshBounds(object)) {
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(
          insideKitchen(point.x, point.z),
          `${object.name}: mesh at ${point.x.toFixed(3)}, ${point.z.toFixed(3)} is inside the room / bay union`,
        );
      }
      for (const window of windows)
        assert.equal(
          volumetricOverlap(box, window.box),
          false,
          `${object.name} does not enter a window or reveal in wall ${window.index}`,
        );
    }
  }
  const sink =
    cabinetObjects[kitchenUnits.findIndex((unit) => unit.kind === "sink")];
  const faucet = meshBounds(sink).find(
    ({ mesh }) =>
      mesh.material === materials.black &&
      mesh.geometry.type === "TubeGeometry",
  );
  assert.ok(faucet, "actual arched faucet geometry exists");
  assert.ok(
    faucet.box.min.z > kitchenBay.windows[0].to + 0.015 &&
      faucet.box.max.z < kitchenBay.windows[1].from - 0.015,
    "the tall faucet is opposite the solid pier between the two narrow windows",
  );
});

test("L-shaped stone surfaces meet continuously and the blind corner has accessible doors", () => {
  const tops = cabinetObjects
    .map((object, index) => ({
      unit: kitchenUnits[index],
      object: object.children.find(
        (child) => child.name === "Warm limestone countertop",
      ),
    }))
    .filter(({ object }) => object);
  for (const { object } of tops)
    near(
      bounds(object).max.y,
      kitchenFloorY + 0.9,
      "continuous 90 cm countertop level",
    );
  // Touching edges must overlap in their other horizontal dimension: a mere
  // corner-point contact would leave a broken worktop rather than an L return.
  const connected = (a, b) => {
    const overlapX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
    const overlapZ = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    return (
      ((Math.abs(a.max.x - b.min.x) < epsilon ||
        Math.abs(b.max.x - a.min.x) < epsilon) &&
        overlapZ > 0.59) ||
      ((Math.abs(a.max.z - b.min.z) < epsilon ||
        Math.abs(b.max.z - a.min.z) < epsilon) &&
        overlapX > 0.59)
    );
  };
  const visited = new Set([0]),
    queue = [0];
  for (const i of queue)
    for (let j = 0; j < tops.length; j++)
      if (
        !visited.has(j) &&
        connected(bounds(tops[i].object), bounds(tops[j].object))
      ) {
        visited.add(j);
        queue.push(j);
      }
  assert.equal(
    visited.size,
    tops.length,
    "all base counters join into one continuous L",
  );
  const corner =
    cabinetObjects[kitchenUnits.findIndex((unit) => unit.kind === "corner")];
  const doors = corner.children.filter(
    (child) => child.name === "Blind-corner accessible door",
  );
  assert.equal(doors.length, 2);
  assert.ok(
    corner.children.some((child) => child.name === "Fixed blind-corner front"),
  );
  assert.ok(
    kitchenCorner.accessWidth >= 0.9,
    "90 cm accessible blind-corner frontage",
  );
  for (const door of doors) {
    const box = bounds(door);
    assert.ok(box.max.x - box.min.x <= 0.45, "manageable door leaf width");
    assert.ok(
      box.max.x < kitchenBay.backInside - 0.6 - 0.04,
      "accessible leaves remain west of the perpendicular cabinet fronts",
    );
  }
});

test("working aisles, island ends and route behind occupied stools retain at least 90 cm", () => {
  const island = bounds(islandObject),
    stools = stoolObjects.map(bounds);
  const southRun = kitchenUnits
    .map((unit, i) => ({ unit, box: bounds(cabinetObjects[i]) }))
    .filter(({ unit }) => Math.abs(unit.rotation - Math.PI) < epsilon);
  const returnRun = kitchenUnits
    .map((unit, i) => ({ unit, box: bounds(cabinetObjects[i]) }))
    .filter(({ unit }) => Math.abs(unit.rotation + Math.PI / 2) < epsilon);
  near(
    Math.min(...southRun.map(({ box }) => box.min.z)) - island.max.z,
    1.1,
    "working aisle measured including handles",
  );
  assert.ok(
    Math.min(...returnRun.map(({ box }) => box.min.x)) - island.max.x >= 0.9,
    "sink approach and return aisle",
  );
  assert.ok(island.min.x - kitchenRoom.west >= 0.9, "west entry route");
  assert.ok(
    kitchenRoom.east - island.max.x >= 0.9,
    "east route outside the recess",
  );
  assert.ok(
    Math.min(...stools.map((box) => box.min.z)) - kitchenRoom.north >= 0.9,
    "route behind the physical stools",
  );
  assert.ok(
    Math.min(...kitchenStools.map((stool) => stool.z - 0.275)) -
      kitchenRoom.north >=
      0.9,
    "route behind a 55 cm occupied-seating allowance",
  );
  for (const stool of stools)
    assert.ok(
      stool.max.z < island.min.z + kitchenIsland.overhang - 0.08,
      "stools tuck below the overhang without hitting the carved base",
    );
});

test("full drawer extensions and cabinet door sweeps clear the island and perpendicular run", () => {
  const island = place(buildIsland(kitchenIsland, materials), kitchenIsland);
  const closedIsland = bounds(island);
  setDrawerExtension(island, 1);
  near(bounds(island).max.z - closedIsland.max.z, 0.43, "island drawer travel");
  const opened = kitchenUnits.map(buildUnit);
  for (let i = 0; i < opened.length; i++) {
    const object = opened[i],
      unit = kitchenUnits[i];
    if (unit.kind !== "drawers") continue;
    const closed = bounds(object);
    setDrawerExtension(object, 1);
    near(closed.min.z - bounds(object).min.z, 0.425, "wall drawer travel");
    assert.ok(
      bounds(object).min.z - closedIsland.max.z > 0.6,
      "working space with one wall drawer open",
    );
    assert.equal(
      volumetricOverlap(bounds(object), bounds(island)),
      false,
      "opposing fully extended island and wall drawers do not collide",
    );
    for (let j = 0; j < opened.length; j++)
      if (i !== j)
        assert.equal(
          volumetricOverlap(bounds(object), bounds(opened[j])),
          false,
          `${unit.id} clears ${kitchenUnits[j].id} while open`,
        );
  }
  // Simulate actual carved leaves around outer hinges through the full swing,
  // including clearance to the perpendicular return. Visitors cannot edit them;
  // this verifies the cabinet configuration can physically operate.
  for (let i = 0; i < kitchenUnits.length; i++) {
    const unit = kitchenUnits[i];
    const local =
      unit.kind === "tower"
        ? buildTower(unit, materials)
        : unit.kind === "corner"
          ? buildBlindCorner(unit, materials)
          : buildBaseCabinet(
              {
                ...unit,
                drawers: unit.kind === "drawers",
                sink: unit.kind === "sink",
              },
              materials,
            );
    local.updateMatrixWorld(true);
    const leaves = local.children.filter((child) =>
      ["Carved walnut panel", "Blind-corner accessible door"].includes(
        child.name,
      ),
    );
    for (const leaf of leaves) {
      const box = bounds(leaf),
        hingeLeft = leaf.position.x <= 0 || unit.kind === "tower";
      const hingeX = hingeLeft ? box.min.x : box.max.x;
      const outer = new THREE.Group(),
        hinge = new THREE.Group(),
        panel = leaf.clone(true);
      // A front-edge hinge keeps the carved moulding clear of its neighbour.
      hinge.position.set(hingeX, leaf.position.y, box.max.z);
      panel.position.set(
        leaf.position.x - hingeX,
        0,
        leaf.position.z - box.max.z,
      );
      hinge.add(panel);
      outer.add(hinge);
      place(outer, unit);
      for (let degrees = 0; degrees <= 90; degrees += 15) {
        hinge.rotation.y =
          (hingeLeft ? -1 : 1) * THREE.MathUtils.degToRad(degrees);
        outer.updateMatrixWorld(true);
        const sweep = bounds(outer);
        assert.equal(
          volumetricOverlap(sweep, closedIsland),
          false,
          `${unit.id} door clears island at ${degrees} degrees`,
        );
        for (let j = 0; j < cabinetObjects.length; j++)
          if (j !== i)
            assert.equal(
              meshOverlap(outer, cabinetObjects[j]),
              false,
              `${unit.id} door clears ${kitchenUnits[j].id} at ${degrees} degrees`,
            );
      }
    }
  }
});

test("all room destinations and kitchen work / seating routes remain reachable on the actual collision map", () => {
  for (const room of rooms)
    assert.ok(canOccupy(...room.point, allObstacles), `${room.id} destination`);
  for (const obstacle of kitchenObstacles)
    assert.equal(
      canOccupy(obstacle.x, obstacle.z, allObstacles),
      false,
      "furniture blocks walking",
    );
  const step = 0.11,
    key = (x, z) => `${x},${z}`;
  const start = rooms[0].point.map((v) => Math.round(v / step));
  const seen = new Set([key(...start)]),
    queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i],
      from = { x: x * step, z: z * step };
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        nextKey = key(nx, nz);
      if (seen.has(nextKey) || !canOccupy(nx * step, nz * step, allObstacles))
        continue;
      const result = moveWithCollision(
        from,
        dx * step,
        dz * step,
        allObstacles,
      );
      if (Math.hypot(result.x - nx * step, result.z - nz * step) > 0.001)
        continue;
      seen.add(nextKey);
      queue.push([nx, nz]);
    }
  }
  const sink = kitchenUnits.find((unit) => unit.kind === "sink");
  for (const [x, z, label] of [
    ...rooms.map((room) => [...room.point, room.name]),
    [sink.x - sink.depth / 2 - 0.45, sink.z, "sink working approach"],
    [13.6, kitchenIsland.z, "east island end"],
    [10.1, kitchenIsland.z, "west island end"],
    [kitchenIsland.x, 1.3, "seating approach"],
  ])
    assert.ok(seen.has(key(Math.round(x / step), Math.round(z / step))), label);
});
