import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Generic, unbranded front loader, awaiting the owner's product dimensions.
// Local +Z is the front; the bathroom places it facing the accessible aisle.
export function buildWashingMachine(group, add, size, lightSource) {
  const light = {
    lightMap: lightSource.lightMap,
    lightMapIntensity: lightSource.lightMapIntensity,
  };
  const enamel = new THREE.MeshPhysicalMaterial({
    color: "#f5f5f1",
    roughness: 0.28,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    ...light,
  });
  const rim = new THREE.MeshStandardMaterial({
    color: "#8c9296",
    metalness: 0.75,
    roughness: 0.27,
    ...light,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#202529",
    roughness: 0.5,
    ...light,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#27343e",
    roughness: 0.12,
    metalness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ...light,
  });
  const { width, depth, height } = size;
  const front = depth / 2;
  const box = (w, h, d, x, y, z, mat = enamel, radius = 0.005) =>
    add(group, new RoundedBoxGeometry(w, h, d, 3, radius), mat, x, y, z);
  const disc = (radius, thickness, x, y, z, mat) => {
    const geo = new THREE.CylinderGeometry(radius, radius, thickness, 32);
    geo.rotateX(Math.PI / 2);
    return add(group, geo, mat, x, y, z);
  };
  box(
    width - 0.01,
    height - 0.065,
    depth - 0.015,
    0,
    height / 2 + 0.007,
    0,
    enamel,
    0.012,
  );
  box(width, 0.024, depth, 0, height - 0.012, 0, enamel, 0.004);
  box(width - 0.035, 0.103, 0.009, 0, height - 0.095, front - 0.002);
  // Detergent drawer seam and finger pull, dial and unlit display.
  box(0.18, 0.071, 0.005, -0.175, height - 0.095, front + 0.004, dark, 0.002);
  box(0.176, 0.067, 0.006, -0.175, height - 0.095, front + 0.008);
  box(0.085, 0.005, 0.009, -0.175, height - 0.119, front + 0.013, dark, 0.001);
  disc(0.025, 0.02, -0.025, height - 0.095, front + 0.01, rim);
  disc(0.021, 0.005, -0.025, height - 0.095, front + 0.022, enamel);
  box(0.116, 0.04, 0.006, 0.115, height - 0.092, front + 0.005, dark, 0.003);
  for (const x of [0.2, 0.24])
    disc(0.007, 0.004, x, height - 0.095, front + 0.008, rim);
  // Recessed porthole and convex dark glass, with separate rubber and metal rings.
  disc(0.197, 0.01, 0, 0.405, front + 0.004, dark);
  add(
    group,
    new THREE.TorusGeometry(0.18, 0.019, 12, 48),
    rim,
    0,
    0.405,
    front + 0.021,
  );
  add(
    group,
    new THREE.TorusGeometry(0.159, 0.008, 8, 48),
    dark,
    0,
    0.405,
    front + 0.022,
  );
  const lens = new THREE.SphereGeometry(0.153, 40, 20);
  lens.scale(1, 1, 0.13);
  add(group, lens, glass, 0, 0.405, front + 0.022);
  box(0.025, 0.085, 0.015, 0.18, 0.405, front + 0.035, dark, 0.006);
  box(width - 0.04, 0.004, 0.004, 0, 0.16, front, dark, 0.001);
  disc(0.037, 0.004, 0.205, 0.105, front + 0.002, enamel);
  for (const x of [-width / 2 + 0.055, width / 2 - 0.055])
    for (const z of [-depth / 2 + 0.055, depth / 2 - 0.055])
      add(
        group,
        new THREE.CylinderGeometry(0.021, 0.024, 0.035, 12),
        dark,
        x,
        0.024,
        z,
      );
  return [enamel, rim, dark, glass];
}
