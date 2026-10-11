// Bake window daylight and four diffuse bounces once, at build time. No ray
// tracing or network requests run on a visitor's phone. Re-bake after plan edits.
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { walls, footprint, balcony, bathroomFloors, HEIGHT, pointInPolygon } from "../src/plan.js";
import { patches, atlasWidth, atlasHeight, floorBounds, LIGHTMAP_RANGE } from "../src/daylight-layout.js";

const imagePath = new URL("../src/assets/daylight.png", import.meta.url);
const metaPath = new URL("../src/assets/daylight.json", import.meta.url);
const hash = createHash("sha256");
for (const name of ["../src/plan.js", "../src/daylight-layout.js", "bake-daylight.mjs"])
  hash.update(await readFile(new URL(name, import.meta.url)));
const fingerprint = hash.digest("hex");
try {
  if (JSON.parse(await readFile(metaPath, "utf8")).fingerprint === fingerprint && (await readFile(imagePath)).length > 100) {
    console.log("Daylight bake is current.");
    process.exit(0);
  }
} catch { /* First bake, or changed geometry. */ }

const geometries = [];
for (const wall of walls) {
  const dx = wall.b[0] - wall.a[0], dz = wall.b[1] - wall.a[1], length = Math.hypot(dx, dz);
  const matrix = new THREE.Matrix4().makeRotationY(-Math.atan2(dz, dx));
  matrix.setPosition(wall.a[0], 0, wall.a[1]);
  const fill = (a, b, lo, hi) => {
    if (b - a < 0.005 || hi - lo < 0.005) return;
    const geometry = new THREE.BoxGeometry(b - a, hi - lo, wall.thickness).toNonIndexed();
    geometry.translate((a + b) / 2, (lo + hi) / 2, 0).applyMatrix4(matrix);
    geometries.push(geometry);
  };
  let cursor = 0;
  for (const opening of [...wall.openings].sort((a, b) => a.from - b.from)) {
    fill(cursor, opening.from, 0, HEIGHT);
    fill(opening.from, opening.to, 0, opening.bottom);
    fill(opening.from, opening.to, opening.top, HEIGHT);
    cursor = opening.to;
  }
  fill(cursor, length, 0, HEIGHT);
}
for (const [poly, height] of [[footprint, 0], [footprint, HEIGHT + 0.01], [balcony, 0]]) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ShapeGeometry(shape).toNonIndexed();
  geometry.rotateX(-Math.PI / 2).translate(0, height, 0);
  geometries.push(geometry);
}
const geometry = mergeGeometries(geometries);
const bvh = new MeshBVH(geometry);
const ray = new THREE.Ray(), sunRay = new THREE.Ray();
const sunDirection = new THREE.Vector3(-16, 14, -21).normalize();
sunRay.direction.copy(sunDirection);
const tangent = new THREE.Vector3(), bitangent = new THREE.Vector3();
const hitNormal = new THREE.Vector3(), origin = new THREE.Vector3(), normal = new THREE.Vector3();
const result = new THREE.Vector3();
let seed = 1;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
function bounceDirection(n, r1, r2, target) {
  tangent.set(Math.abs(n.y) < 0.99 ? 0 : 1, Math.abs(n.y) < 0.99 ? 1 : 0, 0).cross(n).normalize();
  bitangent.crossVectors(n, tangent);
  const radius = Math.sqrt(r1), angle = r2 * Math.PI * 2;
  target.copy(n).multiplyScalar(Math.sqrt(1 - r1))
    .addScaledVector(tangent, radius * Math.cos(angle)).addScaledVector(bitangent, radius * Math.sin(angle));
}
function trace() {
  result.set(0, 0, 0);
  let throughput = 1;
  for (let bounce = 0; bounce < 4; bounce++) {
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, 80);
    if (!hit) {
      const sky = 1.8 + 1.1 * Math.max(0, ray.direction.y);
      result.addScaledVector(new THREE.Vector3(0.88, 0.94, 1), throughput * sky);
      break;
    }
    hitNormal.copy(hit.face.normal);
    if (hitNormal.dot(ray.direction) > 0) hitNormal.negate();
    const point = hit.point.clone().addScaledVector(hitNormal, 0.004);
    const inBathroom = bathroomFloors.some((room) => pointInPolygon(point.x, point.z, room.polygon));
    const albedo = inBathroom && point.y < HEIGHT - 0.05 ? 0.12 : Math.abs(hitNormal.y) > 0.9 && point.y < 0.1 ? 0.5 : 0.78;
    throughput *= albedo;
    const incidence = Math.max(0, hitNormal.dot(sunDirection));
    sunRay.origin.copy(point);
    if (incidence > 0 && !bvh.raycastFirst(sunRay, THREE.DoubleSide, 0.0005, 80)) {
      const energy = throughput * incidence * 3.2 / Math.PI;
      result.x += energy; result.y += energy * 0.96; result.z += energy * 0.9;
    }
    ray.origin.copy(point);
    bounceDirection(hitNormal, random(), random(), ray.direction);
  }
  return result;
}
const pixels = new Uint8Array(atlasWidth * atlasHeight * 3);
const samples = 192;
const start = Date.now();
for (const patch of patches) {
  const wall = walls[patch.index];
  const dx = wall ? (wall.b[0] - wall.a[0]) / patch.width : 0;
  const dz = wall ? (wall.b[1] - wall.a[1]) / patch.width : 0;
  for (let y = 0; y < patch.pixelsHigh; y++) for (let x = 0; x < patch.pixelsWide; x++) {
    const u = x / (patch.pixelsWide - 1), v = y / (patch.pixelsHigh - 1);
    if (wall) {
      normal.set(-dz * patch.side, 0, dx * patch.side);
      origin.set(wall.a[0] + dx * patch.width * u, HEIGHT * (1 - v), wall.a[1] + dz * patch.width * u);
      origin.addScaledVector(normal, wall.thickness / 2 + 0.009);
      origin.y = THREE.MathUtils.clamp(origin.y, 0.015, HEIGHT - 0.015);
    } else {
      origin.set(floorBounds.minX + patch.width * u, patch.id === "floor" ? 0.015 : HEIGHT - 0.015, floorBounds.minZ + patch.height * v);
      normal.set(0, patch.id === "floor" ? 1 : -1, 0);
    }
    seed = ((patch.x + x + 1) * 73856093 ^ (patch.y + y + 1) * 19349663) >>> 0 || 1;
    const sum = new THREE.Vector3();
    const rotate = random();
    for (let sample = 0; sample < samples; sample++) {
      ray.origin.copy(origin);
      bounceDirection(normal, (sample + 0.5) / samples, (sample * 0.61803398875 + rotate) % 1, ray.direction);
      sum.add(trace());
    }
    const i = ((patch.y + y) * atlasWidth + patch.x + x) * 3;
    for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(255 * Math.min(1, Math.PI * sum.getComponent(c) / samples / LIGHTMAP_RANGE));
  }
  // Filter Monte Carlo noise within this surface, then duplicate its border to
  // prevent atlas seams. Keep separate rooms from bleeding into each other.
  const original = pixels.slice();
  for (let y = -2; y < patch.pixelsHigh + 2; y++) for (let x = -2; x < patch.pixelsWide + 2; x++) {
    const target = ((patch.y + y) * atlasWidth + patch.x + x) * 3;
    const cx = Math.max(0, Math.min(patch.pixelsWide - 1, x)), cy = Math.max(0, Math.min(patch.pixelsHigh - 1, y));
    for (let c = 0; c < 3; c++) {
      let sum = 0, weight = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const sx = Math.max(0, Math.min(patch.pixelsWide - 1, cx + i)), sy = Math.max(0, Math.min(patch.pixelsHigh - 1, cy + j));
        const w = (i === 0 ? 2 : 1) * (j === 0 ? 2 : 1);
        sum += original[((patch.y + sy) * atlasWidth + patch.x + sx) * 3 + c] * w; weight += w;
      }
      pixels[target + c] = Math.round(sum / weight);
    }
  }
}
function chunk(type, data) {
  const name = Buffer.from(type), size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
const header = Buffer.alloc(13); header.writeUInt32BE(atlasWidth); header.writeUInt32BE(atlasHeight, 4); header[8] = 8; header[9] = 2;
const scanlines = Buffer.alloc(atlasHeight * (atlasWidth * 3 + 1));
for (let y = 0; y < atlasHeight; y++) scanlines.set(pixels.subarray(y * atlasWidth * 3, (y + 1) * atlasWidth * 3), y * (atlasWidth * 3 + 1) + 1);
await writeFile(imagePath, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(scanlines)), chunk("IEND", Buffer.alloc(0))]));
await writeFile(metaPath, JSON.stringify({ fingerprint, width: atlasWidth, height: atlasHeight, samples, bounces: 4 }) + "\n");
console.log(`Baked ${patches.length} surfaces into ${atlasWidth} × ${atlasHeight} in ${((Date.now() - start) / 1000).toFixed(1)}s.`);
