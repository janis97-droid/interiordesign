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
  walls,
  SCALE,
} from "../src/plan.js";
import { skirtingRuns } from "../src/additions.js";
import {
  ensuiteBox,
  ensuiteObstacles,
  ensuitePlumbing,
} from "../src/ensuite-layout.js";

test("triangular cistern boxing blocks walking while basin and shower approaches stay clear", () => {
  for (const room of rooms)
    assert.ok(canOccupy(...room.point, ensuiteObstacles), room.id);
  const [x, z] = ensuitePlumbing.toilet;
  assert.equal(
    canOccupy(x + 0.1, z, ensuiteObstacles),
    false,
    "inside the tiled boxing",
  );
  assert.equal(
    canOccupy(x - 0.1, z, ensuiteObstacles),
    false,
    "body clearance from front face",
  );
  const approach = moveWithCollision(
    { x: x - 0.8, z },
    1.4,
    0,
    ensuiteObstacles,
  );
  assert.ok(approach.x <= ensuiteBox.frontX - 0.18);
  assert.ok(canOccupy(approach.x, approach.z, ensuiteObstacles));
  assert.ok(
    canOccupy(...p(975, 1090), ensuiteObstacles),
    "left basin approach",
  );
  assert.ok(canOccupy(...p(943, 1300), ensuiteObstacles), "right shower area");
  const beside = moveWithCollision(
    { x: p(943, 1175)[0], z },
    0,
    1.6,
    ensuiteObstacles,
  );
  assert.ok(beside.z > z + 1.5, "walk along the boxing towards the shower");
  assert.ok(canOccupy(beside.x, beside.z, ensuiteObstacles));
});

test("tile skirting leaves doors and bathroom faces clear, retaining the dry side", () => {
  // A shared WC/hall wall retains both short hall sections but no WC strip.
  const wcHall = skirtingRuns(walls[13]);
  assert.equal(wcHall.length, 2);
  assert.ok(wcHall.every((run) => run.side === -1));
  // The large bathroom/flex-room partition is tiled only on the flex side.
  const bathFlex = skirtingRuns(walls[15]);
  assert.equal(bathFlex.length, 1);
  assert.equal(bathFlex[0].side, -1);
  // This wall borders a bathroom, WC and hall; only the solid hall face remains.
  const shared = skirtingRuns(walls[14]);
  assert.equal(shared.length, 1);
  assert.equal(shared[0].side, -1);
  assert.ok(Math.abs(shared[0].from * SCALE - 93) < 0.001);
  assert.ok(Math.abs(shared[0].to * SCALE - 153) < 0.001);
  for (const wall of walls) {
    for (const run of skirtingRuns(wall)) {
      for (const door of wall.openings.filter((o) => o.type === "door"))
        assert.ok(
          run.to <= door.from + 1e-6 || run.from >= door.to - 1e-6,
          "no strip across a doorway",
        );
      for (const face of wall.finishes.filter((f) => f.side === run.side))
        assert.ok(
          run.to <= face.from + 1e-6 || run.from >= face.to - 1e-6,
          "no strip on a bathroom finish",
        );
    }
  }
});

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
  assert.equal(canOccupy(...p(410, 994)), true, "relocated guest doorway");
  assert.equal(canOccupy(...p(451, 965)), false, "closed former guest doorway");
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
test("guest entry moves around the corner and the former doorway blocks walking", () => {
  const [x, z] = p(410, 1038);
  const next = moveWithCollision({ x, z }, 0, -1.2);
  assert.ok(next.z < p(410, 994)[1] - 0.25, "enter through the south wall");
  assert.ok(canOccupy(next.x, next.z));
  const [oldX, oldZ] = p(494, 960);
  const blocked = moveWithCollision({ x: oldX, z: oldZ }, -1.2, 0);
  assert.ok(blocked.x > p(451, 960)[0] + 0.2, "east wall is now solid");
  assert.ok(canOccupy(blocked.x, blocked.z));
});
test("photo-matched balcony slider and separate WC have clear passages", () => {
  assert.equal(canOccupy(...p(278, 640)), false, "stacked balcony glass");
  assert.equal(canOccupy(...p(278, 703)), true, "open half of balcony slider");
  const [x, z] = p(308, 703);
  const next = moveWithCollision({ x, z }, -0.9, 0);
  assert.ok(next.x < p(278, 703)[0] - 0.3, "walk through to balcony");
  assert.equal(canOccupy(...p(197, 1047)), true, "small WC door");
  assert.equal(canOccupy(...p(197, 1002)), false, "small WC partition");
  assert.equal(canOccupy(...p(294, 1094)), true, "larger bathroom door");
  assert.equal(canOccupy(...p(150, 1094)), false, "WC/bathroom dividing wall");
});
test("furniture collision respects rotated footprints and allows sliding", () => {
  const [x, z] = p(518, 800),
    obstacles = [{ x: x - 1, z, width: 0.6, depth: 1.6, angle: Math.PI / 2 }];
  assert.equal(canOccupy(x - 0.6, z, obstacles), false);
  const next = moveWithCollision({ x, z }, -2, 0.6, obstacles);
  assert.ok(canOccupy(next.x, next.z, obstacles));
  assert.ok(next.z > z + 0.3);
});
