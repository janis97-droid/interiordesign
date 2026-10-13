import { HEIGHT, walls, kitchenBay } from "./plan.js";

// Furniture fitted to the owner's approved PDF correction for the recessed
// sink bay. Keep the 5.80 m main-room dimension conservative; the additional
// 0.649402 m bay is used only inside its measured 2.101880 m return.
export const kitchenFloorY = 0.003;
export const kitchenRoom = {
  east: kitchenBay.mainEastInside,
  north: walls[0].a[1] + walls[0].thickness / 2,
  south: kitchenBay.southInside,
  pdfWidth: 5.8,
  pdfDepth: 4.4,
};
kitchenRoom.west = kitchenRoom.east - kitchenRoom.pdfWidth;
const cabinetBack = kitchenRoom.south - 0.01;
const sinkBack = kitchenBay.backInside - 0.01;
const cornerStart = 13.6;
const returnEnd = cabinetBack - 0.6;
export const kitchenCorner = {
  id: "blind-corner",
  kind: "corner",
  x: (cornerStart + sinkBack) / 2,
  z: cabinetBack - 0.3,
  width: sinkBack - cornerStart,
  depth: 0.6,
  height: 0.9,
  accessWidth: 0.9,
  // Local +X rotates toward the west, leaving accessible doors at X13.6..14.5.
  blindSide: "negativeX",
  rotation: Math.PI,
};
const southUnits = [
  { id: "pantry", kind: "tower", x: 11.1, width: 0.6, height: 2.3 },
  { id: "drawers-60", kind: "drawers", x: 11.7, width: 0.6, height: 0.9 },
  { id: "drawers-80-west", kind: "drawers", x: 12.4, width: 0.8, height: 0.9 },
  { id: "drawers-80", kind: "drawers", x: 13.2, width: 0.8, height: 0.9 },
].map((unit) => ({
  ...unit,
  z: cabinetBack - 0.3,
  depth: 0.6,
  rotation: Math.PI,
}));
export const kitchenUnits = [
  ...southUnits,
  kitchenCorner,
  {
    id: "sink-80",
    kind: "sink",
    x: sinkBack - 0.3,
    z: returnEnd - 0.4,
    width: 0.8,
    depth: 0.6,
    height: 0.9,
    rotation: -Math.PI / 2,
  },
  {
    id: "cupboard-60-return",
    kind: "cupboard",
    x: sinkBack - 0.3,
    z: returnEnd - 1.1,
    width: 0.6,
    depth: 0.6,
    height: 0.9,
    rotation: -Math.PI / 2,
  },
];
export const kitchenIsland = {
  id: "island",
  x: 11.884,
  z: cabinetBack - 0.6 - 1.1 - 0.475,
  length: 2.1,
  width: 0.95,
  height: 0.9,
  overhang: 0.28,
  rotation: -Math.PI / 2,
};
export const kitchenStools = [-0.7, 0, 0.7].map((offset, index) => ({
  id: `stool-${index + 1}`,
  x: kitchenIsland.x + offset,
  z: kitchenIsland.z - kitchenIsland.width / 2 - 0.08,
  width: 0.42,
  depth: 0.42,
  height: 0.65,
}));
export const kitchenShelves = [1.46, 1.86].map((height, index) => ({
  id: `shelf-${index + 1}`,
  x: 13.15,
  z: cabinetBack - 0.13,
  width: 2.2,
  depth: 0.26,
  height,
}));
export const kitchenLanterns = [-0.7, 0, 0.7].map((offset, index) => ({
  id: `lantern-${index + 1}`,
  x: kitchenIsland.x + offset,
  z: kitchenIsland.z,
  ceilingHeight: HEIGHT,
  bottom: 1.86,
  lightHeight: 2.08,
}));
export const kitchenClearances = {
  working: cabinetBack - 0.6 - (kitchenIsland.z + kitchenIsland.width / 2),
  east: kitchenRoom.east - (kitchenIsland.x + kitchenIsland.length / 2),
  sinkWorking: sinkBack - 0.6 - (kitchenIsland.x + kitchenIsland.length / 2),
  west: kitchenIsland.x - kitchenIsland.length / 2 - kitchenRoom.west,
  north: kitchenIsland.z - kitchenIsland.width / 2 - kitchenRoom.north,
  behindStools: kitchenStools[0].z - 0.275 - kitchenRoom.north,
  drawerExtension: 0.55,
};
// Axis-aligned world footprints for the north-facing main run and west-facing
// return. Component width always measures its door frontage, not world X.
const worldFootprint = (unit) => {
  const acrossX = Math.abs(Math.cos(unit.rotation)),
    acrossZ = Math.abs(Math.sin(unit.rotation));
  return {
    x: unit.x,
    z: unit.z,
    width: unit.width * acrossX + unit.depth * acrossZ,
    depth: unit.width * acrossZ + unit.depth * acrossX,
  };
};
export const kitchenObstacles = [
  ...kitchenUnits.map(worldFootprint),
  {
    x: kitchenIsland.x,
    z: kitchenIsland.z,
    width: kitchenIsland.length,
    depth: kitchenIsland.width,
  },
  ...kitchenStools.map((s) => ({
    x: s.x,
    z: s.z,
    width: s.width,
    depth: s.depth,
  })),
];

// Simple occluders and lightmap patches for the offline day/night bake. Small
// carved details get their fine contact shading from screen-space occlusion.
export const kitchenBakeBoxes = [
  ...kitchenUnits.map((u) => ({
    id: u.id,
    ...worldFootprint(u),
    height: u.height,
    y: kitchenFloorY,
  })),
  {
    id: "island",
    x: kitchenIsland.x,
    z: kitchenIsland.z,
    width: kitchenIsland.length,
    depth: kitchenIsland.width,
    height: kitchenIsland.height,
    y: kitchenFloorY,
  },
];
export const kitchenEmitters = [
  ...kitchenLanterns.map((l) => ({
    position: [l.x, l.lightHeight, l.z],
    intensity: 3,
    cone: 0,
  })),
  ...kitchenShelves.flatMap((s) =>
    Array.from({ length: 5 }, (_, i) => ({
      position: [
        s.x - s.width / 2 + (s.width * (i + 0.5)) / 5,
        s.height - 0.025,
        s.z - 0.03,
      ],
      intensity: 0.22,
      cone: 0,
    })),
  ),
];
