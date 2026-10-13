import * as THREE from "three";
import { FLOOR_TILE_SIZE } from "./plan.js";

// Procedural approximations of the owner's finishes; no source photos are
// published. Floor UVs are in metres, so each grout square is exactly 1 × 1 m.
function canvasTexture(size, paint, color = true) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = paint(x, y, size);
      const i = (y * size + x) * 4;
      pixels.data[i] = value;
      pixels.data[i + 1] = value;
      pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

const hash = (x, y) => {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};
function noise(x, y, period) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const u = x - ix,
    v = y - iy,
    sx = u * u * (3 - 2 * u),
    sy = v * v * (3 - 2 * v);
  const a = hash(ix % period, iy % period),
    b = hash((ix + 1) % period, iy % period);
  const c = hash(ix % period, (iy + 1) % period),
    d = hash((ix + 1) % period, (iy + 1) % period);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

export async function createPhotoFinishes() {
  const marbleMap = await new THREE.TextureLoader().loadAsync(
    new URL("./assets/dark-marble.png", import.meta.url).href,
  );
  marbleMap.colorSpace = THREE.SRGBColorSpace;
  marbleMap.wrapS = marbleMap.wrapT = THREE.RepeatWrapping;
  marbleMap.anisotropy = 8;
  marbleMap.repeat.setScalar(1 / 2.4);
  // Same porcelain in both bathrooms. 60 cm square tile size is provisional;
  // the owner confirmed the one-metre tiles only for the main living floor.
  const marble = (floor = false) => {
    const material = new THREE.MeshPhysicalMaterial({
      map: marbleMap,
      roughness: floor ? 0.36 : 0.15,
      metalness: 0,
      clearcoat: floor ? 0.12 : 0.45,
      clearcoatRoughness: 0.12,
      envMapIntensity: 0.8,
    });
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
        // Video reference: a charcoal/brown porcelain body with pale veining.
        // Lift the darkest pigment and soften vein contrast in both bathrooms.
        diffuseColor.rgb = diffuseColor.rgb * 0.82 + vec3(0.012, 0.011, 0.010);
        vec2 tileUV = vMapUv * 4.0;
        vec2 edge = min(fract(tileUV), 1.0 - fract(tileUV));
        vec2 pixel = max(fwidth(tileUV), vec2(0.0001));
        vec2 grout = 1.0 - smoothstep(vec2(0.001), vec2(0.0025) + pixel * 0.5, edge);
        float tileJoint = max(grout.x, grout.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.032), tileJoint);`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.9, tileJoint);`,
        );
    };
    material.customProgramCacheKey = () => "marble-grout-v2";
    return material;
  };
  const plasterBump = canvasTexture(
    256,
    (x, y) => 120 + hash(x, y) * 22,
    false,
  );
  plasterBump.repeat.setScalar(2);
  const plaster = new THREE.MeshStandardMaterial({
    color: "#f0eeea",
    roughness: 0.9,
    bumpMap: plasterBump,
    bumpScale: 0.00035,
  });
  // A four-metre atlas gives sixteen subtly different concrete-look tiles.
  const floorMap = canvasTexture(1024, (x, y) => {
    const tileX = Math.floor(x / 256),
      tileY = Math.floor(y / 256);
    const grout = Math.min(x % 256, y % 256, 255 - (x % 256), 255 - (y % 256));
    const cloud =
      noise(x / 128, y / 128, 8) * 8 +
      noise(x / 32, y / 32, 32) * 5 +
      noise(x / 8, y / 8, 128) * 2;
    const grain = hash(x, y) * 1.8;
    const variation = hash(tileX, tileY) * 3;
    return grout === 0 ? 162 : 177 + variation + cloud + grain;
  });
  floorMap.repeat.setScalar(1 / (4 * FLOOR_TILE_SIZE));
  const floorBump = canvasTexture(
    1024,
    (x, y) => {
      const edge = Math.min(x % 256, y % 256, 255 - (x % 256), 255 - (y % 256));
      return edge === 0 ? 40 : edge === 1 ? 170 : 205 + hash(x, y) * 4;
    },
    false,
  );
  floorBump.repeat.copy(floorMap.repeat);
  const floorRoughness = canvasTexture(
    512,
    (x, y) => 190 + noise(x / 32, y / 32, 16) * 40,
    false,
  );
  floorRoughness.repeat.copy(floorMap.repeat);
  const floor = new THREE.MeshPhysicalMaterial({
    color: "#fffdf8",
    map: floorMap,
    bumpMap: floorBump,
    bumpScale: 0.0008,
    roughnessMap: floorRoughness,
    roughness: 0.55,
    clearcoat: 0.16,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.55,
  });

  // Horizontal sculpted waves in 60 × 30 cm panels (estimated from the photo).
  const waveHeight = (x, y, size) => {
    const u = (x / size) * 1.2,
      v = (y / size) * 1.2;
    const bend =
      0.008 * Math.sin((u * Math.PI * 2) / 1.2) +
      0.005 * Math.cos((u * Math.PI * 2) / 0.6);
    const ridge = (Math.sin(((v + bend) * Math.PI * 2) / (1.2 / 36)) + 1) / 2;
    const joint = x % (size / 2) < 1 || y % (size / 4) < 1;
    return joint ? 65 : 90 + ridge * 130;
  };
  const bump = canvasTexture(512, waveHeight, false);
  const waveMap = canvasTexture(
    512,
    (x, y, size) => 215 + waveHeight(x, y, size) * 0.12,
  );
  bump.repeat.setScalar(1 / 1.2);
  waveMap.repeat.copy(bump.repeat);
  const wave = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      map: waveMap,
      bumpMap: bump,
      bumpScale: 0.004,
      roughness: 0.82,
    });
  return {
    plaster,
    floor,
    whiteWave: wave("#eceae6"),
    charcoalWave: wave("#51575b"),
    marbleBath: marble(),
    marbleEnsuite: marble(),
    floorBath: marble(true),
    floorEnsuite: marble(true),
  };
}
