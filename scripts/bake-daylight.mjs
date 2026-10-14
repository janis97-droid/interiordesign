// Bake window daylight and four diffuse bounces once, at build time. No ray
// tracing or network requests run on a visitor's phone. Re-bake after plan edits.
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import {
  walls,
  footprint,
  balcony,
  bathroomFloors,
  HEIGHT,
  pointInPolygon,
} from "../src/plan.js";
import {
  patches,
  atlasWidth,
  atlasHeight,
  floorBounds,
  LIGHTMAP_RANGE,
} from "../src/daylight-layout.js";
import { ensuiteBox } from "../src/ensuite-layout.js";
import { bathroomWasher } from "../src/bathroom-details-layout.js";
import { kitchenBakeBoxes, kitchenEmitters } from "../src/kitchen-layout.js";
import {
  ceilingSections,
  ceilingHeight,
  interiorEmitters as entranceEmitters,
  warmLightColor,
} from "../src/entrance-layout.js";
const interiorEmitters = [...entranceEmitters, ...kitchenEmitters];

const imagePath = new URL("../src/assets/daylight.png", import.meta.url);
const nightImagePath = new URL("../src/assets/nightlight.png", import.meta.url);
const metaPath = new URL("../src/assets/daylight.json", import.meta.url);
const hash = createHash("sha256");
for (const name of [
  "../src/plan.js",
  "../src/ensuite-layout.js",
  "../src/daylight-layout.js",
  "../src/entrance-layout.js",
  "../src/bathroom-details-layout.js",
  "../src/kitchen-layout.js",
  "bake-daylight.mjs",
])
  hash.update(await readFile(new URL(name, import.meta.url)));
const fingerprint = hash.digest("hex");
try {
  if (
    JSON.parse(await readFile(metaPath, "utf8")).fingerprint === fingerprint &&
    (await readFile(imagePath)).length > 100 &&
    (await readFile(nightImagePath)).length > 100
  ) {
    console.log("Day and night lighting bakes are current.");
    process.exit(0);
  }
} catch {
  /* First bake, or changed geometry. */
}

const geometries = [];
// Furniture volumes catch broad window shadows and block light below the
// worktops; fine carved panels and stool contacts are handled by runtime AO.
for (const box of kitchenBakeBoxes) {
  const geometry = new THREE.BoxGeometry(
    box.width,
    box.height,
    box.depth,
  ).toNonIndexed();
  geometry.translate(box.x, box.y + box.height / 2, box.z);
  geometries.push(geometry);
}
const kitchenBounds = {
  minX:
    Math.min(...kitchenBakeBoxes.map((box) => box.x - box.width / 2)) - 0.01,
  maxX:
    Math.max(...kitchenBakeBoxes.map((box) => box.x + box.width / 2)) + 0.01,
  minZ:
    Math.min(...kitchenBakeBoxes.map((box) => box.z - box.depth / 2)) - 0.01,
  maxZ:
    Math.max(...kitchenBakeBoxes.map((box) => box.z + box.depth / 2)) + 0.01,
};
function kitchenAlbedo(point, normal) {
  if (
    point.x < kitchenBounds.minX ||
    point.x > kitchenBounds.maxX ||
    point.z < kitchenBounds.minZ ||
    point.z > kitchenBounds.maxZ
  )
    return undefined;
  const box = kitchenBakeBoxes.find(
    (box) =>
      Math.abs(point.x - box.x) <= box.width / 2 + 0.01 &&
      Math.abs(point.z - box.z) <= box.depth / 2 + 0.01 &&
      point.y >= box.y - 0.01 &&
      point.y <= box.y + box.height + 0.01,
  );
  if (!box) return undefined;
  // Stone tops reflect more light than the dark walnut doors and end panels.
  return box.id !== "pantry" &&
    normal.y > 0.9 &&
    point.y >= box.y + box.height - 0.01
    ? 0.52
    : 0.22;
}
// The laundry appliance blocks light in the recess behind the tiled return.
const washerGeometry = new THREE.BoxGeometry(
  bathroomWasher.width,
  bathroomWasher.height,
  bathroomWasher.depth,
).toNonIndexed();
washerGeometry.rotateY(bathroomWasher.rotation);
washerGeometry.translate(
  bathroomWasher.point[0],
  bathroomWasher.height / 2,
  bathroomWasher.point[1],
);
geometries.push(washerGeometry);
for (const section of ceilingSections) {
  const geometry = new THREE.BoxGeometry(
    section.width,
    section.height,
    section.depth,
  ).toNonIndexed();
  geometry.translate(
    section.min[0] + section.width / 2,
    ceilingHeight + section.height / 2,
    section.min[1] + section.depth / 2,
  );
  geometries.push(geometry);
}
const boxingShape = new THREE.Shape(
  ensuiteBox.polygon.map(([x, z]) => new THREE.Vector2(x, -z)),
);
const boxingGeometry = new THREE.ExtrudeGeometry(boxingShape, {
  depth: ensuiteBox.height,
  bevelEnabled: false,
});
boxingGeometry.rotateX(-Math.PI / 2);
geometries.push(boxingGeometry);
for (const wall of walls) {
  const dx = wall.b[0] - wall.a[0],
    dz = wall.b[1] - wall.a[1],
    length = Math.hypot(dx, dz);
  const matrix = new THREE.Matrix4().makeRotationY(-Math.atan2(dz, dx));
  matrix.setPosition(wall.a[0], 0, wall.a[1]);
  const fill = (a, b, lo, hi) => {
    if (b - a < 0.005 || hi - lo < 0.005) return;
    const geometry = new THREE.BoxGeometry(
      b - a,
      hi - lo,
      wall.thickness,
    ).toNonIndexed();
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
for (const [poly, height] of [
  [footprint, 0],
  [footprint, HEIGHT + 0.01],
  [balcony, 0],
]) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ShapeGeometry(shape).toNonIndexed();
  geometry.rotateX(-Math.PI / 2).translate(0, height, 0);
  geometries.push(geometry);
}
const geometry = mergeGeometries(geometries);
const bvh = new MeshBVH(geometry);
const ray = new THREE.Ray(),
  sunRay = new THREE.Ray();
const sunDirection = new THREE.Vector3(-16, 14, -21).normalize();
sunRay.direction.copy(sunDirection);
const tangent = new THREE.Vector3(),
  bitangent = new THREE.Vector3();
const hitNormal = new THREE.Vector3(),
  origin = new THREE.Vector3(),
  normal = new THREE.Vector3();
const result = new THREE.Vector3(),
  nightResult = new THREE.Vector3();
const lampRay = new THREE.Ray(),
  lampEnergy = new THREE.Vector3();
const warm = new THREE.Color(warmLightColor);
function interiorEnergy(point, normal, selected = -1) {
  let energy = 0;
  const first = selected < 0 ? 0 : selected;
  const last = selected < 0 ? interiorEmitters.length : selected + 1;
  for (let i = first; i < last; i++) {
    const light = interiorEmitters[i];
    lampRay.origin.copy(point);
    lampRay.direction.set(...light.position).sub(point);
    const distance = lampRay.direction.length();
    if (distance < 0.025) continue;
    lampRay.direction.divideScalar(distance);
    const incidence = Math.max(0, normal.dot(lampRay.direction));
    const down = lampRay.direction.y;
    if (incidence <= 0 || down <= light.cone) continue;
    const spread = light.cone
      ? THREE.MathUtils.smoothstep(
          down,
          light.cone,
          Math.min(1, light.cone + 0.09),
        )
      : down;
    if (!bvh.raycastFirst(lampRay, THREE.DoubleSide, 0.004, distance - 0.015))
      energy +=
        (light.intensity * incidence * spread) /
        Math.max(0.025, distance * distance);
  }
  if (selected >= 0) energy *= interiorEmitters.length;
  return lampEnergy.set(warm.r, warm.g, warm.b).multiplyScalar(energy);
}
let seed = 1;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
function bounceDirection(n, r1, r2, target) {
  tangent
    .set(Math.abs(n.y) < 0.99 ? 0 : 1, Math.abs(n.y) < 0.99 ? 1 : 0, 0)
    .cross(n)
    .normalize();
  bitangent.crossVectors(n, tangent);
  const radius = Math.sqrt(r1),
    angle = r2 * Math.PI * 2;
  target
    .copy(n)
    .multiplyScalar(Math.sqrt(1 - r1))
    .addScaledVector(tangent, radius * Math.cos(angle))
    .addScaledVector(bitangent, radius * Math.sin(angle));
}
function trace(includeNight) {
  result.set(0, 0, 0);
  nightResult.set(0, 0, 0);
  let throughput = 1;
  for (let bounce = 0; bounce < 4; bounce++) {
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, 80);
    if (!hit) {
      const sky = 1.8 + 1.1 * Math.max(0, ray.direction.y);
      result.addScaledVector(
        new THREE.Vector3(0.88, 0.94, 1),
        throughput * sky,
      );
      break;
    }
    hitNormal.copy(hit.face.normal);
    if (hitNormal.dot(ray.direction) > 0) hitNormal.negate();
    const point = hit.point.clone().addScaledVector(hitNormal, 0.004);
    const inBathroom = bathroomFloors.some((room) =>
      pointInPolygon(point.x, point.z, room.polygon),
    );
    const albedo =
      kitchenAlbedo(point, hitNormal) ??
      (inBathroom && point.y < HEIGHT - 0.05
        ? 0.12
        : Math.abs(hitNormal.y) > 0.9 && point.y < 0.1
          ? 0.5
          : 0.78);
    throughput *= albedo;
    if (includeNight)
      nightResult.addScaledVector(
        interiorEnergy(
          point,
          hitNormal,
          Math.floor(random() * interiorEmitters.length),
        ),
        throughput / Math.PI,
      );
    const incidence = Math.max(0, hitNormal.dot(sunDirection));
    sunRay.origin.copy(point);
    if (
      incidence > 0 &&
      !bvh.raycastFirst(sunRay, THREE.DoubleSide, 0.0005, 80)
    ) {
      const energy = (throughput * incidence * 3.2) / Math.PI;
      result.x += energy;
      result.y += energy * 0.96;
      result.z += energy * 0.9;
    }
    ray.origin.copy(point);
    bounceDirection(hitNormal, random(), random(), ray.direction);
  }
  return result;
}
const pixels = new Uint8Array(atlasWidth * atlasHeight * 3);
const nightPixels = new Uint8Array(pixels.length);
const samples = 192,
  nightSamples = 192;
const start = Date.now();
for (const patch of patches) {
  const wall = walls[patch.index];
  const dx = wall ? (wall.b[0] - wall.a[0]) / patch.width : 0;
  const dz = wall ? (wall.b[1] - wall.a[1]) / patch.width : 0;
  for (let y = 0; y < patch.pixelsHigh; y++)
    for (let x = 0; x < patch.pixelsWide; x++) {
      const u = x / (patch.pixelsWide - 1),
        v = y / (patch.pixelsHigh - 1);
      if (patch.box) {
        const box = patch.box;
        const minX = box.x - box.width / 2;
        const minZ = box.z - box.depth / 2;
        if (patch.face === "top") {
          origin.set(
            minX + box.width * u,
            box.y + box.height + 0.009,
            minZ + box.depth * v,
          );
          normal.set(0, 1, 0);
        } else if (patch.face === "north" || patch.face === "south") {
          const side = patch.face === "north" ? -1 : 1;
          origin.set(
            minX + box.width * u,
            box.y + box.height * (1 - v),
            box.z + side * (box.depth / 2 + 0.009),
          );
          normal.set(0, 0, side);
        } else {
          const side = patch.face === "west" ? -1 : 1;
          origin.set(
            box.x + side * (box.width / 2 + 0.009),
            box.y + box.height * (1 - v),
            minZ + box.depth * u,
          );
          normal.set(side, 0, 0);
        }
      } else if (patch.section) {
        const section = patch.section;
        if (patch.face === "bottom") {
          origin.set(
            section.min[0] + section.width * u,
            ceilingHeight - 0.009,
            section.min[1] + section.depth * v,
          );
          normal.set(0, -1, 0);
        } else if (patch.face === "front") {
          origin.set(
            section.min[0] + section.width * u,
            ceilingHeight + section.height * v,
            section.min[1] - 0.009,
          );
          normal.set(0, 0, -1);
        } else {
          origin.set(
            section.min[0] - 0.009,
            ceilingHeight + section.height * v,
            section.min[1] + section.depth * u,
          );
          normal.set(-1, 0, 0);
        }
      } else if (patch.id === "ensuite-box-front") {
        origin.set(
          ensuiteBox.frontX - 0.009,
          patch.height * (1 - v),
          ensuiteBox.startZ + patch.width * u,
        );
        normal.set(-1, 0, 0);
      } else if (patch.id === "ensuite-box-end") {
        origin.set(
          ensuiteBox.frontX + patch.width * u,
          patch.height * (1 - v),
          ensuiteBox.startZ - 0.009,
        );
        normal.set(0, 0, -1);
      } else if (patch.id === "ensuite-box-top") {
        origin.set(
          ensuiteBox.frontX + patch.width * u,
          ensuiteBox.height + 0.009,
          ensuiteBox.startZ + patch.height * v,
        );
        normal.set(0, 1, 0);
      } else if (wall) {
        normal.set(-dz * patch.side, 0, dx * patch.side);
        origin.set(
          wall.a[0] + dx * patch.width * u,
          HEIGHT * (1 - v),
          wall.a[1] + dz * patch.width * u,
        );
        origin.addScaledVector(normal, wall.thickness / 2 + 0.009);
        origin.y = THREE.MathUtils.clamp(origin.y, 0.015, HEIGHT - 0.015);
      } else {
        origin.set(
          floorBounds.minX + patch.width * u,
          patch.id === "floor" ? 0.015 : HEIGHT - 0.015,
          floorBounds.minZ + patch.height * v,
        );
        normal.set(0, patch.id === "floor" ? 1 : -1, 0);
      }
      seed =
        (((patch.x + x + 1) * 73856093) ^ ((patch.y + y + 1) * 19349663)) >>>
          0 || 1;
      const sum = new THREE.Vector3(),
        nightSum = new THREE.Vector3();
      const rotate = random();
      for (let sample = 0; sample < samples; sample++) {
        ray.origin.copy(origin);
        bounceDirection(
          normal,
          (sample + 0.5) / samples,
          (sample * 0.61803398875 + rotate) % 1,
          ray.direction,
        );
        sum.add(trace(sample < nightSamples));
        if (sample < nightSamples) nightSum.add(nightResult);
      }
      const i = ((patch.y + y) * atlasWidth + patch.x + x) * 3;
      nightSum
        .multiplyScalar(Math.PI / nightSamples)
        .add(interiorEnergy(origin, normal));
      for (let c = 0; c < 3; c++) {
        pixels[i + c] = Math.round(
          255 *
            Math.min(
              1,
              (Math.PI * sum.getComponent(c)) / samples / LIGHTMAP_RANGE,
            ),
        );
        nightPixels[i + c] = Math.round(
          255 * Math.min(1, nightSum.getComponent(c) / LIGHTMAP_RANGE),
        );
      }
    }
  // Filter Monte Carlo noise within this surface, then duplicate its border to
  // prevent atlas seams. Keep separate rooms from bleeding into each other.
  for (const buffer of [pixels, nightPixels]) {
    const original = buffer.slice();
    const radius = buffer === nightPixels ? 2 : 1;
    const kernel = radius === 2 ? [1, 4, 6, 4, 1] : [1, 2, 1];
    for (let y = -2; y < patch.pixelsHigh + 2; y++)
      for (let x = -2; x < patch.pixelsWide + 2; x++) {
        const target = ((patch.y + y) * atlasWidth + patch.x + x) * 3;
        const cx = Math.max(0, Math.min(patch.pixelsWide - 1, x)),
          cy = Math.max(0, Math.min(patch.pixelsHigh - 1, y));
        for (let c = 0; c < 3; c++) {
          let sum = 0,
            weight = 0;
          for (let j = -radius; j <= radius; j++)
            for (let i = -radius; i <= radius; i++) {
              const sx = Math.max(0, Math.min(patch.pixelsWide - 1, cx + i)),
                sy = Math.max(0, Math.min(patch.pixelsHigh - 1, cy + j));
              const w = kernel[i + radius] * kernel[j + radius];
              sum +=
                original[((patch.y + sy) * atlasWidth + patch.x + sx) * 3 + c] *
                w;
              weight += w;
            }
          buffer[target + c] = Math.round(sum / weight);
        }
      }
  }
  console.log(`Baked ${patch.id}`);
}
function chunk(type, data) {
  const name = Buffer.from(type),
    size = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(atlasWidth);
header.writeUInt32BE(atlasHeight, 4);
header[8] = 8;
header[9] = 2;
for (const [path, buffer] of [
  [imagePath, pixels],
  [nightImagePath, nightPixels],
]) {
  const scanlines = Buffer.alloc(atlasHeight * (atlasWidth * 3 + 1));
  for (let y = 0; y < atlasHeight; y++)
    scanlines.set(
      buffer.subarray(y * atlasWidth * 3, (y + 1) * atlasWidth * 3),
      y * (atlasWidth * 3 + 1) + 1,
    );
  await writeFile(
    path,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(scanlines)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
await writeFile(
  metaPath,
  JSON.stringify({
    fingerprint,
    width: atlasWidth,
    height: atlasHeight,
    samples,
    nightSamples,
    bounces: 4,
  }) + "\n",
);
console.log(
  `Baked ${patches.length} surfaces into ${atlasWidth} × ${atlasHeight} in ${((Date.now() - start) / 1000).toFixed(1)}s.`,
);
