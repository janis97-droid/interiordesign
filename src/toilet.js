import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ensuiteToilet } from "./ensuite-layout.js";

// The reference has a straight rear edge, soft corners and a broad D-shaped
// front. Loft matching contours to give the ceramic a rounded underside.
const outline = new THREE.Shape();
outline.moveTo(-0.425, 0);
outline.lineTo(0.425, 0);
outline.quadraticCurveTo(0.5, 0, 0.5, 0.055);
outline.lineTo(0.5, 0.63);
outline.bezierCurveTo(0.5, 0.86, 0.3, 1, 0, 1);
outline.bezierCurveTo(-0.3, 1, -0.5, 0.86, -0.5, 0.63);
outline.lineTo(-0.5, 0.055);
outline.quadraticCurveTo(-0.5, 0, -0.425, 0);
const contour = outline.getSpacedPoints(80).slice(0, -1);

function loft(profiles) {
  const positions = [],
    uv = [],
    indices = [];
  const count = contour.length;
  for (const [height, width, depth, back] of profiles) {
    for (const point of contour) {
      positions.push(point.x * width, height, back + point.y * depth);
      uv.push(point.x + 0.5, point.y);
    }
  }
  for (let ring = 0; ring < profiles.length - 1; ring++) {
    for (let i = 0; i < count; i++) {
      const a = ring * count + i,
        b = ring * count + ((i + 1) % count);
      indices.push(a, a + count, b, b, a + count, b + count);
    }
  }
  for (const ring of [0, profiles.length - 1]) {
    const [height, , depth, back] = profiles[ring];
    const center = positions.length / 3;
    positions.push(0, height, back + depth / 2);
    uv.push(0.5, 0.5);
    for (let i = 0; i < count; i++) {
      const a = ring * count + i,
        b = ring * count + ((i + 1) % count);
      indices.push(center, ring === 0 ? a : b, ring === 0 ? b : a);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildToilet(
  group,
  add,
  { ceramic, seat, seal, chrome },
  dimensions = ensuiteToilet,
) {
  const { width, projection, height } = dimensions;
  // Profile coordinates are fractions of the owner's estimated overall size.
  const surface = (profiles, mat) =>
    add(
      group,
      loft(
        profiles.map(([y, w, d, back]) => [
          y * height,
          w * width,
          d * projection,
          back * projection,
        ]),
      ),
      mat,
      0,
      0,
      0,
    );
  surface(
    [
      [0.4, 0.55, 0.48, 0.006],
      [0.42, 0.72, 0.66, 0.004],
      [0.49, 0.88, 0.83, 0.003],
      [0.62, 0.97, 0.94, 0.002],
      [0.78, 0.98, 0.965, 0.002],
      [0.87, 0.97, 0.96, 0.002],
      [0.89, 0.945, 0.94, 0.003],
      [0.892, 0.91, 0.915, 0.012],
    ],
    ceramic,
  );
  // Small physical gaps and separate beveled seat/lid keep the silhouette
  // readable against the white glaze without drawing a dark outline on it.
  surface(
    [
      [0.897, 0.935, 0.925, 0.04],
      [0.905, 0.935, 0.925, 0.04],
    ],
    seal,
  );
  surface(
    [
      [0.907, 0.96, 0.935, 0.036],
      [0.913, 0.98, 0.949, 0.031],
      [0.936, 0.98, 0.949, 0.031],
      [0.944, 0.96, 0.935, 0.036],
    ],
    seat,
  );
  surface(
    [
      [0.954, 0.975, 0.943, 0.041],
      [0.963, 1, 0.96, 0.04],
      [0.983, 1, 0.96, 0.04],
      [0.996, 0.973, 0.94, 0.047],
      [1, 0.925, 0.9, 0.062],
    ],
    seat,
  );
  for (const x of [-0.082, 0.082]) {
    add(
      group,
      new THREE.CylinderGeometry(0.022, 0.022, 0.004, 32),
      chrome,
      x,
      height * 0.897,
      0.022,
    );
    add(
      group,
      new RoundedBoxGeometry(0.065, 0.023, 0.034, 3, 0.009),
      seat,
      x,
      height * 0.972,
      0.014,
    );
  }
}
