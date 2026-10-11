import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { p, SCALE, HEIGHT, footprint, balcony, walls } from "./plan.js";

export function buildWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const architecture = new THREE.Group(),
    ceiling = new THREE.Group();
  root.add(architecture, ceiling);
  const obstacles = [];
  const material = (color, roughness = 0.8, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const plaster = material("#e9e6dc"),
    trim = material("#f5f2e9"),
    oak = material("#ae8056"),
    oakDark = material("#72513b");
  const sage = material("#747f66"),
    fabric = material("#dcd6c8"),
    ivory = material("#f5f0e6"),
    terracotta = material("#9b674b");
  const metal = material("#3e423a", 0.35, { metalness: 0.55 }),
    brass = material("#b49a66", 0.3, { metalness: 0.65 });
  const glass = material("#c4dace", 0.15, {
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const stone = material("#ded9cb"),
    leaf = material("#53694a"),
    leafLight = material("#6f8057");
  let seed = 61;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  function texture(kind) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle =
      kind === "wood" ? "#bd956b" : kind === "rug" ? "#c9c3ae" : "#e5e1d6";
    ctx.fillRect(0, 0, 512, 512);
    if (kind === "wood") {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `hsl(32 32% ${56 + random() * 12}%)`;
        ctx.fillRect(i * 64, 0, 64, 512);
        ctx.fillStyle = "#8f705244";
        ctx.fillRect(i * 64, 0, 1.5, 512);
        ctx.fillRect(i * 64, Math.floor(random() * 450), 64, 1);
      }
      for (let i = 0; i < 2300; i++) {
        ctx.strokeStyle = `rgba(82,52,25,${random() * 0.09})`;
        ctx.beginPath();
        const x = random() * 512,
          y = random() * 512;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 3, y + 20, x - 3, y + 50, x, y + 80);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 13000; i++) {
        ctx.fillStyle = `rgba(75,68,50,${random() * 0.1})`;
        ctx.fillRect(random() * 512, random() * 512, kind === "rug" ? 3 : 1, 1);
      }
      if (kind === "tile") {
        ctx.strokeStyle = "#c5c0b355";
        ctx.lineWidth = 1.3;
        ctx.strokeRect(0, 0, 512, 512);
      } else {
        for (let y = 0; y < 512; y += 3) {
          ctx.strokeStyle = "#fdf4de28";
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }
  const woodFloor = material("#ffffff", 0.8, { map: texture("wood") });
  woodFloor.map.repeat.set(0.55, 0.55);
  const tileFloor = material("#ffffff", 0.88, { map: texture("tile") });
  tileFloor.map.repeat.set(0.8, 0.8);
  const rugMaterial = material("#ffffff", 1, { map: texture("rug") });
  const couchMaterial = material("#e3ded3", 1, { map: texture("rug") });
  couchMaterial.map.repeat.set(2, 2);
  function box(parent, w, h, d, x, y, z, mat = plaster, radius = 0) {
    const geo = radius
      ? new RoundedBoxGeometry(
          w,
          h,
          d,
          2,
          Math.min(radius, w / 2, h / 2, d / 2),
        )
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(parent, r1, r2, h, x, y, z, mat = oak, segments = 24) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r2, h, segments),
      mat,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function sphere(parent, r, x, y, z, mat, scale = [1, 1, 1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    m.position.set(x, y, z);
    m.scale.set(...scale);
    m.castShadow = true;
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
  floor(footprint, tileFloor);
  floor(balcony, woodFloor);
  rectFloor(170, 749, 446, 989, woodFloor);
  rectFloor(599, 925, 878, 1330, woodFloor);
  rectFloor(324, 1100, 583, 1330, woodFloor);

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
          box(group, 0.045, o.top, 0.2, x, o.top / 2, 0, oak);
        box(group, width, 0.06, 0.2, center, o.top, 0, oak);
        box(
          root,
          0.6,
          0.015,
          0.18,
          wall.a[0] + (dx * center) / length,
          0.012,
          wall.a[1] + (dz * center) / length,
          stone,
        ).rotation.y = group.rotation.y;
      }
      cursor = o.to;
    }
    fill(cursor, length, 0, HEIGHT);
    // Skirting follows solid lower wall sections, leaving doors clear.
    let start = 0;
    const doors = wall.openings
      .filter((o) => o.type === "door")
      .sort((a, b) => a.from - b.from);
    for (const d of [...doors, { from: length, to: length }]) {
      if (d.from > start)
        box(
          group,
          d.from - start,
          0.075,
          wall.thickness + 0.018,
          (start + d.from) / 2,
          0.038,
          0,
          trim,
        );
      start = d.to;
    }
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

  function place(px, py, angle = 0) {
    const [x, z] = p(px, py);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = angle;
    root.add(g);
    return g;
  }
  function block(g, width, depth, dx = 0, dz = 0) {
    const c = Math.cos(g.rotation.y),
      s = Math.sin(g.rotation.y);
    obstacles.push({
      x: g.position.x + dx * c + dz * s,
      z: g.position.z - dx * s + dz * c,
      width,
      depth,
      angle: g.rotation.y,
    });
  }
  function rug(px, py, w, d) {
    const g = place(px, py);
    box(g, w, 0.012, d, 0, 0.018, 0, rugMaterial, 0.006);
    return g;
  }
  function plant(px, py, size = 1) {
    const g = place(px, py);
    g.scale.setScalar(size);
    cylinder(g, 0.22, 0.16, 0.4, 0, 0.2, 0, terracotta);
    cylinder(g, 0.19, 0.19, 0.02, 0, 0.405, 0, oakDark);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4,
        h = 0.7 + random() * 0.65,
        r = 0.12 + random() * 0.18;
      const stem = cylinder(
        g,
        0.013,
        0.018,
        h - 0.35,
        (Math.cos(a) * r) / 2,
        (h + 0.35) / 2,
        (Math.sin(a) * r) / 2,
        oakDark,
        6,
      );
      stem.rotation.z = Math.sin(a) * 0.22;
      const l = sphere(
        g,
        0.23,
        Math.cos(a) * r,
        h,
        Math.sin(a) * r,
        i % 2 ? leaf : leafLight,
        [0.65, 1.3, 0.42],
      );
      l.rotation.set(0.3, a, 0.6);
    }
    return g;
  }
  function vase(g, x, y, z, r = 0.1) {
    cylinder(g, r * 0.65, r, r * 2.5, x, y + r * 1.25, z, ivory);
    cylinder(g, r * 0.46, r * 0.46, 0.015, x, y + r * 2.5, z, oakDark);
  }
  function books(g, x, y, z) {
    for (let i = 0; i < 3; i++) {
      const b = box(
        g,
        0.28,
        0.035,
        0.2,
        x,
        y + 0.018 + i * 0.04,
        z,
        [sage, terracotta, ivory][i],
        0.008,
      );
      b.rotation.y = i * 0.12;
    }
  }
  function sofa(px, py, width = 2.7, angle = 0) {
    const g = place(px, py, angle);
    block(g, width, 0.92);
    box(g, width, 0.27, 0.88, 0, 0.3, 0, couchMaterial, 0.09);
    box(g, width, 0.55, 0.21, 0, 0.7, -0.36, couchMaterial, 0.09);
    for (const x of [-width / 2 + 0.12, width / 2 - 0.12])
      box(g, 0.24, 0.4, 0.9, x, 0.55, 0, couchMaterial, 0.07);
    for (let i = 0; i < 3; i++)
      box(
        g,
        (width - 0.6) / 3,
        0.16,
        0.62,
        ((i - 1) * (width - 0.6)) / 3,
        0.5,
        0.05,
        couchMaterial,
        0.065,
      );
    for (const x of [-0.83, 0.82]) {
      const pillow = box(
        g,
        0.45,
        0.42,
        0.16,
        x,
        0.74,
        -0.18,
        x < 0 ? sage : ivory,
        0.09,
      );
      pillow.rotation.set(-0.15, 0, x > 0 ? -0.12 : 0.12);
    }
    for (const x of [-width / 2 + 0.18, width / 2 - 0.18])
      for (const z of [-0.3, 0.3])
        cylinder(g, 0.027, 0.035, 0.18, x, 0.09, z, oakDark, 8);
  }
  function lounge(px, py, angle = 0) {
    const g = place(px, py, angle);
    block(g, 0.8, 0.82);
    box(g, 0.72, 0.2, 0.72, 0, 0.42, 0, fabric, 0.08);
    box(g, 0.72, 0.53, 0.18, 0, 0.69, -0.31, fabric, 0.09);
    for (const x of [-0.4, 0.4]) {
      box(g, 0.07, 0.08, 0.76, x, 0.63, 0, oak, 0.028);
      for (const z of [-0.3, 0.3])
        box(g, 0.05, 0.6, 0.05, x, 0.3, z, oak, 0.014);
    }
  }
  function picture(px, py, width = 1.1, height = 0.9, angle = 0) {
    const g = place(px, py, angle);
    box(g, width, height, 0.055, 0, 1.55, 0, oakDark);
    box(g, width - 0.06, height - 0.06, 0.018, 0, 1.55, 0.034, ivory);
    const a = cylinder(g, 0.23, 0.23, 0.012, 0.1, 1.65, 0.05, terracotta, 40);
    a.rotation.x = Math.PI / 2;
    box(g, width * 0.42, height * 0.2, 0.015, -0.12, 1.37, 0.053, sage);
  }
  // Living room: the arrangement follows the furniture locations in the drawing.
  rug(478, 538, 3.8, 2.8);
  sofa(484, 477, 2.75);
  lounge(344, 569, -0.2);
  lounge(625, 569, 0.25);
  const coffee = place(483, 577);
  block(coffee, 1.12, 0.68);
  box(coffee, 1.12, 0.11, 0.68, 0, 0.4, 0, oak, 0.11);
  box(coffee, 0.7, 0.32, 0.42, 0, 0.16, 0, oak, 0.06);
  books(coffee, -0.25, 0.46, 0);
  vase(coffee, 0.26, 0.46, 0.05, 0.095);
  // Keep the proposed TV and console against the built part of the divider.
  const media = place(711, 512);
  block(media, 0.28, 1.9);
  box(media, 0.27, 0.36, 1.9, 0, 0.3, 0, oak, 0.02);
  box(media, 0.055, 0.92, 1.62, -0.1, 1.17, 0, metal, 0.02);
  plant(323, 439, 1.15);
  plant(677, 720, 1);
  const side = place(644, 489);
  cylinder(side, 0.28, 0.23, 0.46, 0, 0.23, 0, oak);
  vase(side, 0, 0.46, 0, 0.11);
  // A floor lamp with a linen shade.
  const lamp = place(673, 452);
  cylinder(lamp, 0.2, 0.2, 0.04, 0, 0.02, 0, metal);
  cylinder(lamp, 0.018, 0.018, 1.45, 0, 0.76, 0, metal);
  cylinder(lamp, 0.18, 0.3, 0.36, 0, 1.58, 0, ivory);

  // Kitchen, dining, and pendants.
  function cabinet(px, py, w, d, angle = 0) {
    const g = place(px, py, angle);
    block(g, w, d);
    box(g, w, 0.78, d, 0, 0.44, 0, sage, 0.014);
    box(g, w + 0.04, 0.055, d + 0.055, 0, 0.858, 0, stone, 0.012);
    for (let x = -w / 2 + 0.3; x < w / 2; x += 0.6) {
      box(g, 0.008, 0.7, 0.012, x, 0.45, d / 2 + 0.008, oakDark);
      box(g, 0.16, 0.014, 0.02, x - 0.14, 0.72, d / 2 + 0.025, brass);
    }
    return g;
  }
  const cook = cabinet(1041, 720, 3.53, 0.61, Math.PI);
  cabinet(1142, 633, 2.18, 0.58, -Math.PI / 2);
  box(cook, 0.83, 0.02, 0.47, -0.35, 0.897, 0, metal, 0.016);
  for (const x of [-0.57, -0.13])
    for (const z of [-0.13, 0.13])
      cylinder(cook, 0.105, 0.105, 0.012, x, 0.915, z, material("#1b2525"), 24);
  const sink = place(1142, 623);
  box(sink, 0.39, 0.012, 0.64, 0, 0.9, 0, metal, 0.04);
  box(sink, 0.34, 0.02, 0.58, 0, 0.907, 0, material("#969e98"), 0.03);
  const tap = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.012, 8, 20, Math.PI),
    brass,
  );
  tap.rotation.y = Math.PI / 2;
  tap.position.set(0.11, 1.05, 0);
  sink.add(tap);
  cylinder(sink, 0.012, 0.012, 0.2, 0.11, 0.96, -0.1, brass, 8);
  const fridge = place(920, 718);
  block(fridge, 0.68, 0.65);
  box(fridge, 0.68, 2.23, 0.65, 0, 1.115, 0, ivory, 0.025);
  box(fridge, 0.035, 0.6, 0.03, -0.25, 1.15, -0.343, brass);
  box(fridge, 0.64, 0.012, 0.015, 0, 0.8, -0.334, stone);
  const dining = place(1044, 508);
  block(dining, 1.9, 0.96);
  box(dining, 1.9, 0.08, 0.96, 0, 0.77, 0, oak, 0.14);
  for (const x of [-0.62, 0.62])
    box(dining, 0.1, 0.73, 0.62, x, 0.37, 0, oak, 0.03);
  function chair(px, py, angle) {
    const g = place(px, py, angle);
    box(g, 0.43, 0.07, 0.44, 0, 0.47, 0, fabric, 0.045);
    box(g, 0.46, 0.37, 0.06, 0, 0.67, -0.21, oak, 0.06);
    for (const x of [-0.18, 0.18])
      for (const z of [-0.16, 0.16])
        box(g, 0.035, 0.45, 0.035, x, 0.23, z, oak, 0.008);
    block(g, 0.47, 0.5);
  }
  for (const x of [1003, 1082]) {
    chair(x, 451, 0);
    chair(x, 566, Math.PI);
  }
  chair(955, 508, -Math.PI / 2);
  chair(1133, 508, Math.PI / 2);
  vase(dining, 0, 0.82, 0, 0.12);
  books(dining, 0.53, 0.82, 0.05);
  function pendant(px, py) {
    const g = place(px, py);
    cylinder(g, 0.012, 0.012, 0.68, 0, HEIGHT - 0.34, 0, metal, 8);
    cylinder(g, 0.12, 0.34, 0.24, 0, HEIGHT - 0.8, 0, ivory, 40);
    const light = new THREE.PointLight("#ffdeb0", 5, 4, 2);
    light.position.set(0, HEIGHT - 0.95, 0);
    g.add(light);
    ceiling.add(g);
  }
  pendant(1011, 508);
  pendant(1078, 508);

  function bed(px, py, width = 1.6, angle = 0) {
    const g = place(px, py, angle);
    block(g, width + 0.12, 2.12);
    box(g, width + 0.12, 0.27, 2.1, 0, 0.23, 0, oak, 0.04);
    box(g, width, 0.24, 2, 0, 0.46, 0, ivory, 0.07);
    box(g, width + 0.2, 1.05, 0.14, 0, 0.6, -1.01, fabric, 0.04);
    box(g, width + 0.03, 0.05, 1.2, 0, 0.615, 0.34, sage, 0.04);
    for (const x of [-width / 4, width / 4])
      box(g, width / 2 - 0.09, 0.13, 0.44, x, 0.64, -0.64, ivory, 0.06);
    for (const x of [-width / 2 - 0.36, width / 2 + 0.36]) {
      box(g, 0.43, 0.38, 0.43, x, 0.27, -0.75, oak, 0.025);
      cylinder(g, 0.12, 0.15, 0.17, x, 0.59, -0.75, ivory);
      cylinder(g, 0.018, 0.018, 0.12, x, 0.47, -0.75, brass, 8);
    }
    return g;
  }
  rug(753, 1209, 2.8, 2.7);
  bed(754, 1227, 1.7, Math.PI);
  const wardrobe = place(752, 947);
  block(wardrobe, 2.75, 0.57);
  box(wardrobe, 2.75, 2.5, 0.57, 0, 1.25, 0, ivory, 0.015);
  for (let x = -1.1; x < 1.2; x += 0.55) {
    box(wardrobe, 0.008, 2.45, 0.01, x, 1.25, 0.289, stone);
    box(wardrobe, 0.018, 0.35, 0.025, x + 0.08, 1.1, 0.31, brass);
  }
  picture(872, 1220, 0.95, 0.95, -Math.PI / 2);
  plant(851, 1305, 0.8);
  rug(285, 867, 2.45, 2.35);
  bed(281, 837, 1.35);
  picture(195, 752, 0.6, 0.65);
  plant(188, 960, 0.72);
  // Safe room: a reversible daybed and desk concept, retaining the opening positions.
  sofa(369, 1216, 2.05, Math.PI / 2);
  const desk = place(497, 1307);
  block(desk, 1.55, 0.54);
  box(desk, 1.55, 0.065, 0.54, 0, 0.76, 0, oak, 0.025);
  for (const x of [-0.68, 0.68]) box(desk, 0.05, 0.72, 0.43, x, 0.36, 0, oak);
  box(desk, 0.48, 0.31, 0.035, 0, 1.02, 0, metal, 0.015);
  box(desk, 0.2, 0.025, 0.14, 0, 0.81, 0.07, metal);
  chair(494, 1248, 0);
  books(desk, 0.51, 0.8, 0.05);
  picture(425, 1102, 0.8, 0.75);
  plant(561, 1317, 0.66);
  // Bathrooms: proposed fittings, kept within the plan's existing wet rooms.
  function toilet(px, py, angle = 0) {
    const g = place(px, py, angle);
    block(g, 0.42, 0.64);
    box(g, 0.43, 0.62, 0.19, 0, 0.34, -0.23, ivory, 0.055);
    const bowl = sphere(g, 0.25, 0, 0.36, 0.06, ivory, [0.85, 0.55, 1.15]);
    cylinder(g, 0.16, 0.14, 0.27, 0, 0.14, 0, ivory);
    const seat = new THREE.Mesh(
      new THREE.TorusGeometry(0.155, 0.028, 8, 30),
      ivory,
    );
    seat.rotation.x = Math.PI / 2;
    seat.scale.y = 1.3;
    seat.position.set(0, 0.485, 0.09);
    g.add(seat);
    return bowl;
  }
  function vanity(px, py, width = 1.05, angle = 0) {
    const g = place(px, py, angle);
    block(g, width, 0.48);
    box(g, width, 0.43, 0.46, 0, 0.55, 0, oak, 0.02);
    box(g, width + 0.04, 0.035, 0.51, 0, 0.79, 0, stone);
    cylinder(g, 0.19, 0.15, 0.11, 0, 0.86, 0, ivory);
    box(g, 0.02, 0.19, 0.02, 0.22, 0.9, -0.15, brass);
    const mirror = new THREE.Mesh(
      new THREE.CircleGeometry(0.37, 40),
      material("#a4b3ab", 0.12, { metalness: 0.8 }),
    );
    mirror.position.set(0, 1.6, -0.21);
    g.add(mirror);
  }
  vanity(128, 1182, 1.3, Math.PI / 2);
  toilet(161, 1037, Math.PI / 2);
  toilet(1020, 1092, Math.PI);
  function shower(px, py, w = 1.15, d = 0.95) {
    const g = place(px, py);
    box(g, w, 0.06, d, 0, 0.03, 0, ivory, 0.025);
    box(g, 0.018, 2.12, d, w / 2, 1.09, 0, glass);
    box(g, 0.025, 2.15, 0.025, w / 2, 1.08, d / 2, brass);
    box(g, w, 0.025, 0.025, 0, 2.16, d / 2, brass);
    box(g, 0.025, 1.2, 0.025, 0, 1.6, -d / 2 + 0.04, brass);
    cylinder(g, 0.13, 0.13, 0.025, 0, 2.2, -d / 2 + 0.17, brass);
  }
  shower(189, 1285, 1.4, 0.92);
  shower(950, 1165, 1.15, 0.8);
  vanity(910, 1251, 0.62, Math.PI / 2);
  // Balcony bistro furniture and greenery.
  plant(148, 437, 0.85);
  plant(243, 438, 0.7);
  plant(147, 627, 0.55);
  const bistro = place(197, 525);
  cylinder(bistro, 0.32, 0.32, 0.045, 0, 0.72, 0, oak);
  cylinder(bistro, 0.045, 0.045, 0.69, 0, 0.35, 0, metal);
  cylinder(bistro, 0.22, 0.22, 0.025, 0, 0.025, 0, metal);
  block(bistro, 0.66, 0.66);
  chair(198, 479, 0);
  chair(198, 573, Math.PI);
  vase(bistro, 0, 0.75, 0, 0.06);
  // Hall bench and small welcoming vignette.
  const hall = place(815, 896);
  block(hall, 1.3, 0.35);
  box(hall, 1.3, 0.09, 0.35, 0, 0.46, 0, fabric, 0.035);
  for (const x of [-0.53, 0.53]) box(hall, 0.06, 0.42, 0.28, x, 0.21, 0, oak);
  picture(792, 912, 1.2, 0.6, Math.PI);
  plant(756, 778, 0.7);
  // Recessed ceiling lights only show in the walkthrough.
  for (const [x, z] of [
    [377, 674],
    [626, 675],
    [817, 704],
    [1018, 641],
    [542, 842],
    [486, 1039],
    [719, 1100],
    [259, 891],
    [465, 1159],
  ]) {
    const [mx, mz] = p(x, z);
    cylinder(
      ceiling,
      0.06,
      0.06,
      0.018,
      mx,
      HEIGHT - 0.01,
      mz,
      material("#fff5d5", 0.5, { emissive: "#ffe2af", emissiveIntensity: 0.7 }),
      12,
    );
  }
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
  // Furnishings are view-only: batch static geometry by material to keep mobile
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
