import * as THREE from "three";
import {
  ceilingSections,
  ceilingHeight,
  acGrille,
  magneticTracks,
  entranceSpots,
  warmLightColor,
} from "./entrance-layout.js";
import { daylightUV } from "./daylight-layout.js";

export function buildEntrance(parent, plaster) {
  const track = new THREE.MeshStandardMaterial({
    color: "#202223",
    roughness: 0.48,
  });
  const grilleWhite = plaster.clone();
  grilleWhite.color.set("#f6f6f2");
  const recess = plaster.clone();
  recess.color.set("#b7bbb6");
  const diffuser = new THREE.MeshStandardMaterial({
    color: "#eee6d6",
    roughness: 0.4,
    emissive: warmLightColor,
    emissiveIntensity: 0,
  });
  function add(geometry, mat, x, y, z, section, face) {
    geometry.translate(x, y, z);
    const positions = geometry.attributes.position;
    const uv1 = new Float32Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i),
        py = positions.getY(i),
        pz = positions.getZ(i);
      const normal = geometry.attributes.normal;
      const side =
        face ||
        (normal.getY(i) < -0.9
          ? "bottom"
          : Math.abs(normal.getZ(i)) > 0.9
            ? "front"
            : "side");
      const u =
        side === "side"
          ? (pz - section.min[1]) / section.depth
          : (px - section.min[0]) / section.width;
      const v =
        side === "bottom"
          ? (pz - section.min[1]) / section.depth
          : (py - ceilingHeight) / section.height;
      uv1.set(daylightUV(`${section.id}-${side}`, u, v), i * 2);
    }
    geometry.setAttribute("uv1", new THREE.BufferAttribute(uv1, 2));
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = mat !== diffuser;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const box = (w, h, d, x, y, z, mat, section, face) =>
    add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, section, face);
  for (const section of ceilingSections) {
    const [x, z] = section.min,
      centerX = x + section.width / 2;
    const left = Math.max(x, acGrille.from),
      right = Math.min(section.max[0], acGrille.to);
    if (Math.abs(z - acGrille.z) > 0.001 || right <= left) {
      box(
        section.width,
        section.height,
        section.depth,
        centerX,
        ceilingHeight + section.height / 2,
        z + section.depth / 2,
        plaster,
        section,
      );
      continue;
    }
    // The opening stays within the front fascia as the confirmed drop changes.
    const openingHeight = acGrille.top - acGrille.bottom;
    const openingCenter = (acGrille.top + acGrille.bottom) / 2;
    const lowerHeight = acGrille.bottom - ceilingHeight;
    const upperHeight = ceilingHeight + section.height - acGrille.top;
    box(
      section.width,
      lowerHeight,
      section.depth,
      centerX,
      ceilingHeight + lowerHeight / 2,
      z + section.depth / 2,
      plaster,
      section,
    );
    box(
      section.width,
      upperHeight,
      section.depth,
      centerX,
      acGrille.top + upperHeight / 2,
      z + section.depth / 2,
      plaster,
      section,
    );
    box(
      section.width,
      openingHeight,
      section.depth - 0.065,
      centerX,
      openingCenter,
      z + (section.depth + 0.065) / 2,
      plaster,
      section,
    );
    box(
      right - left,
      openingHeight,
      0.006,
      (left + right) / 2,
      openingCenter,
      z + 0.061,
      recess,
      section,
      "front",
    );
    for (let i = 0; i < 4; i++)
      box(
        right - left,
        0.013,
        0.038,
        (left + right) / 2,
        acGrille.bottom + 0.012 + (i * (openingHeight - 0.024)) / 3,
        z + 0.034,
        grilleWhite,
        section,
        "front",
      );
    for (let support = left + 0.75; support < right; support += 0.75)
      box(
        0.014,
        openingHeight - 0.008,
        0.025,
        support,
        openingCenter,
        z + 0.04,
        grilleWhite,
        section,
        "front",
      );
    if (left > x)
      box(
        left - x,
        openingHeight,
        0.065,
        (x + left) / 2,
        openingCenter,
        z + 0.0325,
        plaster,
        section,
        "front",
      );
    if (right < section.max[0])
      box(
        section.max[0] - right,
        openingHeight,
        0.065,
        (right + section.max[0]) / 2,
        openingCenter,
        z + 0.0325,
        plaster,
        section,
        "front",
      );
  }
  for (const { from, to } of magneticTracks) {
    const dx = to[0] - from[0],
      dz = to[1] - from[1],
      length = Math.hypot(dx, dz);
    const x = (from[0] + to[0]) / 2,
      z = (from[1] + to[1]) / 2;
    const section = ceilingSections.find(
      (s) => x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1],
    );
    const angle = Math.atan2(dx, dz);
    add(
      new THREE.BoxGeometry(0.043, 0.012, length).rotateY(angle),
      track,
      x,
      ceilingHeight - 0.004,
      z,
      section,
      "bottom",
    );
    // Linear magnetic modules sit inside the slim dark recessed channel.
    const count = Math.ceil(length / 0.55),
      moduleLength = length / count;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      add(
        new THREE.BoxGeometry(0.026, 0.003, moduleLength - 0.014).rotateY(
          angle,
        ),
        diffuser,
        from[0] + dx * t,
        ceilingHeight - 0.011,
        from[1] + dz * t,
        section,
        "bottom",
      );
    }
  }
  for (const [x, z] of entranceSpots) {
    const section = ceilingSections[0];
    add(
      new THREE.CylinderGeometry(0.046, 0.046, 0.006, 32),
      grilleWhite,
      x,
      ceilingHeight - 0.003,
      z,
      section,
      "bottom",
    );
    add(
      new THREE.CylinderGeometry(0.035, 0.035, 0.008, 32),
      track,
      x,
      ceilingHeight - 0.009,
      z,
      section,
      "bottom",
    );
    add(
      new THREE.CylinderGeometry(0.027, 0.027, 0.002, 32),
      diffuser,
      x,
      ceilingHeight - 0.014,
      z,
      section,
      "bottom",
    );
  }
  return {
    materials: [track, grilleWhite, recess, diffuser],
    setNight(night) {
      diffuser.emissiveIntensity = night ? 4 : 0;
    },
  };
}
