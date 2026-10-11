import test from "node:test";
import assert from "node:assert/strict";
import {
  canOccupy,
  moveWithCollision,
  p,
  rooms,
  footprint,
  balcony,
  pointInPolygon,
} from "../src/plan.js";

test("room destinations are inside the floor and clear of walls", () => {
  for (const room of rooms) {
    assert.ok(canOccupy(...room.point), room.id);
    assert.ok(
      pointInPolygon(...room.point, footprint) ||
        pointInPolygon(...room.point, balcony),
      room.id,
    );
  }
});
test("doors allow passage; solid partitions and window openings stop walking", () => {
  assert.equal(canOccupy(...p(451, 965)), true, "guest doorway");
  assert.equal(canOccupy(...p(451, 820)), false, "guest wall");
  assert.equal(canOccupy(...p(440, 414)), false, "living window");
  assert.equal(canOccupy(...p(980, 925)), false, "stairwell");
  assert.equal(canOccupy(-1, 7), false, "outside the footprint");
});
test("movement cannot tunnel through a wall even with a large delta", () => {
  const [x, z] = p(518, 810);
  const next = moveWithCollision({ x, z }, -5, 0);
  assert.ok(next.x > p(451, 810)[0] + 0.2);
  assert.ok(canOccupy(next.x, next.z));
});
test("movement passes through an open doorway", () => {
  const [x, z] = p(494, 960);
  const next = moveWithCollision({ x, z }, -1.2, 0);
  assert.ok(next.x < p(451, 960)[0] - 0.25);
});
test("furniture collision respects rotated footprints and allows sliding", () => {
  const [x, z] = p(518, 800),
    obstacles = [{ x: x - 1, z, width: 0.6, depth: 1.6, angle: Math.PI / 2 }];
  assert.equal(canOccupy(x - 0.6, z, obstacles), false);
  const next = moveWithCollision({ x, z }, -2, 0.6, obstacles);
  assert.ok(canOccupy(next.x, next.z, obstacles));
  assert.ok(next.z > z + 0.3);
});
