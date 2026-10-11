import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { p, HEIGHT, footprint, balcony, walls } from "./plan.js";

export function buildWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const architecture = new THREE.Group(),
    ceiling = new THREE.Group();
  root.add(architecture, ceiling);
  const obstacles = [];
  const material = (color, roughness = 0.8, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  // Neutral placeholder surfaces: finishes will be chosen from the real home.
  const plaster = material("#e9e6dc"),
    trim = material("#f5f2e9"),
    stone = material("#ded9cb"),
    floorMaterial = material("#dedbd3", 0.95),
    metal = material("#3e423a", 0.35, { metalness: 0.55 });
  const glass = material("#c4dace", 0.15, {
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  function box(parent, w, h, d, x, y, z, mat = plaster) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function floor(poly, mat, y = 0) {
    const shape = new THREE.Shape(
      poly.map(([x, z]) => new THREE.Vector2(x, -z)),
    );
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }),
      mat,
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y - 0.15;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }
  const rectFloor = (x1, z1, x2, z2, mat, y = 0.005) =>
    floor([p(x1, z1), p(x2, z1), p(x2, z2), p(x1, z2)], mat, y);
  floor(footprint, floorMaterial);
  floor(balcony, floorMaterial);

  for (const wall of walls) {
    const dx = wall.b[0] - wall.a[0],
      dz = wall.b[1] - wall.a[1],
      length = Math.hypot(dx, dz);
    const group = new THREE.Group();
    group.position.set(wall.a[0], 0, wall.a[1]);
    group.rotation.y = -Math.atan2(dz, dx);
    architecture.add(group);
    const fill = (a, b, lo, hi) => {
      if (b - a > 0.005 && hi - lo > 0.005)
        box(
          group,
          b - a,
          hi - lo,
          wall.thickness,
          (a + b) / 2,
          (lo + hi) / 2,
          0,
        );
    };
    let cursor = 0;
    for (const o of [...wall.openings].sort((a, b) => a.from - b.from)) {
      fill(cursor, o.from, 0, HEIGHT);
      fill(o.from, o.to, 0, o.bottom);
      fill(o.from, o.to, o.top, HEIGHT);
      const width = o.to - o.from,
        center = (o.from + o.to) / 2;
      if (o.type === "window") {
        box(group, width, 0.06, 0.26, center, o.bottom, 0, stone);
        box(
          group,
          width,
          o.top - o.bottom,
          0.018,
          center,
          (o.top + o.bottom) / 2,
          0,
          glass,
        );
        for (const y of [o.bottom + 0.04, o.top - 0.025])
          box(group, width, 0.04, 0.08, center, y, 0, metal);
        for (let j = 0; j <= Math.ceil(width / 1.1); j++)
          box(
            group,
            0.035,
            o.top - o.bottom,
            0.08,
            o.from + (width * j) / Math.ceil(width / 1.1),
            (o.top + o.bottom) / 2,
            0,
            metal,
          );
      } else {
        for (const x of [o.from + 0.025, o.to - 0.025])
          box(group, 0.045, o.top, 0.2, x, o.top / 2, 0, trim);
        box(group, width, 0.06, 0.2, center, o.top, 0, trim);
      }
      cursor = o.to;
    }
    fill(cursor, length, 0, HEIGHT);
  }
  const ceilingShape = new THREE.Shape(
    footprint.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  const roof = new THREE.Mesh(
    new THREE.ShapeGeometry(ceilingShape),
    material("#f2efe5", 1, {
      side: THREE.DoubleSide,
      emissive: "#ece8db",
      emissiveIntensity: 0.2,
    }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = HEIGHT + 0.01;
  ceiling.add(roof);
  // Balcony railing and a fixed stairwell guard. The source supplies only this floor.
  function rail(a, b, h = 1.05) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz),
      g = new THREE.Group();
    g.position.set(a[0], 0, a[1]);
    g.rotation.y = -Math.atan2(dz, dx);
    root.add(g);
    box(g, len, 0.045, 0.045, len / 2, h, 0, metal);
    for (let x = 0; x < len + 0.01; x += 0.23)
      box(g, 0.018, h, 0.018, x, h / 2, 0, metal);
  }
  rail(balcony[0], balcony[1]);
  rail(balcony[0], balcony[3]);
  rail(balcony[3], balcony[2]);
  rail(p(895, 770), p(895, 1060));
  for (let i = 0; i < 11; i++) {
    const [x, z] = p(954 + i * 9, 1035 - i * 21);
    box(root, 1.2, 0.12, 0.28, x, -0.08 - i * 0.16, z, stone);
  }
  rectFloor(897, 775, 1145, 1050, material("#9e998c"), -0.13);

  // Empty shell at the owner's request. No cabinets (including the orange-X
  // unit shown beside the kitchen/living divider), furniture, decor, fittings,
  // or proposed light fixtures. Keep the shortened divider in plan.js.
  const hemi = new THREE.HemisphereLight("#fff6e5", "#8c8979", 2.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff5db", 3);
  sun.position.set(-3, 17, -5);
  sun.target.position.set(7, 0, 6);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -14,
    right: 14,
    top: 14,
    bottom: -14,
    near: 0.5,
    far: 45,
  });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  const fill = new THREE.DirectionalLight("#dce5ee", 0.8);
  fill.position.set(15, 6, 15);
  scene.add(fill);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    material("#d8dcd2"),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(7, -0.22, 6);
  ground.receiveShadow = true;
  scene.add(ground);
  // Batch static geometry by material to keep mobile
  // rendering inexpensive. Architecture and ceiling remain separate for modes.
  root.updateMatrixWorld(true);
  function batch(group, exclude = []) {
    const batches = new Map(),
      inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
    function visit(object) {
      if (exclude.includes(object)) return;
      if (object.isMesh && !object.material.transparent) {
        const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
        if (!batches.has(key))
          batches.set(key, {
            material: object.material,
            cast: object.castShadow,
            receive: object.receiveShadow,
            meshes: [],
            geometries: [],
          });
        const b = batches.get(key),
          clone = object.geometry.index
            ? object.geometry.toNonIndexed()
            : object.geometry.clone();
        clone.applyMatrix4(
          new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
        );
        b.geometries.push(clone);
        b.meshes.push(object);
      }
      for (const child of object.children) visit(child);
    }
    visit(group);
    for (const b of batches.values()) {
      const geometry = mergeGeometries(b.geometries);
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, b.material);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      group.add(mesh);
      for (const old of b.meshes) {
        old.removeFromParent();
        old.geometry.dispose();
      }
      for (const g of b.geometries) g.dispose();
    }
  }
  batch(architecture);
  batch(ceiling);
  batch(root, [architecture, ceiling]);
  return {
    root,
    architecture,
    ceiling,
    obstacles,
    setMode(mode) {
      const walking = mode === "walk";
      ceiling.visible = walking;
      architecture.scale.y = walking ? 1 : 0.42;
      ground.material.color.set(walking ? "#c4cbb8" : "#d8dcd2");
      sun.intensity = walking ? 2.3 : 3;
      hemi.intensity = walking ? 2.4 : 2.25;
    },
  };
}
