import * as THREE from "three";
import {
  ensuiteBox as boxing,
  ensuitePlumbing as plumbing,
} from "./ensuite-layout.js";
import { daylightUV, floorBounds } from "./daylight-layout.js";
import { HEIGHT, walls } from "./plan.js";

// Existing construction details only: protective caps and access cover, with
// no selected toilet, vanity, shower enclosure or finished tapware yet.
export function buildEnsuite(parent, finishes) {
  const tile = finishes.marbleEnsuite;
  const material = (color, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      lightMap: tile.lightMap,
      lightMapIntensity: tile.lightMapIntensity,
    });
  const plastic = material("#e4e0d4"),
    mortar = material("#938a7b"),
    cap = material("#bb7060"),
    pipe = material("#9b9184", 0.65, 0.2),
    dark = material("#393b38"),
    steel = material("#a7aaa5", 0.38, 0.55);
  const materials = [plastic, mortar, cap, pipe, dark, steel];
  const shape = new THREE.Shape(
    boxing.polygon.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: boxing.height,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position,
    normals = geometry.attributes.normal;
  const uv1 = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    let id, u, v;
    if (Math.abs(normals.getY(i)) > 0.9) {
      id = "ensuite-box-top";
      u = (x - boxing.frontX) / boxing.depth;
      v = (z - boxing.startZ) / boxing.length;
      geometry.attributes.uv.setXY(i, x, z);
    } else if (normals.getZ(i) < -0.9) {
      id = "ensuite-box-end";
      u = (x - boxing.frontX) / boxing.depth;
      v = 1 - y / boxing.height;
      geometry.attributes.uv.setXY(i, x, y);
    } else {
      id = "ensuite-box-front";
      u = (z - boxing.startZ) / boxing.length;
      v = 1 - y / boxing.height;
      geometry.attributes.uv.setXY(i, z, y);
    }
    uv1.set(daylightUV(id, u, v), i * 2);
  }
  geometry.setAttribute("uv1", new THREE.BufferAttribute(uv1, 2));
  const ledge = new THREE.Mesh(geometry, tile);
  ledge.castShadow = ledge.receiveShadow = true;
  parent.add(ledge);

  const frontUV = (point) =>
    daylightUV(
      "ensuite-box-front",
      (point.z - boxing.startZ) / boxing.length,
      1 - point.y / boxing.height,
    );
  const wallUV = (index, point) => {
    const wall = walls[index],
      dx = wall.b[0] - wall.a[0],
      dz = wall.b[1] - wall.a[1];
    const u =
      ((point.x - wall.a[0]) * dx + (point.z - wall.a[1]) * dz) /
      (dx * dx + dz * dz);
    return daylightUV(`wall-${index}-1`, u, 1 - point.y / HEIGHT);
  };
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
    const position = geometry.attributes.position,
      point = new THREE.Vector3();
    const lightUV = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      lightUV.set(group.userData.lightUV(point), i * 2);
    }
    geometry.setAttribute("uv1", new THREE.BufferAttribute(lightUV, 2));
    return mesh;
  }
  const box = (g, w, h, d, x, y, z, mat) =>
    add(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  function port(g, x, y, radius, mat = pipe, projection = 0.045) {
    const tube = new THREE.CylinderGeometry(radius, radius, projection, 20);
    tube.rotateX(Math.PI / 2);
    add(g, tube, mat, x, y, projection / 2);
    const ring = new THREE.TorusGeometry(radius * 0.98, 0.003, 5, 20);
    add(g, ring, plastic, x, y, projection + 0.001);
  }
  const wc = mount(plumbing.toilet, -Math.PI / 2, frontUV);
  box(wc, 0.205, 0.255, 0.004, 0, 0.29, 0.004, mortar);
  port(wc, 0, 0.22, 0.055, cap, 0.065);
  port(wc, 0, 0.36, 0.032, cap, 0.045);
  for (const x of [-0.09, 0.09]) port(wc, x, 0.32, 0.005, pipe, 0.075);
  box(wc, 0.188, 0.25, 0.004, 0, 0.89, 0.004, mortar);
  box(wc, 0.17, 0.226, 0.012, 0, 0.89, 0.012, plastic);
  box(wc, 0.075, 0.006, 0.003, 0, 0.986, 0.02, dark);

  const basin = mount(plumbing.basin, 0, (point) => wallUV(21, point));
  for (const x of [-0.075, 0.075]) port(basin, x, 0.6, 0.014);
  port(basin, 0, 0.48, 0.025, dark);

  const shower = mount(plumbing.shower, Math.PI, (point) => wallUV(4, point));
  for (const x of [-0.075, 0.075]) port(shower, x, 1.1, 0.019);
  port(shower, 0, 2.1, 0.014);

  const drain = mount(plumbing.drain, 0, (point) =>
    daylightUV(
      "floor",
      (point.x - floorBounds.minX) / (floorBounds.maxX - floorBounds.minX),
      (point.z - floorBounds.minZ) / (floorBounds.maxZ - floorBounds.minZ),
    ),
  );
  box(drain, 0.158, 0.002, 0.158, 0, 0.01, 0, dark);
  box(drain, 0.15, 0.002, 0.15, 0, 0.012, 0, steel);
  box(drain, 0.128, 0.002, 0.128, 0, 0.014, 0, dark);
  const cover = box(
    drain,
    0.118,
    0.002,
    0.118,
    0,
    0.016,
    0,
    finishes.floorEnsuite,
  );
  const coverPosition = cover.geometry.attributes.position;
  for (let i = 0; i < coverPosition.count; i++)
    cover.geometry.attributes.uv.setXY(
      i,
      coverPosition.getX(i) + plumbing.drain[0],
      coverPosition.getZ(i) + plumbing.drain[1],
    );
  return materials;
}
