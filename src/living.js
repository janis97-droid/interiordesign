import * as THREE from "three";
import {
  createLivingMaterials,
  buildSofa,
  buildTable,
  buildLamp,
  buildRug,
} from "./living-furniture.js";
import {
  livingSofas,
  livingTable,
  livingSideTable,
  livingRug,
  livingBakeBoxes,
  livingFloorY,
} from "./living-layout.js";
import { daylightUV, floorBounds } from "./daylight-layout.js";

export function buildLiving(parent, lit) {
  const group = new THREE.Group();
  group.name = "Reference-inspired living room";
  parent.add(group);
  const materials = createLivingMaterials(),
    bounds = [];
  // Small accents share one draw call, preserving their original colours and
  // roughness per vertex. Textured upholstery and metallic surfaces stay separate.
  const accents = new Set([
    materials.piping,
    materials.fringe,
    materials.leaf,
    materials.flower,
    materials.page,
    materials.ceramic,
  ]);
  const accentMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  function place(object, item) {
    object.position.set(item.x, livingFloorY, item.z);
    object.rotation.y = item.rotation || 0;
    group.add(object);
    group.updateMatrixWorld(true);
    const envelope = livingBakeBoxes.find((b) => b.id === item.id);
    const bounds3 = new THREE.Box3().setFromObject(object);
    bounds.push({
      id: item.id || "rug",
      min: bounds3.min.toArray(),
      max: bounds3.max.toArray(),
    });
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      // Blend three separately addressed atlas patches around rounded corners;
      // interpolating UVs between atlas islands produces dark upholstery seams.
      const geometry = mesh.geometry,
        positions = geometry.attributes.position,
        normals = geometry.attributes.normal;
      if (accents.has(mesh.material)) {
        const colours = new Float32Array(positions.count * 3);
        const roughness = new Float32Array(positions.count).fill(
          mesh.material.roughness,
        );
        for (let i = 0; i < positions.count; i++)
          mesh.material.color.toArray(colours, i * 3);
        geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
        geometry.setAttribute(
          "livingRoughness",
          new THREE.BufferAttribute(roughness, 1),
        );
        mesh.material = accentMaterial;
      }
      const uv = new Float32Array(positions.count * 2),
        uvX = new Float32Array(positions.count * 2),
        uvZ = new Float32Array(positions.count * 2),
        weights = new Float32Array(positions.count * 3);
      const point = new THREE.Vector3(),
        normal = new THREE.Vector3(),
        matrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        normal.fromBufferAttribute(normals, i).applyMatrix3(matrix).normalize();
        if (envelope) {
          const x =
              (point.x - envelope.x + envelope.width / 2) / envelope.width,
            z = (point.z - envelope.z + envelope.depth / 2) / envelope.depth,
            y = 1 - (point.y - envelope.y) / envelope.height;
          uv.set(daylightUV(`living-${envelope.id}-top`, x, z), i * 2);
          uvX.set(
            daylightUV(
              `living-${envelope.id}-${normal.x < 0 ? "west" : "east"}`,
              z,
              y,
            ),
            i * 2,
          );
          uvZ.set(
            daylightUV(
              `living-${envelope.id}-${normal.z < 0 ? "north" : "south"}`,
              x,
              y,
            ),
            i * 2,
          );
          const wx = Math.abs(normal.x) ** 4,
            wy = Math.abs(normal.y) ** 4,
            wz = Math.abs(normal.z) ** 4,
            sum = wx + wy + wz;
          weights.set([wx / sum, wy / sum, wz / sum], i * 3);
        } else {
          const floor = daylightUV(
            "floor",
            (point.x - floorBounds.minX) /
              (floorBounds.maxX - floorBounds.minX),
            (point.z - floorBounds.minZ) /
              (floorBounds.maxZ - floorBounds.minZ),
          );
          uv.set(floor, i * 2);
          uvX.set(floor, i * 2);
          uvZ.set(floor, i * 2);
          weights.set([0, 1, 0], i * 3);
        }
      }
      geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
      geometry.setAttribute("livingLightX", new THREE.BufferAttribute(uvX, 2));
      geometry.setAttribute("livingLightZ", new THREE.BufferAttribute(uvZ, 2));
      geometry.setAttribute(
        "livingLightWeights",
        new THREE.BufferAttribute(weights, 3),
      );
    });
  }
  place(buildRug(livingRug, materials), livingRug);
  for (const sofa of livingSofas) place(buildSofa(sofa, materials), sofa);
  place(buildTable(livingTable, materials), livingTable);
  const side = buildTable(livingSideTable, materials, true);
  side.add(buildLamp(materials, livingSideTable.height));
  place(side, livingSideTable);
  const baked = [
    ...Object.values(materials).filter((material) => !accents.has(material)),
    accentMaterial,
  ].map((material) => {
    lit(material);
    material.onBeforeCompile = (shader) => {
      const varyings =
        "varying vec2 vLivingLightX; varying vec2 vLivingLightZ; varying vec3 vLivingLightWeights;\n";
      shader.vertexShader =
        "attribute vec2 livingLightX; attribute vec2 livingLightZ; attribute vec3 livingLightWeights;\n" +
        varyings +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvLivingLightX=livingLightX; vLivingLightZ=livingLightZ; vLivingLightWeights=livingLightWeights;",
      );
      shader.fragmentShader = varyings + shader.fragmentShader;
      if (material === accentMaterial) {
        shader.vertexShader =
          "attribute float livingRoughness; varying float vLivingRoughness;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvLivingRoughness=livingRoughness;",
        );
        shader.fragmentShader =
          "varying float vLivingRoughness;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\nroughnessFactor=vLivingRoughness;",
        );
      }
      const lightChunk = THREE.ShaderChunk.lights_fragment_maps.replace(
        "texture2D( lightMap, vLightMapUv )",
        "(texture2D(lightMap,vLightMapUv)*vLivingLightWeights.y + texture2D(lightMap,vLivingLightX)*vLivingLightWeights.x + texture2D(lightMap,vLivingLightZ)*vLivingLightWeights.z)",
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_maps>",
        lightChunk,
      );
    };
    material.customProgramCacheKey = () =>
      `living-blended-lightmap-v2-${material === accentMaterial}`;
    return material;
  });
  for (const material of accents) material.dispose();
  return {
    group,
    bounds,
    materials: baked,
    reflectionMaterials: [materials.wood, materials.brass, accentMaterial],
    setNight(night) {
      materials.shade.emissiveIntensity = night ? 1.6 : 0;
    },
  };
}
