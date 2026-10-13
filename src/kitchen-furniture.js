import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * Reusable kitchen fittings, in metres. Floor-standing pieces have Y=0 at the
 * finished floor, X across their width, and +Z facing the aisle. The island's
 * long axis is Z; its stools / overhang are on -X and its drawers face +X.
 * Shelves use their centre as origin. Sink origin is the countertop surface.
 * Lantern origin is the ceiling attachment and the fitting extends downwards.
 * No walls, lights, collision volumes or baked UVs are created here.
 */

const mesh = (parent, geometry, material, x = 0, y = 0, z = 0, name = "") => {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = item.receiveShadow = true;
  item.name = name;
  parent.add(item);
  return item;
};

function box(parent, w, h, d, x, y, z, material, radius = 0, name = "") {
  const geometry = radius
    ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 4, h / 4, d / 4))
    : new THREE.BoxGeometry(w, h, d);
  // Dimensioned grain coordinates avoid one stretched texture per cabinet.
  const pos = geometry.attributes.position,
    normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(normal.getX(i)),
      ny = Math.abs(normal.getY(i));
    if (ny > 0.7) uv.setXY(i, pos.getX(i) + x, pos.getZ(i) + z);
    else if (nx > 0.7) uv.setXY(i, pos.getZ(i) + z, pos.getY(i) + y);
    else uv.setXY(i, pos.getX(i) + x, pos.getY(i) + y);
  }
  return mesh(parent, geometry, material, x, y, z, name);
}

function rod(parent, from, to, radius, material, sides = 8) {
  const a = new THREE.Vector3(...from),
    b = new THREE.Vector3(...to);
  const delta = b.clone().sub(a);
  const item = mesh(
    parent,
    new THREE.CylinderGeometry(radius, radius, delta.length(), sides),
    material,
  );
  item.position.copy(a.add(b).multiplyScalar(0.5));
  item.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return item;
}

function texture(painter, size = 512, color = true) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d"),
    data = context.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const rgba = painter(x / size, y / size, x, y);
      const k = 4 * (y * size + x);
      data.data[k] = rgba[0];
      data.data[k + 1] = rgba[1];
      data.data[k + 2] = rgba[2];
      data.data[k + 3] = 255;
    }
  context.putImageData(data, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.anisotropy = 8;
  return map;
}

const hash = (x, y) => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

function grainNoise(x, y, periodX, periodY) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const h = (a, b) =>
    hash(
      ((a % periodX) + periodX) % periodX,
      ((b % periodY) + periodY) % periodY,
    );
  return (
    THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(h(ix, iy), h(ix + 1, iy), sx),
      THREE.MathUtils.lerp(h(ix, iy + 1), h(ix + 1, iy + 1), sx),
      sy,
    ) *
      2 -
    1
  );
}

export function createKitchenMaterials() {
  // Irregular fine fibres, changing slowly along the board. Periodic value
  // noise keeps the texture seamless without obvious evenly spaced stripes.
  const grain = (u, v) => {
    const warp =
      u * 96 +
      1.4 * grainNoise(u * 7, v * 2, 7, 2) +
      0.45 * grainNoise(u * 17, v * 5, 17, 5);
    return (
      0.54 * grainNoise(warp, v * 5, 96, 5) +
      0.25 * grainNoise(u * 192, v * 13, 192, 13) +
      0.21 * grainNoise(u * 8, v * 2, 8, 2)
    );
  };
  const walnutMap = texture((u, v, x, y) => {
    const g = grain(u, v),
      pore = Math.pow(hash(x, y), 14) * 13;
    return [
      104 + g * 10 - pore * 0.6,
      76 + g * 7 - pore * 0.45,
      51 + g * 5 - pore * 0.3,
    ];
  });
  const walnutBump = texture(
    (u, v) => {
      const g = 128 + grain(u, v) * 30;
      return [g, g, g];
    },
    256,
    false,
  );
  const stoneMap = texture((u, v, x, y) => {
    const cloud =
      2.9 * Math.sin(u * Math.PI * 8 + Math.sin(v * Math.PI * 4)) +
      1.8 * Math.sin(v * Math.PI * 10 + Math.cos(u * Math.PI * 6));
    const speck = (hash(x, y) - 0.5) * 6;
    return [204 + cloud + speck, 186 + cloud + speck, 158 + cloud + speck];
  });
  const wood = new THREE.MeshPhysicalMaterial({
    map: walnutMap,
    bumpMap: walnutBump,
    bumpScale: 0.0001,
    roughness: 0.38,
    clearcoat: 0.16,
    clearcoatRoughness: 0.33,
  });
  const carved = wood.clone();
  carved.color.setRGB(1.12, 1.07, 1.01);
  carved.roughness = 0.43;
  // Tiny carved faces can have degenerate screen derivatives in a reflection
  // probe. Fall back to the surface normal instead of letting normalize(0)
  // contaminate the filtered room reflection with NaNs.
  for (const material of [wood, carved]) {
    material.onBeforeCompile = (shader) => {
      const safeBump = THREE.ShaderChunk.bumpmap_pars_fragment
        .replace(
          "vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );",
          `vec3 dx = dFdx( surf_pos.xyz ), dy = dFdy( surf_pos.xyz );
          if (dot(dx, dx) < 1e-12 || dot(dy, dy) < 1e-12) return surf_norm;
          vec3 vSigmaX = normalize(dx);`,
        )
        .replace(
          "vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );",
          "vec3 vSigmaY = normalize(dy);",
        )
        .replace(
          "return normalize( abs( fDet ) * surf_norm - vGrad );",
          `vec3 perturbed = abs(fDet) * surf_norm - vGrad;
          if (dot(perturbed, perturbed) < 1e-12) return surf_norm;
          return normalize(perturbed);`,
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <bumpmap_pars_fragment>",
        safeBump,
      );
    };
    material.customProgramCacheKey = () => "walnut-safe-bump-v1";
  }
  const interior = new THREE.MeshStandardMaterial({
    color: "#4b2d1b",
    map: walnutMap,
    roughness: 0.6,
  });
  const recess = new THREE.MeshStandardMaterial({
    color: "#3b2a1c",
    roughness: 0.85,
  });
  const stone = new THREE.MeshPhysicalMaterial({
    map: stoneMap,
    roughness: 0.32,
    clearcoat: 0.12,
    clearcoatRoughness: 0.24,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#937044",
    metalness: 0.8,
    roughness: 0.34,
  });
  const black = new THREE.MeshStandardMaterial({
    color: "#1b1b18",
    metalness: 0.28,
    roughness: 0.55,
  });
  const ceramic = new THREE.MeshPhysicalMaterial({
    color: "#ded5c1",
    roughness: 0.22,
    clearcoat: 0.3,
  });
  const woven = new THREE.MeshStandardMaterial({
    color: "#947044",
    roughness: 0.85,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: "#fff1ce",
    emissive: "#ffbb70",
    emissiveIntensity: 1.6,
    roughness: 0.32,
  });
  const amber = new THREE.MeshPhysicalMaterial({
    color: "#d5ae6a",
    transparent: true,
    opacity: 0.14,
    roughness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return {
    wood,
    carved,
    interior,
    recess,
    stone,
    brass,
    black,
    ceramic,
    woven,
    glow,
    amber,
  };
}

function pull(parent, x, y, z, width, m) {
  const span = Math.min(0.15, width * 0.32);
  for (const side of [-1, 1]) {
    rod(
      parent,
      [x + (side * span) / 2, y, z],
      [x + (side * span) / 2, y, z + 0.027],
      0.0045,
      m.brass,
    );
    const escutcheon = mesh(
      parent,
      new THREE.CylinderGeometry(0.009, 0.009, 0.0025, 12),
      m.brass,
      x + (side * span) / 2,
      y,
      z,
    );
    escutcheon.rotation.x = Math.PI / 2;
  }
  rod(
    parent,
    [x - span / 2, y, z + 0.027],
    [x + span / 2, y, z + 0.027],
    0.005,
    m.brass,
  );
}

function starShape(radius, hole = false) {
  const shape = hole ? new THREE.Path() : new THREE.Shape();
  for (let i = 0; i <= 16; i++) {
    const theta = (i / 16) * Math.PI * 2 + Math.PI / 8;
    const r = radius * (i % 2 ? 0.46 : 1);
    if (!i) shape.moveTo(Math.cos(theta) * r, Math.sin(theta) * r);
    else shape.lineTo(Math.cos(theta) * r, Math.sin(theta) * r);
  }
  return shape;
}

/** Geometric walnut relief: real inset eight-point stars and connecting ribs. */
export function buildCarvedPanel(
  { width, height, depth = 0.018, pattern = true },
  m,
) {
  const group = new THREE.Group();
  group.name = "Carved walnut panel";
  box(group, width, height, depth, 0, 0, 0, m.wood, 0.002);
  const border = Math.min(0.045, width * 0.1, height * 0.13);
  box(
    group,
    width - border * 2,
    height - border * 2,
    0.009,
    0,
    0,
    depth / 2 + 0.003,
    m.recess,
  );
  for (const x of [-1, 1])
    box(
      group,
      border,
      height,
      0.019,
      (x * (width - border)) / 2,
      0,
      depth / 2 + 0.005,
      m.wood,
      0.003,
    );
  for (const y of [-1, 1])
    box(
      group,
      width - border * 2,
      border,
      0.019,
      0,
      (y * (height - border)) / 2,
      depth / 2 + 0.005,
      m.wood,
      0.003,
    );
  // Thin stepped inner moulding catches light without an exaggerated outline.
  for (const x of [-1, 1])
    box(
      group,
      0.008,
      height - 2 * border,
      0.009,
      x * (width / 2 - border - 0.004),
      0,
      depth / 2 + 0.013,
      m.carved,
      0.0015,
    );
  for (const y of [-1, 1])
    box(
      group,
      width - 2 * border,
      0.008,
      0.009,
      0,
      y * (height / 2 - border - 0.004),
      depth / 2 + 0.013,
      m.carved,
      0.0015,
    );
  if (!pattern) {
    box(
      group,
      width - border * 2 - 0.024,
      height - border * 2 - 0.024,
      0.012,
      0,
      0,
      depth / 2 + 0.008,
      m.wood,
      0.006,
    );
    return group;
  }
  const iw = width - border * 2 - 0.028,
    ih = height - border * 2 - 0.028;
  const columns = Math.max(1, Math.round(iw / 0.16)),
    rows = Math.max(1, Math.round(ih / 0.16));
  const dx = iw / columns,
    dy = ih / rows,
    radius = Math.min(dx, dy) * 0.49;
  const shape = starShape(radius);
  shape.holes.push(starShape(radius * 0.76, true));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.009,
    bevelEnabled: false,
    curveSegments: 1,
  });
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const x = -iw / 2 + dx * (col + 0.5),
        y = -ih / 2 + dy * (row + 0.5),
        z = depth / 2 + 0.01;
      mesh(group, geo, m.carved, x, y, z);
      if (col < columns - 1)
        box(
          group,
          dx - radius * 1.45,
          0.009,
          0.008,
          x + dx / 2,
          y,
          z + 0.004,
          m.carved,
        );
      if (row < rows - 1)
        box(
          group,
          0.009,
          dy - radius * 1.45,
          0.008,
          x,
          y + dy / 2,
          z + 0.004,
          m.carved,
        );
    }
  return group;
}

function drawer(parent, width, height, depth, x, y, z, m) {
  const group = new THREE.Group();
  group.name = "Deep storage drawer";
  group.position.set(x, y, z);
  const face = buildCarvedPanel({ width, height, pattern: false }, m);
  group.add(face);
  // Actual storage box behind its front; accessible if an owner adds a preview
  // interaction. Closed fittings retain the requested view-only walkthrough.
  const innerW = width - 0.055,
    innerH = Math.max(0.05, height - 0.065);
  box(
    group,
    innerW,
    0.013,
    depth,
    0,
    -height / 2 + 0.025,
    -depth / 2,
    m.interior,
  );
  for (const side of [-1, 1])
    box(
      group,
      0.013,
      innerH,
      depth,
      (side * innerW) / 2,
      -0.008,
      -depth / 2,
      m.interior,
    );
  box(group, innerW, innerH, 0.013, 0, -0.008, -depth + 0.008, m.interior);
  pull(group, 0, height / 2 - 0.055, 0.035, width, m);
  group.userData.drawer = { closedZ: z, travel: Math.min(depth * 0.85, 0.43) };
  parent.add(group);
  return group;
}

function roundedRect(width, depth, radius = 0.04) {
  const x = -width / 2,
    y = -depth / 2,
    s = new THREE.Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + depth - radius);
  s.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  s.lineTo(x + radius, y + depth);
  s.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

export function buildCountertop(
  { width, depth, thickness = 0.025, sink = false },
  m,
) {
  const group = new THREE.Group();
  group.name = "Warm limestone countertop";
  if (!sink) {
    box(group, width, thickness, depth, 0, -thickness / 2, 0, m.stone, 0.003);
  } else {
    // Allow for the 1.5 mm bevel inside the allocated module footprint.
    const shape = roundedRect(width - 0.003, depth - 0.003, 0.004);
    const cutout = roundedRect(sink.width ?? 0.71, sink.depth ?? 0.41, 0.038);
    shape.holes.push(new THREE.Path(cutout.getPoints(10)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSize: 0.0015,
      bevelThickness: 0.001,
      bevelSegments: 1,
      steps: 1,
      curveSegments: 10,
    });
    geo.rotateX(Math.PI / 2);
    mesh(group, geo, m.stone, 0, -0.001, 0);
  }
  return group;
}

/** An inset 75 cm sink and a matte-black arched mixer; Y=0 is counter level. */
export function buildSink({ width = 0.75, depth = 0.46 } = {}, m) {
  const group = new THREE.Group();
  group.name = "Inset sink and matte black mixer";
  const outer = roundedRect(width, depth, 0.045);
  outer.holes.push(
    new THREE.Path(
      roundedRect(width - 0.035, depth - 0.035, 0.038).getPoints(12),
    ),
  );
  const rim = new THREE.ExtrudeGeometry(outer, {
    depth: 0.008,
    bevelEnabled: true,
    bevelSize: 0.002,
    bevelThickness: 0.001,
    bevelSegments: 1,
    curveSegments: 10,
  });
  rim.rotateX(Math.PI / 2);
  mesh(group, rim, m.ceramic, 0, 0.003, 0);
  const top = roundedRect(width - 0.034, depth - 0.034, 0.038)
    .getSpacedPoints(64)
    .slice(0, -1);
  const bottom = roundedRect(width - 0.09, depth - 0.09, 0.055)
    .getSpacedPoints(64)
    .slice(0, -1);
  const positions = [],
    uv = [],
    indices = [];
  for (const [points, y] of [
    [top, -0.004],
    [bottom, -0.185],
  ])
    for (const p of points) {
      positions.push(p.x, y, p.y);
      uv.push(p.x, p.y);
    }
  for (let i = 0; i < 64; i++) {
    const next = (i + 1) % 64;
    indices.push(i, i + 64, next, next, i + 64, next + 64);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  mesh(group, geo, m.ceramic);
  const bottomGeo = new THREE.ShapeGeometry(
    roundedRect(width - 0.087, depth - 0.087, 0.055),
    12,
  );
  bottomGeo.rotateX(-Math.PI / 2);
  mesh(group, bottomGeo, m.ceramic, 0, -0.185, 0);
  mesh(
    group,
    new THREE.CylinderGeometry(0.023, 0.023, 0.003, 24),
    m.brass,
    0,
    -0.182,
    0.045,
  );
  mesh(
    group,
    new THREE.CylinderGeometry(0.015, 0.015, 0.004, 20),
    m.black,
    0,
    -0.18,
    0.045,
  );
  const back = -depth / 2 - 0.031;
  mesh(
    group,
    new THREE.CylinderGeometry(0.022, 0.023, 0.014, 24),
    m.black,
    0,
    0.007,
    back,
  );
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.01, back),
    new THREE.Vector3(0, 0.24, back),
    new THREE.Vector3(0, 0.34, back + 0.09),
    new THREE.Vector3(0, 0.3, back + 0.19),
    new THREE.Vector3(0, 0.23, back + 0.19),
  ]);
  mesh(group, new THREE.TubeGeometry(path, 32, 0.013, 10, false), m.black);
  rod(group, [0.022, 0.05, back], [0.065, 0.095, back], 0.009, m.black, 12);
  group.userData.dimensions = { width, depth, basinDepth: 0.185 };
  return group;
}

export function buildBaseCabinet(
  {
    width,
    depth = 0.6,
    height = 0.9,
    drawers = false,
    sink = false,
    countertop = true,
    carved = true,
  },
  m,
) {
  const group = new THREE.Group();
  group.name = sink
    ? "Sink cabinet"
    : drawers
      ? "Drawer cabinet"
      : "Walnut base cabinet";
  // The nominated depth includes the pulls. The stone's leading edge covers
  // the fronts and hardware; adjoining modules never grow beyond their width.
  const carcassTop = height - 0.025,
    bottom = 0.105,
    front = depth / 2 - 0.067;
  box(group, width - 0.025, 0.095, depth - 0.1, 0, 0.0475, -0.035, m.recess);
  for (const side of [-1, 1])
    box(
      group,
      0.018,
      carcassTop - bottom,
      depth - 0.075,
      side * (width / 2 - 0.009),
      (carcassTop + bottom) / 2,
      -0.0375,
      m.wood,
    );
  box(group, width - 0.036, 0.018, depth - 0.075, 0, bottom, -0.0375, m.wood);
  box(
    group,
    width - 0.036,
    carcassTop - bottom,
    0.014,
    0,
    (carcassTop + bottom) / 2,
    -depth / 2 + 0.007,
    m.interior,
  );
  const faceHeight = carcassTop - bottom - 0.012;
  if (drawers && !sink) {
    const heights = [0.16, (faceHeight - 0.178) / 2, (faceHeight - 0.178) / 2];
    let top = carcassTop - 0.006;
    for (const h of heights) {
      drawer(group, width - 0.008, h, depth - 0.1, 0, top - h / 2, front, m);
      top -= h + 0.006;
    }
  } else {
    const doorCount = width > 0.65 ? 2 : 1,
      doorWidth = (width - 0.008) / doorCount - 0.003;
    for (let i = 0; i < doorCount; i++) {
      const x = (i - (doorCount - 1) / 2) * (doorWidth + 0.006);
      const panel = buildCarvedPanel(
        { width: doorWidth, height: faceHeight, pattern: carved },
        m,
      );
      panel.position.set(x, bottom + faceHeight / 2, front);
      group.add(panel);
      pull(group, x, carcassTop - 0.07, front + 0.035, doorWidth, m);
    }
  }
  if (countertop) {
    const top = buildCountertop(
      { width, depth, sink: sink ? { width: 0.716, depth: 0.426 } : false },
      m,
    );
    top.position.y = height;
    group.add(top);
  }
  if (sink) {
    const fitting = buildSink(typeof sink === "object" ? sink : {}, m);
    fitting.position.y = height;
    group.add(fitting);
  }
  group.userData.dimensions = {
    width,
    depth,
    height,
    countertopThickness: 0.025,
  };
  return group;
}

/** L-return blind corner: the inaccessible end has a fixed blank front;
 * two <=45 cm doors open only on the accessible 90 cm of frontage. */
export function buildBlindCorner(
  {
    width,
    depth = 0.6,
    height = 0.9,
    accessWidth = 0.9,
    blindSide = "negativeX",
  },
  m,
) {
  const group = new THREE.Group();
  group.name = "Walnut blind-corner cabinet";
  const topY = height - 0.025,
    bottomY = 0.105,
    front = depth / 2 - 0.067;
  const usableWidth = Math.min(accessWidth, width),
    blindWidth = width - usableWidth;
  const sign = blindSide === "negativeX" ? 1 : -1;
  const accessCenter = (sign * (width - usableWidth)) / 2;
  box(group, width - 0.025, 0.095, depth - 0.1, 0, 0.0475, -0.035, m.recess);
  for (const side of [-1, 1])
    box(
      group,
      0.018,
      topY - bottomY,
      depth - 0.075,
      side * (width / 2 - 0.009),
      (topY + bottomY) / 2,
      -0.0375,
      m.wood,
    );
  for (const y of [bottomY, 0.46])
    box(group, width - 0.036, 0.018, depth - 0.075, 0, y, -0.0375, m.interior);
  box(
    group,
    width - 0.036,
    topY - bottomY,
    0.014,
    0,
    (topY + bottomY) / 2,
    -depth / 2 + 0.007,
    m.interior,
  );
  const faceHeight = topY - bottomY - 0.012;
  if (blindWidth > 0.01) {
    const blank = buildCarvedPanel(
      { width: blindWidth - 0.006, height: faceHeight, pattern: false },
      m,
    );
    blank.name = "Fixed blind-corner front";
    blank.position.set(
      (-sign * usableWidth) / 2,
      bottomY + faceHeight / 2,
      front,
    );
    group.add(blank);
  }
  const leafWidth = (usableWidth - 0.014) / 2;
  for (const side of [-1, 1]) {
    const x = accessCenter + (side * (leafWidth + 0.006)) / 2;
    const leaf = buildCarvedPanel({ width: leafWidth, height: faceHeight }, m);
    leaf.name = "Blind-corner accessible door";
    leaf.position.set(x, bottomY + faceHeight / 2, front);
    leaf.userData.hingeSide = side < 0 ? "left" : "right";
    group.add(leaf);
    pull(group, x, topY - 0.07, front + 0.035, leafWidth, m);
  }
  const top = buildCountertop({ width, depth }, m);
  top.position.y = height;
  group.add(top);
  group.userData.dimensions = {
    width,
    depth,
    height,
    accessWidth: usableWidth,
    blindWidth,
    countertopThickness: 0.025,
  };
  return group;
}

export function buildTower({ width = 0.6, depth = 0.6, height = 2.3 } = {}, m) {
  const group = new THREE.Group();
  group.name = "Tall walnut pantry";
  box(
    group,
    width,
    height - 0.08,
    depth - 0.075,
    0,
    height / 2 + 0.04,
    -0.0375,
    m.wood,
  );
  box(group, width - 0.035, 0.08, depth - 0.1, 0, 0.04, -0.035, m.recess);
  const split = height - 0.48,
    front = depth / 2 - 0.067;
  for (const [bottom, top, pattern] of [
    [0.09, split - 0.007, false],
    [split, height - 0.045, true],
  ]) {
    const panel = buildCarvedPanel(
      { width: width - 0.012, height: top - bottom, pattern },
      m,
    );
    panel.position.set(0, (top + bottom) / 2, front);
    group.add(panel);
  }
  rod(
    group,
    [width * 0.29, 1.02, front + 0.05],
    [width * 0.29, 1.26, front + 0.05],
    0.0055,
    m.brass,
  );
  for (const y of [1.02, 1.26])
    rod(
      group,
      [width * 0.29, y, front + 0.02],
      [width * 0.29, y, front + 0.05],
      0.004,
      m.brass,
    );
  // Restrained stepped cornice, within the nominated height and footprint.
  box(group, width, 0.023, depth, 0, height - 0.0115, 0, m.wood, 0.003);
  box(
    group,
    width - 0.012,
    0.018,
    depth - 0.012,
    0,
    height - 0.032,
    0,
    m.carved,
    0.002,
  );
  group.userData.dimensions = { width, depth, height };
  return group;
}

export function buildIsland(
  { length = 2.1, width = 0.95, height = 0.9, overhang = 0.28 } = {},
  m,
) {
  const group = new THREE.Group();
  group.name = "Carved walnut kitchen island";
  const seatFace = -width / 2 + overhang,
    workFace = width / 2 - 0.067;
  const shellLeft = seatFace + 0.035,
    shellRight = workFace - 0.003;
  const shellWidth = shellRight - shellLeft,
    shellX = (shellRight + shellLeft) / 2;
  const baseWidth = width - overhang - 0.025,
    baseX = (overhang - 0.025) / 2,
    topY = height - 0.025;
  box(
    group,
    shellWidth - 0.02,
    0.075,
    length - 0.12,
    shellX,
    0.0375,
    0,
    m.recess,
  );
  box(group, shellWidth, 0.018, length - 0.07, shellX, 0.095, 0, m.wood);
  box(group, shellWidth, 0.018, length - 0.07, shellX, topY - 0.009, 0, m.wood);
  box(
    group,
    0.018,
    topY - 0.095,
    length - 0.07,
    shellLeft + 0.009,
    (topY + 0.095) / 2,
    0,
    m.wood,
  );
  for (const end of [-1, 1])
    box(
      group,
      shellWidth,
      topY - 0.095,
      0.018,
      shellX,
      (topY + 0.095) / 2,
      end * (length / 2 - 0.044),
      m.wood,
    );
  for (const end of [-1, 1]) {
    const panel = buildCarvedPanel(
      { width: baseWidth - 0.016, height: topY - 0.095 },
      m,
    );
    panel.position.set(baseX, (topY + 0.095) / 2, end * (length / 2 - 0.028));
    if (end < 0) panel.rotation.y = Math.PI;
    group.add(panel);
  }
  const seatsPanel = buildCarvedPanel(
    { width: length - 0.1, height: topY - 0.1 },
    m,
  );
  seatsPanel.rotation.y = -Math.PI / 2;
  seatsPanel.position.set(seatFace + 0.028, (topY + 0.1) / 2, 0);
  group.add(seatsPanel);
  // Three 65–70 cm deep-storage banks face the clear working aisle.
  const banks = 3,
    bankWidth = (length - 0.1) / banks;
  for (let i = 0; i < banks; i++) {
    const bank = new THREE.Group();
    bank.rotation.y = Math.PI / 2;
    bank.position.set(workFace, 0, (i - 1) * bankWidth);
    drawer(
      bank,
      bankWidth - 0.008,
      0.18,
      shellWidth - 0.02,
      0,
      topY - 0.1,
      0,
      m,
    );
    drawer(
      bank,
      bankWidth - 0.008,
      topY - 0.305,
      shellWidth - 0.02,
      0,
      (topY - 0.105) / 2,
      0,
      m,
    );
    group.add(bank);
  }
  const top = buildCountertop({ width, depth: length }, m);
  top.position.y = height;
  group.add(top);
  group.userData.dimensions = {
    length,
    width,
    height,
    overhang,
    countertopThickness: 0.025,
  };
  return group;
}

export function buildStool(
  { width = 0.4, depth = 0.4, seatHeight = 0.64 } = {},
  m,
) {
  const group = new THREE.Group();
  group.name = "Walnut and woven rush counter stool";
  const spacing = width / 2 - 0.042;
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const leg = mesh(
        group,
        new THREE.CylinderGeometry(0.022, 0.03, seatHeight - 0.055, 8),
        m.wood,
        x * spacing,
        (seatHeight - 0.055) / 2 + 0.0018,
        z * spacing,
      );
      leg.rotation.z = x * -0.035;
      leg.rotation.x = z * 0.035;
    }
  for (const x of [-1, 1]) {
    box(
      group,
      0.031,
      0.055,
      depth - 0.03,
      x * (width / 2 - 0.016),
      seatHeight - 0.029,
      0,
      m.wood,
      0.004,
    );
    rod(
      group,
      [x * spacing, 0.235, -spacing],
      [x * spacing, 0.235, spacing],
      0.013,
      m.wood,
    );
  }
  for (const z of [-1, 1]) {
    box(
      group,
      width - 0.03,
      0.055,
      0.031,
      0,
      seatHeight - 0.029,
      z * (depth / 2 - 0.016),
      m.wood,
      0.004,
    );
    rod(
      group,
      [-spacing, 0.24, z * spacing],
      [spacing, 0.24, z * spacing],
      0.013,
      m.wood,
    );
  }
  box(
    group,
    width - 0.054,
    0.016,
    depth - 0.054,
    0,
    seatHeight - 0.008,
    0,
    m.woven,
    0.004,
  );
  // Closely spaced actual rush strips read as hand-woven material in silhouette.
  const strands = 18;
  for (let i = 0; i < strands; i++) {
    const offset = (i / (strands - 1) - 0.5) * (width - 0.07);
    box(
      group,
      0.006,
      0.0025,
      depth - 0.066,
      offset,
      seatHeight + 0.0005,
      0,
      m.woven,
    );
    box(
      group,
      width - 0.068,
      0.0025,
      0.006,
      0,
      seatHeight + 0.002,
      offset,
      m.woven,
    );
  }
  group.userData.dimensions = { width, depth, seatHeight };
  return group;
}

export function buildShelf(
  { width = 0.65, depth = 0.25, thickness = 0.035, led = true } = {},
  m,
) {
  const group = new THREE.Group();
  group.name = "Solid walnut shelf";
  box(group, width, thickness, depth, 0, 0, 0, m.wood, 0.003);
  if (led)
    box(
      group,
      width - 0.06,
      0.003,
      0.011,
      0,
      -thickness / 2 - 0.0015,
      depth / 2 - 0.038,
      m.glow,
      0.001,
      "Warm under-shelf LED",
    );
  return group;
}

/** Two modest pottery pieces for each shelf; variant 0 has bowls, 1 a jug.
 * Origin matches buildShelf, so add as a child of its shelf group. */
export function buildShelfDecor(
  { width = 0.65, depth = 0.25, thickness = 0.035, variant = 0 } = {},
  m,
) {
  const group = new THREE.Group();
  group.name = "Traditional shelf pottery";
  const pot = (profile, x, y, material = m.ceramic) =>
    mesh(
      group,
      new THREE.LatheGeometry(
        profile.map(([r, h]) => new THREE.Vector2(r, h)),
        24,
      ),
      material,
      x,
      y,
      0,
    );
  const bowlProfile = [
    [0, 0],
    [0.035, 0],
    [0.043, 0.008],
    [0.056, 0.03],
    [0.065, 0.052],
    [0.064, 0.057],
    [0.06, 0.058],
    [0.054, 0.033],
    [0.036, 0.016],
    [0, 0.014],
  ];
  const spread = Math.min(width * 0.24, 0.46),
    y = thickness / 2;
  pot(bowlProfile, -spread, y);
  if (variant % 2 === 0) {
    pot(bowlProfile, spread, y, m.wood);
  } else {
    pot(
      [
        [0, 0],
        [0.038, 0],
        [0.052, 0.016],
        [0.058, 0.085],
        [0.049, 0.13],
        [0.029, 0.157],
        [0.028, 0.179],
        [0.035, 0.186],
        [0.034, 0.191],
        [0.024, 0.19],
        [0.022, 0.161],
        [0.039, 0.131],
        [0.047, 0.084],
        [0.039, 0.018],
        [0, 0.016],
      ],
      spread,
      y,
    );
    mesh(
      group,
      new THREE.TorusGeometry(0.032, 0.005, 6, 24),
      m.ceramic,
      spread + 0.058,
      y + 0.098,
      0,
    );
  }
  group.userData.dimensions = {
    width: spread * 2 + 0.2,
    depth: Math.min(depth, 0.13),
    height: variant % 2 ? 0.191 : 0.058,
  };
  return group;
}

/** A pierced, octagonal aged-brass lantern with a warm bulb and ceiling cord. */
export function buildLantern(
  { drop = 1.15, height = 0.43, radius = 0.09 } = {},
  m,
) {
  const group = new THREE.Group();
  group.name = "Pierced brass Arabic pendant lantern";
  const centerY = -drop + height / 2,
    bodyBottom = centerY - height * 0.27,
    bodyTop = centerY + height * 0.27;
  mesh(
    group,
    new THREE.CylinderGeometry(0.043, 0.043, 0.014, 24),
    m.black,
    0,
    -0.007,
    0,
  );
  rod(group, [0, -0.014, 0], [0, centerY + height / 2, 0], 0.0021, m.black);
  const profile = [
    [0.012, -height * 0.5],
    [0.018, -height * 0.43],
    [radius * 0.67, -height * 0.33],
    [radius, -height * 0.27],
    [radius, -height * 0.25],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(group, new THREE.LatheGeometry(profile, 16), m.brass, 0, centerY, 0);
  const crown = [
    [radius, height * 0.25],
    [radius, height * 0.28],
    [radius * 0.5, height * 0.37],
    [0.02, height * 0.43],
    [0.013, height * 0.5],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(group, new THREE.LatheGeometry(crown, 16), m.brass, 0, centerY, 0);
  for (const y of [bodyBottom, bodyTop]) {
    const hoop = mesh(
      group,
      new THREE.TorusGeometry(radius, 0.004, 6, 8),
      m.brass,
      0,
      y,
      0,
    );
    hoop.rotation.x = Math.PI / 2;
  }
  const bodyHeight = bodyTop - bodyBottom,
    sides = 8;
  mesh(
    group,
    new THREE.CylinderGeometry(
      radius * 0.93,
      radius * 0.93,
      bodyHeight,
      sides,
      1,
      true,
    ),
    m.amber,
    0,
    centerY,
    0,
  );
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    rod(
      group,
      [Math.sin(angle) * radius, bodyBottom, Math.cos(angle) * radius],
      [Math.sin(angle) * radius, bodyTop, Math.cos(angle) * radius],
      0.003,
      m.brass,
    );
    const panel = new THREE.Group();
    panel.rotation.y = angle + Math.PI / sides;
    const faceZ = radius * Math.cos(Math.PI / sides),
      panelW = radius * 2 * Math.sin(Math.PI / sides);
    // Open diamonds, with an eight-point central rosette in each panel.
    for (let row = 0; row < 3; row++) {
      const y = bodyBottom + (bodyHeight * (row + 0.5)) / 3,
        hx = panelW * 0.43,
        hy = (bodyHeight / 6) * 0.94;
      const points = [
        [0, y + hy, faceZ],
        [hx, y, faceZ],
        [0, y - hy, faceZ],
        [-hx, y, faceZ],
      ];
      for (let j = 0; j < 4; j++)
        rod(panel, points[j], points[(j + 1) % 4], 0.0014, m.brass, 5);
      mesh(panel, new THREE.SphereGeometry(0.003, 6, 4), m.brass, 0, y, faceZ);
    }
    group.add(panel);
  }
  const bulb = mesh(
    group,
    new THREE.SphereGeometry(radius * 0.28, 16, 12),
    m.glow,
    0,
    centerY - 0.014,
    0,
  );
  bulb.scale.y = 1.65;
  bulb.castShadow = false;
  rod(
    group,
    [0, centerY + 0.025, 0],
    [0, bodyTop + 0.02, 0],
    0.01,
    m.brass,
    12,
  );
  group.userData.lightPosition = [0, centerY - 0.015, 0];
  group.userData.dimensions = { drop, height, diameter: radius * 2 };
  return group;
}

/** Optional owner-side fit inspection; does not add an editor to the scene. */
export function setDrawerExtension(root, fraction = 0) {
  const amount = THREE.MathUtils.clamp(fraction, 0, 1);
  root.traverse((part) => {
    if (!part.userData.drawer) return;
    const { closedZ, travel } = part.userData.drawer;
    part.position.z = closedZ + travel * amount;
  });
}
