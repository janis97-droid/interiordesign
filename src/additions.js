import {
  bathroomFloors,
  footprint,
  p,
  pointInPolygon,
  stairs,
  walls,
} from "./plan.js";

export const SKIRTING_HEIGHT = 0.05;
export const SKIRTING_DEPTH = 0.01;
const bathroomAreas = [
  ...bathroomFloors.map((room) => room.polygon),
  [
    [104, 992],
    [197, 992],
    [197, 1094],
    [104, 1094],
  ].map(([x, z]) => p(x, z)),
];
const exclusions = [...bathroomAreas, stairs];
const openLivingArea = [
  [278, 414],
  [1175, 414],
  [1175, 744],
  [278, 744],
].map(([x, z]) => p(x, z));
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

// Split each wall face at room boundaries and floor-level openings. Testing the
// room side of a wall keeps shared bathroom partitions skirted only on the dry side.
export function skirtingRuns(wall) {
  const delta = [wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]];
  const length = Math.hypot(...delta),
    direction = delta.map((v) => v / length);
  const runs = [];
  for (const side of [-1, 1]) {
    // The traced footprint is slightly wider than some facade wall centrelines.
    // Explicitly exclude their outside faces rather than skirting that margin.
    const wallIndex = walls.indexOf(wall);
    if (
      (wallIndex >= 0 && wallIndex <= 7 && side < 0) ||
      (wallIndex === 9 && side > 0)
    )
      continue;
    const offset = side * (wall.thickness / 2 + 0.12);
    const origin = [
      wall.a[0] - direction[1] * offset,
      wall.a[1] + direction[0] * offset,
    ];
    const cuts = [0, length];
    const openings = wall.openings.filter((o) => o.bottom < SKIRTING_HEIGHT);
    for (const opening of openings) cuts.push(opening.from, opening.to);
    const tiledFaces = wall.finishes.filter((finish) => finish.side === side);
    for (const finish of tiledFaces) cuts.push(finish.from, finish.to);
    for (const polygon of [footprint, openLivingArea, ...exclusions]) {
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i],
          b = polygon[(i + 1) % polygon.length];
        const edge = [b[0] - a[0], b[1] - a[1]],
          determinant = cross(direction, edge);
        if (Math.abs(determinant) < 1e-8) continue;
        const relative = [a[0] - origin[0], a[1] - origin[1]];
        const along = cross(relative, edge) / determinant;
        const across = cross(relative, direction) / determinant;
        if (along > 0 && along < length && across >= 0 && across <= 1)
          cuts.push(along);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const from = cuts[i - 1],
        to = cuts[i],
        center = (from + to) / 2;
      if (
        to - from < 0.002 ||
        openings.some((o) => center >= o.from && center <= o.to) ||
        tiledFaces.some((f) => center >= f.from && center <= f.to)
      )
        continue;
      const point = [
        origin[0] + direction[0] * center,
        origin[1] + direction[1] * center,
      ];
      if (
        !pointInPolygon(...point, footprint) ||
        exclusions.some((poly) => pointInPolygon(...point, poly))
      )
        continue;
      const floorY = pointInPolygon(...point, openLivingArea) ? 0.003 : 0;
      const previous = runs.at(-1);
      if (
        previous?.side === side &&
        previous.floorY === floorY &&
        Math.abs(previous.to - from) < 0.002
      )
        previous.to = to;
      else runs.push({ from, to, side, floorY });
    }
  }
  return runs;
}

const divider = walls.find(
  (wall) => wall.a[0] === p(728, 414)[0] && wall.b[1] === p(728, 608)[1],
);
const screenDiagonal = 65 * 0.0254;
export const livingTV = {
  wall: divider,
  width: (screenDiagonal * 16) / Math.hypot(16, 9),
  height: (screenDiagonal * 9) / Math.hypot(16, 9),
  centerHeight: 1.15, // Initial mounting assumption, adjustable with the owner.
  lookAt: [
    (divider.a[0] + divider.b[0]) / 2,
    (divider.a[1] + divider.b[1]) / 2,
  ],
};
