import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
function box(parent, w, h, d, x, y, z, mat, r = 0) {
  return add(
    parent,
    r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d),
    mat,
    x,
    y,
    z,
  );
}
function lathe(parent, profile, mat, x = 0, y = 0, z = 0, segments = 32) {
  return add(
    parent,
    new THREE.LatheGeometry(
      profile.map((p) => new THREE.Vector2(...p)),
      segments,
    ),
    mat,
    x,
    y,
    z,
  );
}
function rod(parent, a, b, r, mat) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b),
    delta = end.clone().sub(start);
  const mesh = add(
    parent,
    new THREE.CylinderGeometry(r, r, delta.length(), 6),
    mat,
  );
  mesh.position.copy(start.add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return mesh;
}
function canvasTexture(w, h, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext("2d"), w, h);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}
const hash = (x, y) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

// Original floral textile artwork, woven at material scale. The rust field,
// ivory vine border and small repeating palmettes follow the supplied reference.
function ornament(
  ctx,
  x,
  y,
  r,
  angle = 0,
  colors = ["#cfb78a", "#53604a", "#732e29"],
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = Math.max(0.6, r * 0.065);
  ctx.beginPath();
  ctx.moveTo(0, r * 1.6);
  ctx.bezierCurveTo(-r * 0.5, r * 0.6, r * 0.5, -r * 0.2, 0, -r * 1.3);
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    ctx.save();
    ctx.rotate((k * Math.PI) / 4);
    ctx.fillStyle = k % 2 ? colors[0] : colors[2];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.5, -r * 0.65, -r * 0.35, -r, 0, -r * 1.12);
    ctx.bezierCurveTo(r * 0.35, -r, r * 0.5, -r * 0.65, 0, 0);
    ctx.fill();
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = r * 0.04;
    ctx.stroke();
    ctx.restore();
  }
  for (const side of [-1, 1])
    for (const t of [0.75, 1.25]) {
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.moveTo(0, r * t);
      ctx.quadraticCurveTo(
        side * r,
        r * (t - 0.65),
        side * r * 0.85,
        r * (t - 0.1),
      );
      ctx.quadraticCurveTo(side * r * 0.4, r * (t + 0.2), 0, r * t);
      ctx.fill();
    }
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors[2];
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function textile(w, h, pillow = false, ivory = false) {
  return canvasTexture(w, h, (c, w, h) => {
    c.fillStyle = ivory ? "#c9b88f" : "#923e32";
    c.fillRect(0, 0, w, h);
    const band = pillow ? 18 : 75;
    for (const [inset, color, line] of [
      [5, "#b8865b", 5],
      [13, "#443b30", 6],
      [24, "#e1d3aa", 9],
      [37, "#6c4d37", 4],
      [band, "#d9c9a0", pillow ? 5 : 43],
      [band + 29, "#463d30", 4],
      [band + 36, "#cdb58a", 6],
    ]) {
      if (pillow) continue;
      c.strokeStyle = color;
      c.lineWidth = line;
      c.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    }
    const margin = pillow ? 20 : band + 65,
      spacing = pillow ? 110 : 83;
    for (let y = margin, row = 0; y < h - margin; y += spacing, row++)
      for (
        let x = margin + ((row % 2) * spacing) / 2;
        x < w - margin;
        x += spacing
      ) {
        const r = pillow ? 23 : 12 + hash(Math.round(x), Math.round(y)) * 3;
        ornament(
          c,
          x,
          y,
          r,
          (row % 2) * Math.PI,
          ivory ? ["#eee1bc", "#6f6947", "#853b32"] : undefined,
        );
      }
    if (!pillow) {
      for (let x = band; x < w - band; x += 45)
        for (const y of [band, h - band])
          ornament(c, x, y, 13, Math.PI / 2, ["#8c3e31", "#565740", "#b99a68"]);
      for (let y = band + 35; y < h - band; y += 45)
        for (const x of [band, w - band])
          ornament(c, x, y, 13, 0, ["#8c3e31", "#565740", "#b99a68"]);
      c.strokeStyle = "#826844";
      c.lineWidth = 1.4;
      for (const y of [band, h - band]) {
        c.beginPath();
        c.moveTo(band, y);
        for (let x = band; x < w - band; x += 4)
          c.lineTo(x, y + Math.sin(x / 14) * 14);
        c.stroke();
      }
    }
    // Yarn, small dye variation, and individual horizontal weft lines.
    const data = c.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4,
          noise =
            (hash(x, y) - 0.5) * 16 +
            (y % 3 === 0 ? -6 : 1) +
            (x % 4 === 0 ? -3 : 0);
        for (let channel = 0; channel < 3; channel++)
          data.data[k + channel] += noise;
      }
    c.putImageData(data, 0, 0);
  });
}
export function createLivingMaterials() {
  const weave = canvasTexture(256, 256, (c, w, h) => {
    const data = c.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4,
          value =
            235 +
            (hash(x, y) - 0.5) * 13 +
            (x % 3 === 0 ? -9 : 0) +
            (y % 3 === 0 ? -7 : 0);
        data.data.set([value, value, value, 255], k);
      }
    c.putImageData(data, 0, 0);
  });
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(6, 6);
  const wood = canvasTexture(512, 512, (c, w, h) => {
    const data = c.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const warp = x + 4 * Math.sin(y / 70) + 2 * Math.sin(y / 23 + x / 90),
          grain =
            5 * Math.sin(warp * 0.31) +
            3 * Math.sin(warp * 1.3) +
            (hash(x, y) - 0.5) * 8;
        data.data.set(
          [83 + grain, 50 + grain * 0.7, 29 + grain * 0.4, 255],
          (y * w + x) * 4,
        );
      }
    c.putImageData(data, 0, 0);
  });
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  const redPattern = textile(512, 512, true),
    ivoryPattern = textile(512, 512, true, true);
  for (const pattern of [redPattern, ivoryPattern]) {
    pattern.wrapS = pattern.wrapT = THREE.RepeatWrapping;
    pattern.repeat.set(3, 2);
  }
  const standard = (color, roughness = 0.8, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  return {
    cream: new THREE.MeshPhysicalMaterial({
      color: "#f5eddb",
      map: weave,
      roughness: 0.93,
      sheen: 0.5,
      sheenColor: new THREE.Color("#eae0ca"),
      sheenRoughness: 0.85,
    }),
    piping: standard("#d6c6a7"),
    red: standard("#ffffff", 0.95, { map: redPattern }),
    ivory: standard("#ffffff", 0.95, { map: ivoryPattern }),
    rug: standard("#ffffff", 0.98, { map: textile(1536, 1050) }),
    fringe: standard("#bda47c", 1),
    wood: new THREE.MeshPhysicalMaterial({
      map: wood,
      roughness: 0.5,
      clearcoat: 0.08,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.35,
    }),
    brass: standard("#ae8c4e", 0.42, { metalness: 0.65 }),
    ceramic: standard("#c8bca0", 0.38),
    shade: standard("#f2e4c8", 0.94, {
      side: THREE.DoubleSide,
      emissive: "#ffd49c",
      emissiveIntensity: 0,
    }),
    leaf: standard("#526039", 0.85, { side: THREE.DoubleSide }),
    flower: standard("#a54b35", 0.9),
    page: standard("#b6a78c", 0.95),
  };
}
function piping(parent, w, h, z, mat) {
  const points = [],
    r = 0.055;
  for (const [cx, cy, start] of [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, 90],
    [-w / 2 + r, -h / 2 + r, 180],
    [w / 2 - r, -h / 2 + r, 270],
  ])
    for (let i = 0; i <= 5; i++) {
      const a = ((start + i * 18) * Math.PI) / 180;
      points.push(
        new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), z),
      );
    }
  points.push(points[0].clone());
  return add(
    parent,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      80,
      0.0024,
      4,
      false,
    ),
    mat,
  );
}
function pillow(parent, x, y, z, mat, seam, tilt = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.set(-0.2, 0, tilt);
  parent.add(group);
  const geo = new THREE.SphereGeometry(1, 24, 16),
    p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const puff = (a, power) => Math.sign(a) * Math.pow(Math.abs(a), power);
    const px = puff(p.getX(i), 0.48) * 0.225,
      py = puff(p.getY(i), 0.48) * 0.22,
      pz = puff(p.getZ(i), 0.7) * 0.083;
    p.setXYZ(i, px, py, pz);
  }
  geo.computeVertexNormals();
  add(group, geo, mat);
  piping(group, 0.44, 0.43, 0, seam);
}
export function buildSofa(item, m) {
  const g = new THREE.Group(),
    w = item.width,
    d = item.depth;
  // Dark timber plinth and turned feet, rather than an upholstered floor block.
  box(g, w - 0.04, 0.085, d - 0.045, 0, 0.155, 0, m.wood, 0.014);
  for (const x of [-w / 2 + 0.13, w / 2 - 0.13])
    for (const z of [-d / 2 + 0.12, d / 2 - 0.12])
      lathe(
        g,
        [
          [0.028, 0],
          [0.034, 0.025],
          [0.025, 0.055],
          [0.045, 0.1],
          [0.035, 0.15],
        ],
        m.wood,
        x,
        0,
        z,
        20,
      );
  box(g, w - 0.06, 0.19, d - 0.07, 0, 0.29, 0, m.cream, 0.055);
  box(g, w - 0.12, 0.46, 0.21, 0, 0.66, -d / 2 + 0.115, m.cream, 0.065);
  for (const side of [-1, 1])
    box(g, 0.2, 0.37, d - 0.01, side * (w / 2 - 0.1), 0.475, 0, m.cream, 0.055);
  const count = item.width < 2.4 ? 2 : 3,
    seatWidth = (w - 0.42) / count;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * seatWidth;
    box(g, seatWidth - 0.012, 0.15, 0.69, x, 0.438, 0.062, m.cream, 0.045);
    const back = box(
      g,
      seatWidth - 0.02,
      0.4,
      0.17,
      x,
      0.678,
      -0.285,
      m.cream,
      0.055,
    );
    back.rotation.x = -0.08;
  }
  pillow(g, -w / 2 + 0.4, 0.68, -0.115, m.red, m.piping, -0.14);
  pillow(g, -0.12, 0.67, -0.1, m.ivory, m.piping, 0.08);
  pillow(g, w / 2 - 0.4, 0.68, -0.115, m.red, m.piping, 0.13);
  return g;
}
export function buildTable(item, m, side = false) {
  const g = new THREE.Group(),
    { width: w, depth: d, height: h } = item;
  box(g, w, 0.032, d, 0, h - 0.016, 0, m.wood, 0.009);
  box(g, w - 0.035, 0.018, d - 0.035, 0, h - 0.044, 0, m.wood, 0.004);
  box(g, w - 0.12, 0.085, d - 0.12, 0, h - 0.09, 0, m.wood, 0.006);
  box(g, w - 0.12, 0.026, d - 0.12, 0, 0.112, 0, m.wood, 0.004);
  for (const x of [-w / 2 + 0.075, w / 2 - 0.075])
    for (const z of [-d / 2 + 0.075, d / 2 - 0.075]) {
      lathe(
        g,
        [
          [0.025, 0],
          [0.035, 0.018],
          [0.028, 0.05],
          [0.025, 0.1],
          [0.047, h * 0.43],
          [0.05, h * 0.52],
          [0.034, h * 0.65],
          [0.043, h - 0.05],
        ],
        m.wood,
        x,
        0,
        z,
        24,
      );
      // Fine vertical fluting on the widest part of the turned legs.
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5;
        rod(
          g,
          [x + 0.045 * Math.cos(a), h * 0.38, z + 0.045 * Math.sin(a)],
          [x + 0.044 * Math.cos(a), h * 0.57, z + 0.044 * Math.sin(a)],
          0.002,
          m.wood,
        );
      }
    }
  // Quiet brass inlay follows the timber top, echoing the carved walnut kitchen.
  for (const z of [-d / 2 + 0.032, d / 2 - 0.032])
    box(g, w - 0.064, 0.0015, 0.0018, 0, h + 0.0008, z, m.brass);
  for (const x of [-w / 2 + 0.032, w / 2 - 0.032])
    box(g, 0.0018, 0.0015, d - 0.064, x, h + 0.0008, 0, m.brass);
  if (!side) {
    for (let i = 0; i < 3; i++) {
      const book = new THREE.Group();
      book.position.set(-0.2, 0.135 + i * 0.035, 0.01);
      book.rotation.y = (i - 1) * 0.08;
      g.add(book);
      box(book, 0.27, 0.028, 0.19, 0, 0.014, 0, m.page, 0.001);
      for (const y of [0, 0.031])
        box(book, 0.28, 0.003, 0.2, 0, y, 0, m.wood, 0.001);
    }
    const trayY = h + 0.014;
    box(g, 0.52, 0.012, 0.34, 0.08, trayY, 0, m.brass, 0.004);
    for (const z of [-0.17, 0.17])
      box(g, 0.52, 0.025, 0.008, 0.08, trayY + 0.016, z, m.brass, 0.002);
    for (const x of [-0.18, 0.34])
      box(g, 0.008, 0.025, 0.34, x, trayY + 0.016, 0, m.brass, 0.002);
    lathe(
      g,
      [
        [0.055, 0],
        [0.07, 0.025],
        [0.068, 0.12],
        [0.035, 0.17],
        [0.033, 0.185],
      ],
      m.ceramic,
      0.04,
      h + 0.022,
      0,
    );
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        top = [
          0.04 + Math.sin(a) * 0.16,
          h + 0.31 + (i % 3) * 0.055,
          Math.cos(a) * 0.12,
        ];
      rod(g, [0.04, h + 0.13, 0], top, 0.0027, m.leaf);
      for (let j = 0; j < 2; j++) {
        const leaf = add(
          g,
          new THREE.SphereGeometry(1, 8, 6),
          m.leaf,
          top[0] * 0.7,
          h + 0.2 + j * 0.055,
          top[2] * 0.7,
        );
        leaf.scale.set(0.019, 0.065, 0.003);
        leaf.rotation.z = a + j * 0.7;
      }
      for (let j = 0; j < 5; j++) {
        const p = (j * Math.PI * 2) / 5;
        const petal = add(
          g,
          new THREE.SphereGeometry(1, 8, 6),
          m.flower,
          top[0] + 0.013 * Math.cos(p),
          top[1],
          top[2] + 0.013 * Math.sin(p),
        );
        petal.scale.set(0.018, 0.012, 0.018);
      }
    }
  }
  return g;
}
export function buildLamp(m, baseHeight) {
  const g = new THREE.Group();
  lathe(
    g,
    [
      [0.075, 0],
      [0.085, 0.025],
      [0.07, 0.055],
      [0.11, 0.13],
      [0.105, 0.21],
      [0.06, 0.29],
      [0.042, 0.32],
    ],
    m.ceramic,
    0,
    baseHeight,
    0,
  );
  lathe(
    g,
    [
      [0.078, 0],
      [0.082, 0.014],
      [0.078, 0.02],
    ],
    m.brass,
    0,
    baseHeight - 0.003,
    0,
  );
  rod(g, [0, baseHeight + 0.3, 0], [0, baseHeight + 0.64, 0], 0.006, m.brass);
  add(
    g,
    new THREE.CylinderGeometry(0.15, 0.19, 0.26, 48, 1, true),
    m.shade,
    0,
    baseHeight + 0.51,
    0,
  );
  for (const [radius, y] of [
    [0.15, baseHeight + 0.64],
    [0.19, baseHeight + 0.38],
  ]) {
    const rim = add(
      g,
      new THREE.TorusGeometry(radius, 0.002, 5, 48),
      m.piping,
      0,
      y,
      0,
    );
    rim.rotation.x = Math.PI / 2;
  }
  lathe(
    g,
    [
      [0.008, 0],
      [0.012, 0.01],
      [0.008, 0.025],
    ],
    m.brass,
    0,
    baseHeight + 0.64,
    0,
  );
  return g;
}
export function buildRug(item, m) {
  const g = new THREE.Group();
  box(g, item.width, 0.009, item.depth, 0, 0.0045, 0, m.fringe, 0.004);
  const top = add(
    g,
    new THREE.PlaneGeometry(item.width - 0.018, item.depth - 0.018),
    m.rug,
    0,
    0.0095,
    0,
  );
  top.rotation.x = -Math.PI / 2;
  top.castShadow = false;
  for (const side of [-1, 1])
    for (let i = 0; i < 130; i++) {
      const z = -item.depth / 2 + 0.015 + ((item.depth - 0.03) * i) / 129;
      rod(
        g,
        [side * (item.width / 2 - 0.006), 0.004, z],
        [
          side * (item.width / 2 + 0.035 + hash(i, 2) * 0.013),
          0.003,
          z + 0.002,
        ],
        0.0012,
        m.fringe,
      );
    }
  return g;
}
