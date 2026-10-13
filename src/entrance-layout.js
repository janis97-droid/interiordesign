import { p, HEIGHT } from "./plan.js";

// Owner confirmed a 40 cm drop, confined to the corridor outside the rooms and
// ending at the living-room entrance. The main ceiling height is still assumed.
export const ceilingHeight = HEIGHT - 0.4;
export const ceilingSections = [
  { id: "entrance", min: p(590, 744), max: p(883, 919) },
  { id: "corridor", min: p(451, 744), max: p(590, 1094) },
  { id: "cross-hall", min: p(197, 994), max: p(451, 1094) },
].map((section) => ({
  ...section,
  width: section.max[0] - section.min[0],
  depth: section.max[1] - section.min[1],
  height: HEIGHT - ceilingHeight,
}));
export const acGrille = {
  from: p(451, 744)[0] + 0.15,
  to: p(883, 744)[0] - 0.15,
  z: p(451, 744)[1],
  bottom: ceilingHeight + 0.16,
  top: ceilingHeight + 0.28,
};
export const magneticTracks = [
  ...[635, 730, 825].map((x) => ({ from: p(x, 765), to: p(x, 895) })),
  { from: p(520, 770), to: p(520, 1065) },
];
export const entranceSpots = [p(777, 825)];
export const warmLightColor = "#ffd7ad"; // A warm-white, approximately 3000 K look.

// Quadrature points for the linear diffusers. The offline bake includes their
// shadows and bounced light; no array of real-time shadow maps is needed.
export const interiorEmitters = magneticTracks
  .flatMap(({ from, to }) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.ceil(length / 0.45);
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count;
      return {
        position: [
          from[0] + (to[0] - from[0]) * t,
          ceilingHeight - 0.025,
          from[1] + (to[1] - from[1]) * t,
        ],
        intensity: (5 * length) / count,
        cone: 0,
      };
    });
  })
  .concat(
    entranceSpots.map(([x, z]) => ({
      position: [x, ceilingHeight - 0.03, z],
      intensity: 12,
      cone: Math.cos(Math.PI / 5),
    })),
  );
