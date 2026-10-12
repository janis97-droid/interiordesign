import { p, walls } from "./plan.js";

// Owner confirmed: from the doorway, WC/window ahead, basin left, shower right.
// Position and dimensions below are estimates from the photos, not site measurements.
const facade = walls[3];
const length = Math.hypot(facade.b[0] - facade.a[0], facade.b[1] - facade.a[1]);
const direction = [
  (facade.b[0] - facade.a[0]) / length,
  (facade.b[1] - facade.a[1]) / length,
];
const inset = facade.thickness / 2 + 0.004;
const inside = [
  facade.a[0] - direction[1] * inset,
  facade.a[1] + direction[0] * inset,
];
const frontX = p(1015, 1114)[0],
  startZ = p(1015, 1114)[1];
const endZ = inside[1] + ((frontX - inside[0]) * direction[1]) / direction[0];
const backX = inside[0] + ((startZ - inside[1]) * direction[0]) / direction[1];

export const ensuiteBox = {
  height: 1.12,
  frontX,
  startZ,
  endZ,
  backX,
  length: endZ - startZ,
  depth: backX - frontX,
  polygon: [
    [frontX, startZ],
    [backX, startZ],
    [frontX, endZ],
  ],
};
export const ensuitePlumbing = {
  toilet: [frontX, p(1015, 1175)[1]],
  basin: [p(975, 1060)[0], p(975, 1060)[1] + walls[21].thickness / 2 + 0.004],
  shower: [p(943, 1337)[0], p(943, 1337)[1] - walls[4].thickness / 2 - 0.004],
  drain: p(943, 1300),
};
export const ensuiteObstacles = [{ polygon: ensuiteBox.polygon }];
