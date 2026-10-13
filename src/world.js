import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildEnsuite } from "./ensuite.js";
import { ensuiteObstacles } from "./ensuite-layout.js";
import { buildEntrance } from "./entrance.js";
import {
  p,
  HEIGHT,
  footprint,
  balcony,
  walls,
  bathroomFloors,
} from "./plan.js";
import { createPhotoFinishes } from "./finishes.js";
import { createEnvironment } from "./rendering.js";
import { daylightUV, floorBounds, LIGHTMAP_RANGE } from "./daylight-layout.js";
import {
  livingTV,
  skirtingRuns,
  SKIRTING_DEPTH,
  SKIRTING_HEIGHT,
} from "./additions.js";

export async function buildWorld(scene, renderer) {
  const root = new THREE.Group();
  scene.add(root);
  const architecture = new THREE.Group(),
    ceiling = new THREE.Group();
  root.add(architecture, ceiling);
  const obstacles = [...ensuiteObstacles];
  const material = (color, roughness = 0.8, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const finishes = await createPhotoFinishes();
  const daylight = await new THREE.TextureLoader().loadAsync(
    new URL("./assets/daylight.png", import.meta.url).href,
  );
  daylight.channel = 1;
  daylight.generateMipmaps = false;
  daylight.minFilter = THREE.LinearFilter;
  const nightlight = await new THREE.TextureLoader().loadAsync(
    new URL("./assets/nightlight.png", import.meta.url).href,
  );
  nightlight.channel = 1;
  nightlight.generateMipmaps = false;
  nightlight.minFilter = THREE.LinearFilter;
  const lit = (mat) => {
    mat.lightMap = daylight;
    mat.lightMapIntensity = LIGHTMAP_RANGE;
    return mat;
  };
  const dayEnvironment = createEnvironment(renderer);
  const nightEnvironment = createEnvironment(renderer, true);
  const sky = dayEnvironment.sky;
  scene.environment = dayEnvironment.environment;
  scene.environmentIntensity = 0.08;
  const plaster = lit(finishes.plaster),
    trim = lit(material("#f3f3ef", 0.65)),
    stone = material("#d1d2cf"),
    floorMaterial = finishes.floor,
    metal = material("#171b1e", 0.42, { metalness: 0.35 });
  for (const mat of Object.values(finishes)) lit(mat);
  const livingFloorMaterial = floorMaterial.clone();
  const skirtingMaterial = floorMaterial.clone();
  const tvScreen = new THREE.MeshPhysicalMaterial({
    color: "#030508",
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.5,
  });
  const glass = material("#dce7ed", 0.07, {
    transparent: true,
    opacity: 0.045,
    metalness: 0.05,
    envMapIntensity: 0.5,
    depthWrite: false,
  });
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float grazing = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 5.0);
      diffuseColor.a = 0.025 + grazing * 0.32;
      #include <opaque_fragment>`,
    );
  };
  glass.customProgramCacheKey = () => "window-fresnel-v1";
  function wallUVs(geometry, index, x = 0, y = 0) {
    const wall = walls[index];
    const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
    const pos = geometry.attributes.position,
      norm = geometry.attributes.normal;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const side = norm.getZ(i) < 0 ? -1 : 1;
      uv.set(
        daylightUV(
          `wall-${index}-${side}`,
          (pos.getX(i) + x) / length,
          1 - (pos.getY(i) + y) / HEIGHT,
        ),
        i * 2,
      );
      geometry.attributes.uv.setXY(i, pos.getX(i) + x, pos.getY(i) + y);
    }
    geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
  }
  function horizontalUVs(geometry, id) {
    const pos = geometry.attributes.position,
      uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++)
      uv.set(
        daylightUV(
          id,
          (pos.getX(i) - floorBounds.minX) /
            (floorBounds.maxX - floorBounds.minX),
          (-pos.getY(i) - floorBounds.minZ) /
            (floorBounds.maxZ - floorBounds.minZ),
        ),
        i * 2,
      );
    geometry.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
  }
  function box(parent, w, h, d, x, y, z, mat = plaster) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    if (parent.userData.wallIndex !== undefined)
      wallUVs(m.geometry, parent.userData.wallIndex, x, y);
    m.position.set(x, y, z);
    m.castShadow = !mat.transparent;
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
    horizontalUVs(mesh.geometry, "floor");
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y - 0.15;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }
  const rectFloor = (x1, z1, x2, z2, mat, y = 0.005) =>
    floor([p(x1, z1), p(x2, z1), p(x2, z2), p(x1, z2)], mat, y);
  floor(footprint, floorMaterial);
  // Keep this reflection local to the open living/kitchen floor.
  rectFloor(278, 414, 1175, 744, livingFloorMaterial, 0.003);
  for (const room of bathroomFloors)
    floor(room.polygon, finishes[room.material], 0.008);
  floor(balcony, material("#c0c1bc", 0.9));

  for (const [wallIndex, wall] of walls.entries()) {
    const dx = wall.b[0] - wall.a[0],
      dz = wall.b[1] - wall.a[1],
      length = Math.hypot(dx, dz);
    const group = new THREE.Group();
    group.userData.wallIndex = wallIndex;
    group.position.set(wall.a[0], 0, wall.a[1]);
    group.rotation.y = -Math.atan2(dz, dx);
    architecture.add(group);
    const fill = (a, b, lo, hi) => {
      if (b - a <= 0.005 || hi - lo <= 0.005) return;
      box(group, b - a, hi - lo, wall.thickness, (a + b) / 2, (lo + hi) / 2, 0);
      // Face only the room's interior; clip finishes to the solid sections so
      // windows and doorways stay open. UVs use real metres on both axes.
      for (const finish of wall.finishes) {
        const left = Math.max(a, finish.from),
          right = Math.min(b, finish.to);
        if (right <= left) continue;
        const geometry = new THREE.PlaneGeometry(right - left, hi - lo);
        const uv = geometry.attributes.uv,
          pos = geometry.attributes.position;
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(
            i,
            pos.getX(i) + (left + right) / 2,
            pos.getY(i) + (lo + hi) / 2,
          );
        }
        const panel = new THREE.Mesh(geometry, finishes[finish.material]);
        const lightUV = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++)
          lightUV.set(
            daylightUV(
              `wall-${wallIndex}-${finish.side}`,
              (finish.side * pos.getX(i) + (left + right) / 2) / length,
              1 - (pos.getY(i) + (lo + hi) / 2) / HEIGHT,
            ),
            i * 2,
          );
        geometry.setAttribute("uv1", new THREE.BufferAttribute(lightUV, 2));
        panel.position.set(
          (left + right) / 2,
          (lo + hi) / 2,
          finish.side * (wall.thickness / 2 + 0.003),
        );
        if (finish.side < 0) panel.rotation.y = Math.PI;
        panel.receiveShadow = true;
        group.add(panel);
      }
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
        if (o.transom)
          box(
            group,
            width,
            0.055,
            0.08,
            center,
            o.bottom + o.transom,
            0,
            metal,
          );
        const panels = o.panels ?? Math.ceil(width / 1.1);
        for (let j = 0; j <= panels; j++)
          box(
            group,
            0.035,
            o.top - o.bottom,
            0.08,
            o.from + (width * j) / panels,
            (o.top + o.bottom) / 2,
            0,
            metal,
          );
        // Recessed sash rails and modest handles, as in the black sliding
        // frames in the owner's photos. These remain part of the window shell.
        for (const z of [-0.027, 0.027])
          box(
            group,
            width - 0.06,
            0.012,
            0.012,
            center,
            o.bottom + 0.08,
            z,
            metal,
          );
        if (width > 0.8)
          box(
            group,
            0.018,
            0.115,
            0.035,
            panels > 1 ? o.from + width / panels + 0.045 : o.to - 0.06,
            Math.max(o.bottom + 0.35, 1.25),
            0.065,
            metal,
          );
      } else if (o.sliding) {
        // Black aluminium slider, parked half open for a real walkable opening.
        for (const x of [o.from + 0.025, o.to - 0.025])
          box(group, 0.05, o.top, 0.14, x, o.top / 2, 0, metal);
        for (const y of [0.014, o.top - 0.025])
          box(group, width, 0.03, 0.14, center, y, 0, metal);
        const leafWidth = width / 2,
          leafCenter = o.from + leafWidth / 2;
        for (const z of [-0.03, 0.035]) {
          box(
            group,
            leafWidth - 0.07,
            o.top - 0.09,
            0.012,
            leafCenter,
            o.top / 2,
            z,
            glass,
          );
          for (const x of [o.from + 0.045, o.from + leafWidth - 0.018])
            box(group, 0.035, o.top - 0.05, 0.04, x, o.top / 2, z, metal);
          for (const y of [0.045, o.top - 0.045])
            box(group, leafWidth, 0.045, 0.04, leafCenter, y, z, metal);
        }
        box(
          group,
          0.022,
          0.18,
          0.055,
          o.passageFrom - 0.08,
          1.02,
          0.065,
          metal,
        );
      } else {
        for (const x of [o.from + 0.025, o.to - 0.025])
          box(group, 0.045, o.top, 0.2, x, o.top / 2, 0, trim);
        box(group, width, 0.06, 0.2, center, o.top, 0, trim);
      }
      if (o.shutterBox || o.sliding) {
        const height = Math.min(0.26, HEIGHT - o.top - 0.07);
        box(
          group,
          width + 0.14,
          height,
          wall.thickness + 0.065,
          center,
          o.top + height / 2 + 0.025,
          0,
          trim,
        );
        box(
          group,
          width + 0.1,
          0.012,
          wall.thickness + 0.07,
          center,
          o.top + 0.045,
          0,
          stone,
        );
      }
      cursor = o.to;
    }
    fill(cursor, length, 0, HEIGHT);
    for (const run of skirtingRuns(wall)) {
      box(
        group,
        run.to - run.from,
        SKIRTING_HEIGHT,
        SKIRTING_DEPTH,
        (run.from + run.to) / 2,
        run.floorY + SKIRTING_HEIGHT / 2,
        run.side * (wall.thickness / 2 + SKIRTING_DEPTH / 2 + 0.001),
        skirtingMaterial,
      );
    }
    if (wall === livingTV.wall) {
      // Continue the tile skirting around the exposed end of the short divider.
      box(
        group,
        SKIRTING_DEPTH,
        SKIRTING_HEIGHT,
        wall.thickness + 2 * SKIRTING_DEPTH,
        length + SKIRTING_DEPTH / 2,
        0.003 + SKIRTING_HEIGHT / 2,
        0,
        skirtingMaterial,
      );
      const face = wall.thickness / 2,
        center = length / 2;
      const casing = material("#111215", 0.42, { metalness: 0.05 });
      box(
        group,
        0.42,
        0.28,
        0.02,
        center,
        livingTV.centerHeight,
        face + 0.012,
        casing,
      );
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(
          livingTV.width + 0.016,
          livingTV.height + 0.016,
          0.035,
          2,
          0.006,
        ),
        casing,
      );
      body.position.set(center, livingTV.centerHeight, face + 0.0395);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(livingTV.width, livingTV.height),
        tvScreen,
      );
      screen.position.set(center, livingTV.centerHeight, face + 0.0575);
      screen.receiveShadow = true;
      group.add(screen);
    }
  }
  const ensuiteMaterials = buildEnsuite(architecture, finishes);
  const entrance = buildEntrance(ceiling, plaster);
  const ceilingShape = new THREE.Shape(
    footprint.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  const roof = new THREE.Mesh(
    new THREE.ShapeGeometry(ceilingShape),
    lit(
      material("#f1f1ed", 1, {
        side: THREE.DoubleSide,
      }),
    ),
  );
  horizontalUVs(roof.geometry, "ceiling");
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = HEIGHT + 0.01;
  roof.castShadow = true;
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

  // Add furnishings room by room with the owner. The wall-mounted TV is the
  // first requested addition; the former orange-X cabinet remains absent.
  const hemi = new THREE.HemisphereLight("#edf4ff", "#989287", 0.08);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff9ef", 3.2);
  sun.position.set(-9, 14, -15);
  sun.target.position.set(7, 0, 6);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  const shadowSize = window.innerWidth <= 800 ? 2048 : 4096;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, {
    left: -14,
    right: 14,
    top: 14,
    bottom: -14,
    near: 0.5,
    far: 60,
  });
  sun.shadow.bias = -0.00002;
  sun.shadow.normalBias = 0.004;
  sun.shadow.radius = 2;
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
        // Non-lightmapped rails and stair details still need matching attribute
        // sets when they share a material with window parts.
        if (!object.geometry.attributes.uv1)
          object.geometry.setAttribute(
            "uv1",
            object.geometry.attributes.uv.clone(),
          );
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
  // Capture each real room once. Polished tiles reflect its windows and walls
  // without a costly mirror render on every frame or an unrelated stock HDRI.
  scene.background = sky;
  scene.fog = null;
  ground.visible = false;
  const reflectionRooms = [
    [p(519, 682), [livingFloorMaterial, tvScreen]],
    [p(225, 1210), [finishes.marbleBath, finishes.floorBath]],
    [
      p(960, 1200),
      [finishes.marbleEnsuite, finishes.floorEnsuite, ...ensuiteMaterials],
    ],
  ];
  const reflectionCache = new Map();
  function reflections(timeOfDay) {
    let captured = reflectionCache.get(timeOfDay);
    if (!captured) {
      // Capture at full architectural height even when the visitor switches
      // lighting in the cutaway overview. Each lighting state is cached once.
      const visible = ceiling.visible,
        scale = architecture.scale.y;
      ceiling.visible = true;
      architecture.scale.y = 1;
      root.updateMatrixWorld(true);
      for (const [, materials] of reflectionRooms)
        for (const mat of materials) {
          mat.envMap = null;
          mat.needsUpdate = true;
        }
      const pmrem = new THREE.PMREMGenerator(renderer);
      captured = reflectionRooms.map(([point]) => {
        const target = new THREE.WebGLCubeRenderTarget(
          timeOfDay === "day" ? 256 : 128,
          {
            type: THREE.HalfFloatType,
          },
        );
        const probe = new THREE.CubeCamera(0.05, 60, target);
        probe.position.set(point[0], 1.4, point[1]);
        probe.update(renderer, scene);
        const reflection = pmrem.fromCubemap(target.texture).texture;
        target.dispose();
        return reflection;
      });
      pmrem.dispose();
      reflectionCache.set(timeOfDay, captured);
      ceiling.visible = visible;
      architecture.scale.y = scale;
    }
    reflectionRooms.forEach(([, materials], index) => {
      for (const mat of materials) {
        mat.envMap = captured[index];
        mat.needsUpdate = true;
      }
    });
  }
  reflections("day");
  let viewMode = "overview",
    timeOfDay = "day";
  const bakedMaterials = new Set([
    plaster,
    trim,
    roof.material,
    livingFloorMaterial,
    skirtingMaterial,
    ...ensuiteMaterials,
    ...Object.values(finishes),
    ...entrance.materials.filter((mat) => mat.lightMap),
  ]);
  function applyLighting() {
    const walking = viewMode === "walk",
      night = timeOfDay === "night";
    ceiling.visible = walking;
    architecture.scale.y = walking ? 1 : 0.42;
    ground.visible = !walking;
    const environment = night ? nightEnvironment : dayEnvironment;
    scene.background = walking
      ? environment.sky
      : new THREE.Color(night ? "#192331" : "#d8dcd2");
    scene.environment = environment.environment;
    ground.material.color.set(night ? "#17202b" : "#d8dcd2");
    ground.material.emissive.set(night ? "#253246" : "#000000");
    ground.material.emissiveIntensity = night ? 0.6 : 0;
    sun.intensity = night ? 0 : walking ? 3.2 : 2.7;
    sun.visible = !night;
    hemi.color.set(night ? "#8fabc9" : "#edf4ff");
    hemi.groundColor.set(night ? "#5c5b60" : "#989287");
    hemi.intensity = night ? (walking ? 0.1 : 0.24) : walking ? 0.08 : 1.3;
    scene.environmentIntensity = night ? 0.1 : walking ? 0.08 : 0.45;
    for (const mat of bakedMaterials) {
      mat.lightMap = night ? nightlight : daylight;
      mat.lightMapIntensity = LIGHTMAP_RANGE * (walking || night ? 1 : 0.3);
    }
    entrance.setNight(night);
  }
  return {
    root,
    architecture,
    ceiling,
    obstacles,
    setMode(mode) {
      viewMode = mode;
      applyLighting();
    },
    setLighting(next) {
      timeOfDay = next === "night" ? "night" : "day";
      applyLighting();
      const groundVisible = ground.visible;
      ground.visible = false;
      reflections(timeOfDay);
      ground.visible = groundVisible;
    },
    lightingState: () => ({
      timeOfDay,
      sunIntensity: sun.intensity,
      interiorLights: timeOfDay === "night",
      ceilingVisible: ceiling.visible,
    }),
  };
}
