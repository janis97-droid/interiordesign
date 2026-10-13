import * as THREE from "three";
import {
  createKitchenMaterials,
  buildBaseCabinet,
  buildBlindCorner,
  buildShelfDecor,
  buildTower,
  buildIsland,
  buildStool,
  buildShelf,
  buildLantern,
} from "./kitchen-furniture.js";
import {
  kitchenUnits,
  kitchenIsland,
  kitchenStools,
  kitchenShelves,
  kitchenLanterns,
  kitchenBakeBoxes,
  kitchenFloorY,
} from "./kitchen-layout.js";
import { walls, HEIGHT } from "./plan.js";
import { daylightUV, floorBounds } from "./daylight-layout.js";

// This assembly is furniture only. The plan, openings and elevations are not
// modified. Its materials share the house's offline day/night illumination.
export function buildKitchen(parent, ceiling, lit) {
  const materials = createKitchenMaterials();
  const group = new THREE.Group();
  group.name = "Walnut kitchen";
  parent.add(group);
  const bounds = [];
  const assignLightUV = (object, box) => {
    object.updateMatrixWorld(true);
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      // Carved motifs reuse their source geometry; each needs its own atlas UVs.
      mesh.geometry = mesh.geometry.clone();
      const geometry = mesh.geometry,
        pos = geometry.attributes.position,
        normal = geometry.attributes.normal;
      const values = new Float32Array(pos.count * 2);
      const point = new THREE.Vector3(),
        n = new THREE.Vector3();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        mesh.matrixWorld,
      );
      for (let i = 0; i < pos.count; i++) {
        point.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
        let id = "floor",
          u =
            (point.x - floorBounds.minX) /
            (floorBounds.maxX - floorBounds.minX),
          v =
            (point.z - floorBounds.minZ) /
            (floorBounds.maxZ - floorBounds.minZ);
        if (box) {
          const side =
            Math.abs(n.y) > 0.65
              ? "top"
              : Math.abs(n.z) >= Math.abs(n.x)
                ? n.z < 0
                  ? "north"
                  : "south"
                : n.x < 0
                  ? "west"
                  : "east";
          id = `kitchen-${box.id}-${side}`;
          u =
            side === "east" || side === "west"
              ? (point.z - box.z + box.depth / 2) / box.depth
              : (point.x - box.x + box.width / 2) / box.width;
          v =
            side === "top"
              ? (point.z - box.z + box.depth / 2) / box.depth
              : 1 - (point.y - box.y) / box.height;
        } else if (object.userData.wallLight) {
          // Shelves receive illumination from the exposed wall behind them.
          id = "wall-20--1";
          u = (point.x - walls[20].a[0]) / (walls[20].b[0] - walls[20].a[0]);
          v = 1 - point.y / HEIGHT;
        }
        values.set(daylightUV(id, u, v), i * 2);
      }
      geometry.setAttribute("uv1", new THREE.BufferAttribute(values, 2));
    });
  };
  const place = (object, item, target = group, y = kitchenFloorY) => {
    object.position.set(item.x, y, item.z);
    object.rotation.y = item.rotation || 0;
    target.add(object);
    target.updateMatrixWorld(true);
    assignLightUV(
      object,
      kitchenBakeBoxes.find((b) => b.id === item.id),
    );
    const b = new THREE.Box3().setFromObject(object);
    bounds.push({ id: item.id, min: b.min.toArray(), max: b.max.toArray() });
    return object;
  };
  for (const unit of kitchenUnits)
    place(
      unit.kind === "tower"
        ? buildTower(unit, materials)
        : unit.kind === "corner"
          ? buildBlindCorner(unit, materials)
          : buildBaseCabinet(
              {
                ...unit,
                drawers: unit.kind === "drawers",
                sink: unit.kind === "sink",
              },
              materials,
            ),
      unit,
    );
  place(buildIsland(kitchenIsland, materials), kitchenIsland);
  for (const stool of kitchenStools)
    place(buildStool({ ...stool, seatHeight: stool.height }, materials), stool);
  for (const [index, shelf] of kitchenShelves.entries()) {
    const object = buildShelf(shelf, materials);
    object.add(buildShelfDecor({ ...shelf, variant: index }, materials));
    object.userData.wallLight = true;
    // The plan cuts away overhead fittings, keeping the worktops visible.
    place(object, { ...shelf, rotation: Math.PI }, ceiling, shelf.height);
  }
  for (const lantern of kitchenLanterns)
    place(
      buildLantern(
        {
          drop: lantern.ceilingHeight - lantern.bottom,
          height: 0.43,
          radius: 0.105,
        },
        materials,
      ),
      lantern,
      ceiling,
      lantern.ceilingHeight,
    );
  const baked = Object.entries(materials)
    .filter(([name]) => !["glow", "amber"].includes(name))
    .map(([, mat]) => lit(mat));
  return {
    group,
    materials: baked,
    bounds,
    reflectionMaterials: [
      materials.stone,
      materials.brass,
      materials.black,
      materials.ceramic,
      materials.wood,
      materials.carved,
    ],
    setNight(night) {
      materials.glow.emissiveIntensity = night ? 3.2 : 0.18;
    },
  };
}
