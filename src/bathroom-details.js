import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildToilet } from "./toilet.js";
import { buildWashingMachine } from "./washing-machine.js";
import {
  corridorToilet,
  bathroomWasher,
  largeBathroomDetails as details,
} from "./bathroom-details-layout.js";
import { daylightUV, floorBounds } from "./daylight-layout.js";
import { HEIGHT, walls } from "./plan.js";

// Finishes and existing rough-ins from the owner's walkthrough. No decorative
// furniture or unselected sinks/showers are added to the empty shell.
export function buildBathroomDetails(parent, finishes) {
  const material = (color, roughness = 0.7, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      lightMap: finishes.marbleBath.lightMap,
      lightMapIntensity: finishes.marbleBath.lightMapIntensity,
    });
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: "#fafaf7",
    roughness: 0.17,
    clearcoat: 0.35,
    clearcoatRoughness: 0.13,
    lightMap: finishes.marbleBath.lightMap,
    lightMapIntensity: finishes.marbleBath.lightMapIntensity,
  });
  const seat = ceramic.clone();
  seat.roughness = 0.22;
  const seal = material("#787a78"),
    chrome = material("#dedfdf", 0.16, 0.95);
  const plastic = material("#e5e1d8"),
    mortar = material("#9d9587"),
    recess = material("#303230"),
    brass = material("#968b70", 0.45, 0.45),
    red = material("#98615c"),
    blue = material("#627d8b");
  const wcMaterials = [ceramic, seat, seal, chrome];
  const bathMaterials = [plastic, mortar, recess, brass, red, blue];
  const wallUV = (index, point) => {
    const wall = walls[index],
      dx = wall.b[0] - wall.a[0],
      dz = wall.b[1] - wall.a[1];
    return daylightUV(
      `wall-${index}-1`,
      ((point.x - wall.a[0]) * dx + (point.z - wall.a[1]) * dz) /
        (dx * dx + dz * dz),
      1 - point.y / HEIGHT,
    );
  };
  const floorUV = (point) =>
    daylightUV(
      "floor",
      (point.x - floorBounds.minX) / (floorBounds.maxX - floorBounds.minX),
      (point.z - floorBounds.minZ) / (floorBounds.maxZ - floorBounds.minZ),
    );
  function mount(point, rotation, uv) {
    const group = new THREE.Group();
    group.position.set(point[0], 0, point[1]);
    group.rotation.y = rotation;
    group.userData.lightUV = uv;
    parent.add(group);
    return group;
  }
  function add(group, geometry, mat, x, y, z) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    mesh.updateWorldMatrix(true, false);
    const pos = geometry.attributes.position,
      point = new THREE.Vector3(),
      uv = [];
    for (let i = 0; i < pos.count; i++) {
      point.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      uv.push(...group.userData.lightUV(point));
    }
    geometry.setAttribute("uv1", new THREE.Float32BufferAttribute(uv, 2));
    return mesh;
  }
  const box = (g, w, h, d, x, y, z, mat) =>
    add(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const pipe = (g, x, y, radius, length, mat) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 20);
    geometry.rotateX(Math.PI / 2);
    add(g, geometry, mat, x, y, length / 2);
    add(
      g,
      new THREE.TorusGeometry(radius, 0.003, 6, 20),
      plastic,
      x,
      y,
      length + 0.001,
    );
    const opening = new THREE.CircleGeometry(radius * 0.76, 20);
    add(g, opening, recess, x, y, length + 0.002);
  };

  const wc = mount(corridorToilet.point, Math.PI / 2, (point) =>
    wallUV(5, point),
  );
  buildToilet(wc, add, { ceramic, seat, seal, chrome }, corridorToilet);
  const plate = new RoundedBoxGeometry(0.22, 0.145, 0.012, 3, 0.008);
  add(wc, plate, seat, 0, 0.86, 0.008);
  for (const [x, width] of [
    [-0.05, 0.08],
    [0.047, 0.095],
  ])
    add(
      wc,
      new RoundedBoxGeometry(width, 0.095, 0.004, 2, 0.006),
      ceramic,
      x,
      0.86,
      0.017,
    );

  // The low open service panel under the bathroom window, with two headers
  // and paired supply lines. A shallow modeled recess avoids exposing any
  // actual service diagram or pretending its pipe count is measured.
  const manifold = mount(details.manifold, Math.PI / 2, (point) =>
    wallUV(5, point),
  );
  box(manifold, 1.02, 0.42, 0.006, 0, 0.34, 0.003, mortar);
  box(manifold, 0.94, 0.34, 0.004, 0, 0.34, 0.008, recess);
  for (const y of [0.31, 0.43]) {
    const header = new THREE.CylinderGeometry(0.012, 0.012, 0.83, 16);
    header.rotateZ(Math.PI / 2);
    add(manifold, header, brass, 0, y, 0.025);
  }
  for (let i = 0; i < 10; i++) {
    const x = -0.38 + i * 0.084;
    for (const [offset, mat, height] of [
      [-0.013, blue, 0.19],
      [0.013, red, 0.25],
    ]) {
      add(
        manifold,
        new THREE.CylinderGeometry(0.008, 0.008, height, 10),
        mat,
        x + offset,
        0.18 + height / 2,
        0.033,
      );
    }
    box(manifold, 0.025, 0.025, 0.025, x, 0.425, 0.035, plastic);
  }
  const basin = mount(details.basin, 0, (point) => wallUV(14, point));
  for (const center of [-0.31, 0.31]) {
    for (const x of [center - 0.075, center + 0.075])
      pipe(basin, x, 0.6, 0.017, 0.045, brass);
    pipe(basin, center, 0.47, 0.026, 0.028, recess);
  }
  box(basin, 0.083, 0.083, 0.011, 0.69, 0.79, 0.01, plastic);

  const drain = mount(details.drain, 0, floorUV);
  const hole = new THREE.CircleGeometry(0.027, 28);
  hole.rotateX(-Math.PI / 2);
  add(drain, hole, recess, 0, 0.01, 0);
  const rim = new THREE.TorusGeometry(0.029, 0.003, 6, 28);
  rim.rotateX(-Math.PI / 2);
  add(drain, rim, mortar, 0, 0.011, 0);
  const washer = mount(bathroomWasher.point, bathroomWasher.rotation, (point) =>
    wallUV(5, point),
  );
  bathMaterials.push(
    ...buildWashingMachine(washer, add, bathroomWasher, finishes.marbleBath),
  );
  return { wcMaterials, bathMaterials };
}
