// Geometry traced from koma-b.pdf, not an architectural survey.
// The 1,530 cm dimension spans x=103..1223 on our 1,273 px reference image.
export const SCALE = 1120 / 15.3;
export const HEIGHT = 2.8; // Assumption: the source has no ceiling-height schedule.
export const EYE_HEIGHT = 1.62;
export const FLOOR_TILE_SIZE = 1; // Metres, confirmed by the owner.
export const BALCONY_DOOR_WIDTH = 1.6; // Photo/tile estimate; frame to frame.
export const p = (x, y) => [(x - 103) / SCALE, (y - 381) / SCALE];
export const footprint = [
  [278, 403],
  [1175, 403],
  [1208, 762],
  [990, 1337],
  [104, 1337],
  [104, 992],
  [166, 992],
  [166, 744],
  [278, 744],
].map(([x, y]) => p(x, y));
export const balcony = [
  [118, 404],
  [278, 404],
  [278, 737],
  [118, 737],
].map(([x, y]) => p(x, y));
export const stairs = [
  [893, 770],
  [1187, 770],
  [1059, 1058],
  [887, 1058],
].map(([x, y]) => p(x, y));

// Opening positions are distances in reference pixels from the segment's first point.
const w = (a, b, openings = [], thickness = 0.16, finishes = []) => ({
  a: p(...a),
  b: p(...b),
  openings: openings.map((o) => ({
    ...o,
    from: o.from / SCALE,
    to: o.to / SCALE,
    ...(o.passageFrom === undefined
      ? {}
      : { passageFrom: o.passageFrom / SCALE }),
  })),
  thickness,
  finishes: finishes.map((f) => ({
    ...f,
    from: f.from / SCALE,
    to: f.to / SCALE,
  })),
});
const win = (from, to, details = {}) => ({
  from,
  to,
  bottom: 0.78,
  top: 2.42,
  type: "window",
  ...details,
});
const door = (from, to) => ({ from, to, bottom: 0, top: 2.18, type: "door" });
// The photographed balcony slider is shown half open, with both leaves stacked
// toward the window. Collision uses the remaining clear passage, not the glass.
const balconyDoor = {
  ...door(320 - BALCONY_DOOR_WIDTH * SCALE, 320),
  top: 2.42,
  sliding: true,
  passageFrom: 320 - (BALCONY_DOOR_WIDTH / 2) * SCALE,
};
const photoWindow = { transom: 0.28, shutterBox: true };
export const walls = [
  w(
    [278, 414],
    [1175, 414],
    [
      win(18, 313, { ...photoWindow, panels: 3 }),
      win(382, 443),
      win(590, 884, { ...photoWindow, panels: 3 }),
    ],
    0.22,
  ),
  w(
    [1175, 414],
    [1175, 745],
    [win(19, 123, { ...photoWindow, panels: 2 }), win(185, 282)],
    0.22,
  ),
  w([1175, 745], [1208, 770], [], 0.2),
  w([1208, 770], [990, 1337], [win(80, 188), win(401, 464)], 0.2),
  w([990, 1337], [104, 1337], [win(178, 337), win(409, 502)], 0.2),
  w(
    [104, 1337],
    [104, 992],
    [win(92, 172), win(251, 306, { bottom: 1.05, top: 2.28, panels: 1 })],
    0.2,
    [{ from: 243, to: 343, side: 1, material: "charcoalWave" }],
  ),
  w([104, 992], [166, 992], [], 0.2, [
    { from: 0, to: 62, side: 1, material: "whiteWave" },
  ]),
  w([166, 992], [166, 744], [win(39, 191)], 0.2),
  w([166, 744], [451, 744], [], 0.16),
  w(
    [278, 414],
    [278, 737],
    [win(0, 139, { ...photoWindow, panels: 2 }), balconyDoor],
    0.16,
  ),
  w([451, 744], [451, 994], [door(188, 247)], 0.14),
  w([166, 994], [451, 994], [], 0.16, [
    { from: 0, to: 31, side: 1, material: "whiteWave" },
  ]),
  w([451, 994], [590, 994], [door(20, 118)], 0.12),
  // Separate small WC on the side opposite the stairs, shown in the plan/photo.
  w([197, 994], [197, 1094], [door(23, 83)], 0.12, [
    { from: 0, to: 100, side: 1, material: "whiteWave" },
  ]),
  w([104, 1094], [318, 1094], [door(153, 214)], 0.12, [
    { from: 0, to: 93, side: -1, material: "whiteWave" },
  ]),
  w([318, 1094], [318, 1337], [], 0.16),
  w([318, 1094], [583, 1094], [door(192, 264)], 0.16),
  w([590, 919], [590, 1337], [door(86, 160)], 0.16),
  w([590, 919], [883, 919], [], 0.16),
  w([883, 744], [883, 1337], [door(40, 111), door(332, 397)], 0.16),
  w([883, 744], [1175, 744], [], 0.16),
  w([883, 1060], [1093, 1060], [], 0.12),
  // Owner confirmed the outlined extension was never built. Retain only the
  // solid section shown on the plan, ending at reference y=608 (~2.65 m long).
  w([728, 414], [728, 608], [], 0.19),
];
// Bathroom finishes are shared by owner confirmation. Ranges are clipped to
// each room; adjacent rooms retain their existing surfaces.
const finishWall = (a, b, finish) => {
  const start = p(...a),
    end = p(...b);
  const wall = walls.find(
    (wall) =>
      wall.a[0] === start[0] &&
      wall.a[1] === start[1] &&
      wall.b[0] === end[0] &&
      wall.b[1] === end[1],
  );
  wall.finishes.push({
    ...finish,
    from: finish.from / SCALE,
    to: finish.to / SCALE,
  });
};
finishWall([104, 1337], [104, 992], {
  from: 0,
  to: 243,
  side: 1,
  material: "marbleBath",
});
finishWall([104, 1094], [318, 1094], {
  from: 0,
  to: 214,
  side: 1,
  material: "marbleBath",
});
finishWall([318, 1094], [318, 1337], {
  from: 0,
  to: 243,
  side: 1,
  material: "marbleBath",
});
finishWall([990, 1337], [104, 1337], {
  from: 672,
  to: 886,
  side: 1,
  material: "marbleBath",
});
finishWall([883, 744], [883, 1337], {
  from: 316,
  to: 593,
  side: -1,
  material: "marbleEnsuite",
});
finishWall([883, 1060], [1093, 1060], {
  from: 0,
  to: 210,
  side: 1,
  material: "marbleEnsuite",
});
finishWall([1208, 770], [990, 1337], {
  from: (Math.hypot(218, 567) * 290) / 567,
  to: Math.hypot(218, 567),
  side: 1,
  material: "marbleEnsuite",
});
finishWall([990, 1337], [104, 1337], {
  from: 0,
  to: 107,
  side: 1,
  material: "marbleEnsuite",
});
export const bathroomFloors = [
  {
    material: "floorBath",
    polygon: [
      [104, 1094],
      [318, 1094],
      [318, 1337],
      [104, 1337],
    ].map(([x, y]) => p(x, y)),
  },
  {
    material: "floorEnsuite",
    polygon: [
      [883, 1060],
      [1208 - (218 * 290) / 567, 1060],
      [990, 1337],
      [883, 1337],
    ].map(([x, y]) => p(x, y)),
  },
];
export const rooms = [
  {
    id: "living",
    name: "Living room",
    category: "Gather & unwind",
    size: "5.80 × 4.20 m",
    point: p(519, 682),
    look: p(485, 466),
    bounds: [278, 403, 728, 744],
  },
  {
    id: "dining",
    name: "Kitchen & dining",
    category: "Cook & connect",
    size: "5.80 m wide",
    point: p(813, 607),
    look: p(1046, 505),
    bounds: [728, 403, 1175, 744],
  },
  {
    id: "balcony",
    name: "Balcony",
    category: "A little fresh air",
    size: "2.20 m wide",
    point: p(198, 681),
    look: p(181, 435),
    bounds: [118, 404, 278, 744],
  },
  {
    id: "guest",
    name: "Guest room",
    category: "A quiet retreat",
    size: "3.80 × 3.30 m",
    point: p(412, 927),
    look: p(284, 792),
    bounds: [166, 744, 451, 994],
  },
  {
    id: "bedroom",
    name: "Primary bedroom",
    category: "Rest & reset",
    size: "3.95 m plan dimension",
    point: p(658, 1084),
    look: p(762, 1230),
    bounds: [590, 919, 883, 1337],
  },
  {
    id: "flex",
    name: "Flex room",
    category: "Work, read, recharge",
    size: "3.30 × 3.00 m · safe room",
    point: p(525, 1160),
    look: p(414, 1210),
    bounds: [318, 1094, 590, 1337],
  },
  {
    id: "wc",
    name: "Small toilet",
    category: "Existing wave tiles",
    size: "White waves · charcoal window wall",
    point: p(164, 1067),
    look: p(107, 1038),
    bounds: [104, 994, 197, 1094],
  },
  {
    id: "bath",
    name: "Large bathroom",
    category: "Existing dark marble",
    size: "Dark marble · white veining",
    point: p(278, 1150),
    look: p(125, 1260),
    bounds: [104, 1094, 318, 1337],
  },
  {
    id: "ensuite",
    name: "Parents’ bathroom",
    category: "Existing dark marble",
    size: "Matching marble · angled façade",
    point: p(962, 1116),
    look: p(1024, 1193),
    bounds: [883, 1060, 1093, 1260],
  },
];
export const roomAt = (x, z) =>
  rooms.find((r) => {
    const a = p(r.bounds[0], r.bounds[1]),
      b = p(r.bounds[2], r.bounds[3]);
    return x >= a[0] && x <= b[0] && z >= a[1] && z <= b[1];
  });

export function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i],
      [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}
export function wallSolids() {
  return walls.flatMap((wall) => {
    const dx = wall.b[0] - wall.a[0],
      dz = wall.b[1] - wall.a[1],
      length = Math.hypot(dx, dz);
    const cuts = wall.openings
      .filter((o) => o.type === "door")
      .map((o) => ({ ...o, from: o.passageFrom ?? o.from }))
      .sort((a, b) => a.from - b.from);
    const intervals = [];
    let start = 0;
    for (const cut of cuts) {
      if (cut.from > start) intervals.push([start, cut.from]);
      start = cut.to;
    }
    if (start < length) intervals.push([start, length]);
    return intervals.map(([a, b]) => ({
      a: [wall.a[0] + (dx * a) / length, wall.a[1] + (dz * a) / length],
      b: [wall.a[0] + (dx * b) / length, wall.a[1] + (dz * b) / length],
      thickness: wall.thickness,
    }));
  });
}
export const solids = wallSolids();
export function distanceToSegment(x, z, a, b) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)),
  );
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
export function canOccupy(x, z, obstacles = [], radius = 0.18) {
  if (!(pointInPolygon(x, z, footprint) || pointInPolygon(x, z, balcony)))
    return false;
  if (pointInPolygon(x, z, stairs)) return false;
  // Keep a body's width away from the un-walled balcony boundary.
  for (const [a, b] of [
    [balcony[0], balcony[1]],
    [balcony[0], balcony[3]],
    [balcony[3], balcony[2]],
  ])
    if (distanceToSegment(x, z, a, b) < radius) return false;
  if (
    solids.some(
      (s) => distanceToSegment(x, z, s.a, s.b) < radius + s.thickness / 2,
    )
  )
    return false;
  return !obstacles.some((o) => {
    const dx = x - o.x,
      dz = z - o.z,
      c = Math.cos(o.angle || 0),
      s = Math.sin(o.angle || 0);
    const lx = dx * c - dz * s,
      lz = dx * s + dz * c;
    return (
      Math.abs(lx) < o.width / 2 + radius && Math.abs(lz) < o.depth / 2 + radius
    );
  });
}
export function moveWithCollision(position, dx, dz, obstacles = []) {
  // Substep movement so a dropped frame cannot tunnel through a wall.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.06));
  let { x, z } = position;
  for (let i = 0; i < steps; i++) {
    if (canOccupy(x + dx / steps, z, obstacles)) x += dx / steps;
    if (canOccupy(x, z + dz / steps, obstacles)) z += dz / steps;
  }
  return { x, z };
}
