import test from "node:test";
import assert from "node:assert/strict";
import {
  livingSofas,
  livingTable,
  livingObstacles,
  livingView,
} from "../src/living-layout.js";
import { livingTV } from "../src/additions.js";
import { rooms, walls, canOccupy, moveWithCollision } from "../src/plan.js";
import { kitchenObstacles } from "../src/kitchen-layout.js";
import { ensuiteObstacles } from "../src/ensuite-layout.js";
import { bathroomObstacles } from "../src/bathroom-details-layout.js";
const obstacles = [
  ...livingObstacles,
  ...kitchenObstacles,
  ...ensuiteObstacles,
  ...bathroomObstacles,
];

test("living furniture keeps all rooms and the balcony reachable", () => {
  const step = 0.11,
    key = (x, z) => `${x},${z}`,
    start = livingView.point.map((v) => Math.round(v / step));
  const seen = new Set([key(...start)]),
    queue = [start];
  assert.ok(canOccupy(...livingView.point, obstacles));
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = x + dx,
        b = z + dz,
        k = key(a, b);
      if (!seen.has(k) && canOccupy(a * step, b * step, obstacles)) {
        seen.add(k);
        queue.push([a, b]);
      }
    }
  }
  for (const room of rooms) {
    const cell = room.point.map((v) => Math.round(v / step));
    assert.ok(seen.has(key(...cell)), room.name);
  }
  assert.ok(
    seen.has(key(Math.round(4.12 / step), Math.round(1.8 / step))),
    "access beside west sofa",
  );
});

test("sofas and tables stop walking without blocking the balcony route", () => {
  for (const o of livingObstacles)
    assert.equal(canOccupy(o.x, o.z, obstacles), false);
  const moved = moveWithCollision({ x: 5.22, z: 4.2 }, 0, -2, obstacles);
  assert.ok(
    moved.z >= livingObstacles[1].z + livingObstacles[1].depth / 2 + 0.18,
  );
  assert.ok(canOccupy(2.9, 4.25, obstacles), "balcony approach");
  const west = livingObstacles[0],
    south = livingObstacles[1];
  assert.ok(
    livingTable.x - livingTable.width / 2 - (west.x + west.width / 2) >= 0.9,
    "table to west sofa",
  );
  assert.ok(
    south.z - south.depth / 2 - (livingTable.z + livingTable.depth / 2) >= 0.45,
    "seated reach and knee room",
  );
  assert.ok(
    walls[9].b[1] - (south.z + south.depth / 2) >= 1,
    "route behind south sofa",
  );
});

test("75-inch TV fits the unchanged divider at the higher mounting position", () => {
  assert.ok(
    Math.abs(Math.hypot(livingTV.width, livingTV.height) - 75 * 0.0254) < 1e-10,
  );
  assert.equal(livingTV.centerHeight, 1.5);
  const wallLength = Math.hypot(
    livingTV.wall.b[0] - livingTV.wall.a[0],
    livingTV.wall.b[1] - livingTV.wall.a[1],
  );
  assert.ok(livingTV.width + 0.016 < wallLength);
  assert.ok(livingTV.centerHeight - livingTV.height / 2 > 1);
  assert.equal(livingSofas.length, 2);
});
