import { walls, HEIGHT, footprint, balcony } from "./plan.js";

// Shared by the offline daylight bake and the runtime UVs. Eight samples per
// metre capture soft bounced light; screen-space AO supplies the fine contacts.
export const TEXELS_PER_METRE = 8;
export const LIGHTMAP_RANGE = 8;
const border = 2;
export const atlasWidth = 512;
export const floorBounds = {
  minX: Math.min(...[...footprint, ...balcony].map((p) => p[0])),
  minZ: Math.min(...[...footprint, ...balcony].map((p) => p[1])),
  maxX: Math.max(...[...footprint, ...balcony].map((p) => p[0])),
  maxZ: Math.max(...[...footprint, ...balcony].map((p) => p[1])),
};
const surfaces = [];
for (const [index, wall] of walls.entries()) {
  const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
  for (const side of [1, -1])
    surfaces.push({ id: `wall-${index}-${side}`, width: length, height: HEIGHT, index, side });
}
for (const id of ["floor", "ceiling"])
  surfaces.push({ id, width: floorBounds.maxX - floorBounds.minX, height: floorBounds.maxZ - floorBounds.minZ });
let x = 0, y = 0, rowHeight = 0;
export const patches = surfaces.map((surface) => {
  const width = Math.ceil(surface.width * TEXELS_PER_METRE) + 1;
  const height = Math.ceil(surface.height * TEXELS_PER_METRE) + 1;
  if (x + width + border * 2 > atlasWidth) { x = 0; y += rowHeight; rowHeight = 0; }
  const patch = { ...surface, x: x + border, y: y + border, pixelsWide: width, pixelsHigh: height };
  x += width + border * 2;
  rowHeight = Math.max(rowHeight, height + border * 2);
  return patch;
});
export const atlasHeight = 2 ** Math.ceil(Math.log2(y + rowHeight));
const lookup = new Map(patches.map((patch) => [patch.id, patch]));
export function daylightUV(id, u, v) {
  const patch = lookup.get(id);
  return [
    (patch.x + Math.max(0, Math.min(1, u)) * (patch.pixelsWide - 1) + 0.5) / atlasWidth,
    1 - (patch.y + Math.max(0, Math.min(1, v)) * (patch.pixelsHigh - 1) + 0.5) / atlasHeight,
  ];
}
