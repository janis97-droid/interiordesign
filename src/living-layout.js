// Furniture follows the owner's annotated overhead layout. All sizes are metres;
// architecture, existing window openings and the balcony slider are preserved.
export const livingFloorY = 0.003;
export const livingSofas = [
  { id: "west-sofa", x: 3.10, z: 1.85, width: 2.20, depth: 0.94, height: 0.90, rotation: Math.PI / 2 },
  { id: "south-sofa", x: 5.22, z: 3.31, width: 2.60, depth: 0.94, height: 0.90, rotation: Math.PI },
];
export const livingTable = { id: "coffee-table", x: 5.15, z: 1.97, width: 1.30, depth: 0.78, height: 0.43 };
export const livingSideTable = { id: "lamp-table", x: 3.13, z: 3.38, width: 0.48, depth: 0.48, height: 0.57 };
export const livingRug = { x: 5.34, z: 2.05, width: 3.80, depth: 2.60 };
export const livingView = { point: [7.45, 4.12], look: [4.55, 1.85] };
export const livingItems = [...livingSofas, livingTable, livingSideTable];
export function livingFootprint(item) {
  const c = Math.abs(Math.cos(item.rotation || 0)), s = Math.abs(Math.sin(item.rotation || 0));
  return { x: item.x, z: item.z, width: item.width * c + item.depth * s, depth: item.width * s + item.depth * c };
}
export const livingObstacles = livingItems.map(livingFootprint);
// Full envelopes receive lightmap UVs; separate component occluders leave the
// spaces beneath the tables and sofa seats open to bounced daylight.
export const livingBakeBoxes = livingItems.map(item => ({ id: item.id, ...livingFootprint(item), y: livingFloorY, height: item.height }));
export const livingOccluders = [];
function part(item, x, y, z, width, height, depth, albedo) {
  const a = item.rotation || 0, c = Math.cos(a), s = Math.sin(a);
  livingOccluders.push({ x: item.x + x*c + z*s, z: item.z - x*s + z*c,
    width: Math.abs(width*c) + Math.abs(depth*s), depth: Math.abs(width*s) + Math.abs(depth*c), y: y + livingFloorY, height, albedo });
}
for (const item of livingSofas) {
  part(item, 0, 0.16, 0, item.width, 0.31, item.depth, 0.65);
  part(item, 0, 0.47, -item.depth/2 + 0.12, item.width - 0.18, 0.43, 0.24, 0.65);
  for (const side of [-1, 1]) part(item, side*(item.width/2 - 0.10), 0.47, 0, 0.20, 0.19, item.depth, 0.65);
}
for (const item of [livingTable, livingSideTable]) {
  part(item, 0, item.height-0.04, 0, item.width, 0.04, item.depth, 0.18);
  part(item, 0, 0.10, 0, item.width-0.12, 0.025, item.depth-0.12, 0.18);
  for (const x of [-1,1]) for(const z of [-1,1])
    part(item, x*(item.width/2-0.075), 0, z*(item.depth/2-0.075), 0.055, item.height, 0.055, 0.18);
}
export const livingEmitters = [{ position: [livingSideTable.x, 1.12, livingSideTable.z], intensity: 2.2, cone: 0 }];
