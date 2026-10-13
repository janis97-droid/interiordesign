import { p, walls } from "./plan.js";

// Owner requested a toilet in the corridor WC. Its rear is on the charcoal
// window wall as indicated by the plan; product dimensions are provisional.
export const corridorToilet = {
  point: [walls[5].a[0] + walls[5].thickness / 2 + 0.006, p(104, 1044)[1]],
  width: 0.36,
  projection: 0.53,
  height: 0.43,
};
// Owner confirmed the washer is inside the bathroom around the tiled return.
// A generic 60 cm front-loader; exact product and recess dimensions unmeasured.
export const bathroomWasher = {
  point: [
    walls[5].a[0] + walls[5].thickness / 2 + 0.04 + 0.31,
    p(104, 1260)[1],
  ],
  width: 0.6,
  depth: 0.62,
  height: 0.85,
};
export const bathroomObstacles = [
  {
    x: corridorToilet.point[0] + corridorToilet.projection / 2,
    z: corridorToilet.point[1],
    width: corridorToilet.projection,
    depth: corridorToilet.width,
  },
  {
    x: bathroomWasher.point[0],
    z: bathroomWasher.point[1],
    width: bathroomWasher.depth,
    depth: bathroomWasher.width,
  },
];

// Visible rough-ins in the large bathroom video. These are approximate
// locations, not a plumbing specification or a proposed vanity/shower layout.
export const largeBathroomDetails = {
  manifold: [walls[5].a[0] + walls[5].thickness / 2 + 0.007, p(104, 1175)[1]],
  basin: [p(190, 1094)[0], walls[14].a[1] + walls[14].thickness / 2 + 0.007],
  drain: p(231, 1248),
};
