import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildWorld } from "./world.js";
import {
  rooms,
  walls,
  footprint,
  balcony,
  p,
  EYE_HEIGHT,
  roomAt,
  moveWithCollision,
} from "./plan.js";
import "./style.css";

const icons = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m7 21 3-6-1-5 4-3 3 5 4 1M10 15l5 2 1 4M9 10l-4 3"/>',
  plan: '<path d="M3 3h18v18H3zM3 11h9V3m0 8v10m0-5h9"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  volume: '<path d="m12 3 9 5v9l-9 5-9-5V8zm0 10 9-5M3 8l9 5v9"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector("#app").innerHTML = `
  <aside class="sidebar" id="sidebar">
    <a class="brand" href="#" aria-label="Koma home overview"><span class="brand-icon">${icon("volume")}</span>koma<span class="brand-dot">.</span></a>
    <div class="sidebar-intro"><span class="eyebrow">THE RESIDENCE / FLOOR 02</span><h1>A home to<br>step inside.</h1><p>A first look at the spaces<br>we’ll make your own.</p></div>
    <div class="room-heading"><span class="eyebrow">EXPLORE THE ROOMS</span><span>08</span></div>
    <nav id="room-list" aria-label="Explore rooms">${rooms.map((r, i) => `<button class="room-button" data-room="${r.id}" aria-label="Visit ${r.name}"><span class="room-number">${String(i + 1).padStart(2, "0")}</span><span class="room-copy"><strong>${r.name}</strong><small>${r.category}</small></span>${icon("chevron")}</button>`).join("")}</nav>
    <div class="sidebar-footer"><span class="palette" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><strong>Warm & natural</strong><span>Oak · stone · soft sage</span></div><button class="icon-button" id="about" aria-label="About this concept">${icon("info")}</button></div>
  </aside>
  <main id="viewer">
    <div id="scene" aria-label="Interactive 3D home" tabindex="0"></div>
    <div class="scene-wash" aria-hidden="true"></div>
    <header class="viewer-header"><span class="project-name">YOUR HOME, REIMAGINED</span><div class="header-right"><span class="concept-pill"><i></i> Concept 01</span><span class="daylight">${icon("sun")} Daylight</span></div></header>
    <div class="view-title"><span class="eyebrow" id="view-kicker">A NEW PERSPECTIVE</span><h2 id="view-title">The whole picture.</h2><p id="view-description">Take a look around. Then step into a room.</p></div>
    <div class="north-mark" aria-label="Plan orientation marker"><span>PLAN</span><svg viewBox="0 0 32 40" aria-hidden="true"><path d="m16 5 9 26-9-5-9 5Z" fill="none" stroke="currentColor"/><path d="M16 5v21" stroke="currentColor"/></svg></div>
    <div id="hotspots" aria-hidden="true"></div>
    <div class="mini-map" id="mini-map"><div class="mini-map-heading"><span>YOU ARE HERE</span><span id="mini-room">Living</span></div><svg id="map" viewBox="-0.5 -0.5 16.5 14.3" aria-label="Your position in the floor plan"></svg></div>
    <div class="scene-bottom">
      <div class="view-hint" id="view-hint"><span class="mouse-icon" aria-hidden="true"></span><span>Drag to orbit <b>·</b> Scroll to zoom</span></div>
      <button class="enter-button" id="enter">Step inside ${icon("arrow")}</button>
      <button class="next-room" id="next-room" hidden>Next room ${icon("arrow")}</button>
    </div>
    <div class="bottom-bar"><div class="mode-switch" role="group" aria-label="View mode"><button id="overview" class="active" aria-pressed="true">${icon("plan")}<span>Overview</span></button><button id="walk" aria-pressed="false">${icon("walk")}<span>Walk through</span></button></div><span class="toolbar-divider"></span><button class="icon-button" id="reset" aria-label="Reset view">${icon("reset")}</button><button class="icon-button" id="fullscreen" aria-label="Toggle fullscreen">${icon("expand")}</button></div>
    <span class="concept-note">A spatial concept, thoughtfully in progress.</span>
    <button class="mobile-rooms" id="mobile-rooms" aria-expanded="false" aria-controls="sidebar">${icon("plan")}<span>Rooms</span><span class="room-count">8</span></button>
    <div id="joystick" aria-label="Drag to move" role="group"><span id="joystick-knob"></span><span class="joystick-label">MOVE</span></div>
    <div class="look-hint">Drag the view to look around</div>
    <div id="loading"><span class="loading-mark">${icon("volume")}</span><strong>Making room for you.</strong><span>Preparing your home…</span></div>
    <div id="toast" role="status"></div>
  </main>
  <dialog id="about-dialog" aria-labelledby="about-title"><button id="close-about" class="icon-button dialog-close" aria-label="Close details">${icon("close")}</button><span class="eyebrow">CONCEPT 01</span><h2 id="about-title">A starting point.<br>A place for possibilities.</h2><p>The layout is traced from your <strong>koma-b.pdf</strong> floor plan. Furniture, colours, and finishes are an initial design proposal that we can develop together.</p><dl><dt>Based on the plan</dt><dd>Room arrangement, the balcony, major openings, the angled façade, and the stairwell position.</dd><dt>Still to confirm</dt><dd>Ceilings are assumed to be 2.80 m high. Window heights, exact openings, and all finishes need checking against photos and site measurements.</dd><dt>One floor to explore</dt><dd>The stairs are shown for context. This walkthrough stays on the floor in the supplied plan; the stairwell is closed to walking.</dd></dl><p class="small-print">This is a design visualisation, not a measured survey or construction drawing.</p><button class="dialog-done" id="dialog-done">Back to exploring ${icon("arrow")}</button></dialog>
`;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  document.querySelector("#loading").innerHTML =
    "<strong>3D needs a little more support.</strong><span>Enable hardware acceleration or open this page in a current version of Chrome, Safari, Firefox, or Edge.</span>";
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const container = document.querySelector("#scene");
container.appendChild(renderer.domElement);
renderer.domElement.setAttribute("aria-label", "3D home walkthrough");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#d8dcd2");
scene.fog = new THREE.Fog("#d8dcd2", 100, 180);
const camera = new THREE.PerspectiveCamera(43, 1, 0.06, 150);
camera.rotation.order = "YXZ";
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.07;
orbit.minDistance = 11;
orbit.maxDistance = 38;
orbit.maxPolarAngle = Math.PI * 0.45;
orbit.minPolarAngle = 0.15;
orbit.enablePan = true;
orbit.screenSpacePanning = false;
const world = buildWorld(scene);
let mode = "overview",
  activeRoom = rooms[0],
  yaw = 0,
  pitch = 0,
  drag = null,
  joystick = { x: 0, y: 0 },
  lastTime = 0,
  lastRoomCheck = 0,
  renderNeeded = true;
orbit.addEventListener("change", () => (renderNeeded = true));
const keys = new Set();
let toastTimeout;
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("show"), 2800);
}
function resetOverview() {
  camera.fov = 43;
  camera.updateProjectionMatrix();
  const fit = Math.max(1, 0.9 / camera.aspect);
  orbit.minDistance = 11;
  orbit.maxDistance = Math.max(38, 38 * fit);
  orbit.target.set(7.7, 0, 6.8);
  camera.position.set(7.7 + 14.8 * fit, 22 * fit, 6.8 + 19.7 * fit);
  orbit.update();
}
function updateRoomUI(room) {
  document.querySelectorAll(".room-button").forEach((b) => {
    const active = mode === "walk" && b.dataset.room === room?.id;
    b.classList.toggle("active", active);
    b.setAttribute("aria-current", active ? "location" : "false");
  });
  if (mode === "walk") {
    document.querySelector("#view-title").textContent =
      room?.name || "Between spaces";
    document.querySelector("#view-description").textContent =
      room?.size || "Take your time. Make yourself at home.";
    document.querySelector("#mini-room").textContent = room?.name || "Hall";
  }
}
function closeRooms() {
  document.body.classList.remove("rooms-open");
  document
    .querySelector("#mobile-rooms")
    .setAttribute("aria-expanded", "false");
}
function saveView() {
  const hash = mode === "walk" ? `room=${activeRoom.id}` : "overview";
  history.replaceState(null, "", `#${hash}`);
}
function setMode(next) {
  mode = next;
  const walk = mode === "walk";
  world.setMode(mode);
  orbit.enabled = !walk;
  renderNeeded = true;
  renderer.shadowMap.needsUpdate = true;
  document.body.classList.toggle("walking", walk);
  document.querySelector("#overview").classList.toggle("active", !walk);
  document.querySelector("#walk").classList.toggle("active", walk);
  document
    .querySelector("#overview")
    .setAttribute("aria-pressed", String(!walk));
  document.querySelector("#walk").setAttribute("aria-pressed", String(walk));
  document.querySelector("#enter").hidden = walk;
  document.querySelector("#next-room").hidden = !walk;
  document.querySelector("#view-kicker").textContent = walk
    ? "MAKE YOURSELF AT HOME"
    : "A NEW PERSPECTIVE";
  document.querySelector("#view-hint").innerHTML = walk
    ? '<span class="key-hint">W A S D</span><span>Move <b>·</b> Drag to look <b>·</b> Esc for overview</span>'
    : '<span class="mouse-icon" aria-hidden="true"></span><span>Drag to orbit <b>·</b> Scroll to zoom</span>';
  keys.clear();
  joystick = { x: 0, y: 0 };
  if (!walk) {
    resetOverview();
    document.querySelector("#view-title").textContent = "The whole picture.";
    document.querySelector("#view-description").textContent =
      "Take a look around. Then step into a room.";
  } else {
    camera.fov = window.innerWidth <= 800 ? 82 : 65;
    camera.updateProjectionMatrix();
  }
  updateRoomUI(walk ? activeRoom : null);
  saveView();
}
function visit(id) {
  const room = rooms.find((r) => r.id === id) || rooms[0];
  activeRoom = room;
  setMode("walk");
  camera.position.set(room.point[0], EYE_HEIGHT, room.point[1]);
  yaw = Math.atan2(
    -(room.look[0] - room.point[0]),
    -(room.look[1] - room.point[1]),
  );
  pitch = -0.12;
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  updateRoomUI(room);
  closeRooms();
  container.focus({ preventScroll: true });
  saveView();
  if (!reducedMotion) {
    container.classList.remove("arriving");
    void container.offsetWidth;
    container.classList.add("arriving");
  }
}
document
  .querySelectorAll("[data-room]")
  .forEach((b) => b.addEventListener("click", () => visit(b.dataset.room)));
document.querySelector("#enter").onclick = () => visit("living");
document.querySelector("#walk").onclick = () => visit(activeRoom.id);
document.querySelector("#overview").onclick = () => setMode("overview");
document.querySelector(".brand").onclick = (e) => {
  e.preventDefault();
  setMode("overview");
  closeRooms();
};
document.querySelector("#reset").onclick = () =>
  mode === "walk" ? visit(activeRoom.id) : resetOverview();
document.querySelector("#next-room").onclick = () =>
  visit(
    rooms[(rooms.findIndex((r) => r.id === activeRoom.id) + 1) % rooms.length]
      .id,
  );
document.querySelector("#fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen();
    else toast("Use your browser’s fullscreen option.");
  } catch {
    toast("Fullscreen isn’t available in this browser.");
  }
};
document.querySelector("#mobile-rooms").onclick = () => {
  const open = document.body.classList.toggle("rooms-open");
  document
    .querySelector("#mobile-rooms")
    .setAttribute("aria-expanded", String(open));
};
const dialog = document.querySelector("#about-dialog");
document.querySelector("#about").onclick = () => {
  keys.clear();
  dialog.showModal();
};
document.querySelector("#close-about").onclick = document.querySelector(
  "#dialog-done",
).onclick = () => dialog.close();
dialog.addEventListener("click", (e) => {
  const r = dialog.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    dialog.close();
});
window.addEventListener("keydown", (e) => {
  if (dialog.open) return;
  if (e.code === "Escape") {
    closeRooms();
    setMode("overview");
    return;
  }
  if (mode !== "walk" || e.target.closest("button,a,input,dialog")) return;
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  joystick = { x: 0, y: 0 };
  drag = null;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    keys.clear();
    joystick = { x: 0, y: 0 };
  }
});
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (mode !== "walk") return;
  container.focus({ preventScroll: true });
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", (e) => {
  if (mode !== "walk" || drag?.id !== e.pointerId) return;
  yaw -= (e.clientX - drag.x) * 0.0035;
  pitch = THREE.MathUtils.clamp(
    pitch - (e.clientY - drag.y) * 0.003,
    -1.15,
    1.15,
  );
  drag.x = e.clientX;
  drag.y = e.clientY;
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  renderNeeded = true;
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  renderer.domElement.addEventListener(type, () => (drag = null));
const stick = document.querySelector("#joystick"),
  knob = document.querySelector("#joystick-knob");
let stickPointer = null;
function moveStick(e) {
  const r = stick.getBoundingClientRect();
  let x = (e.clientX - r.left - r.width / 2) / 34,
    y = (e.clientY - r.top - r.height / 2) / 34;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  joystick = { x, y };
  knob.style.transform = `translate(${x * 29}px,${y * 29}px)`;
}
stick.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  stickPointer = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
});
stick.addEventListener("pointermove", (e) => {
  if (e.pointerId === stickPointer) moveStick(e);
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  stick.addEventListener(type, () => {
    stickPointer = null;
    joystick = { x: 0, y: 0 };
    knob.style.transform = "";
  });

// A tiny plan provides orientation without adding any visitor editing controls.
const poly = (points) => points.map((a) => a.join(",")).join(" ");
document.querySelector("#map").innerHTML =
  `<polygon points="${poly(footprint)}" fill="#e8e6dd"/><polygon points="${poly(balcony)}" fill="#c6ceba"/>${walls.map((w) => `<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="#8d9486" stroke-width=".14"/>`).join("")}<g id="map-position"><path d="M0,-.7 -.3,-.2 .3,-.2Z" fill="#365d43"/><circle r=".22" fill="#365d43" stroke="#fff" stroke-width=".1"/></g>`;
const hotspotRooms = [rooms[0], rooms[1], rooms[4]];
const hotspots = hotspotRooms.map((room, i) => {
  const el = document.createElement("span");
  el.className = "hotspot";
  el.innerHTML = `<i>${String(rooms.indexOf(room) + 1).padStart(2, "0")}</i>${room.name}`;
  document.querySelector("#hotspots").appendChild(el);
  return { el, point: new THREE.Vector3(room.point[0], 0.25, room.point[1]) };
});
const projected = new THREE.Vector3();
function resize() {
  const { width, height } = container.getBoundingClientRect();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  if (mode === "overview") resetOverview();
  else camera.fov = window.innerWidth <= 800 ? 82 : 65;
  camera.updateProjectionMatrix();
  renderNeeded = true;
}
new ResizeObserver(resize).observe(container);
resize();
const initialHash = location.hash;
setMode("overview");
const initialRoom = new URLSearchParams(initialHash.slice(1)).get("room");
if (initialRoom && rooms.some((r) => r.id === initialRoom)) visit(initialRoom);
let lastSnapshot = 0;
function frame(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  if (mode === "overview") {
    orbit.update();
    for (const h of hotspots) {
      projected.copy(h.point).project(camera);
      h.el.style.left = `${(projected.x * 0.5 + 0.5) * container.clientWidth}px`;
      h.el.style.top = `${(-projected.y * 0.5 + 0.5) * container.clientHeight}px`;
      h.el.style.visibility = projected.z < 1 ? "visible" : "hidden";
    }
  } else {
    let strafe =
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")) +
      joystick.x;
    let forward =
      Number(keys.has("KeyW") || keys.has("ArrowUp")) -
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      joystick.y;
    const length = Math.hypot(strafe, forward);
    if (length > 1) {
      strafe /= length;
      forward /= length;
    }
    if (!dialog.open && (strafe || forward)) {
      const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 3.1 : 1.9;
      const dx =
          (Math.cos(yaw) * strafe - Math.sin(yaw) * forward) * speed * dt,
        dz = (-Math.sin(yaw) * strafe - Math.cos(yaw) * forward) * speed * dt;
      const next = moveWithCollision(camera.position, dx, dz, world.obstacles);
      camera.position.x = next.x;
      camera.position.z = next.z;
      renderNeeded = true;
    }
    document
      .querySelector("#map-position")
      .setAttribute(
        "transform",
        `translate(${camera.position.x},${camera.position.z}) rotate(${(-yaw * 180) / Math.PI})`,
      );
    if (time - lastRoomCheck > 350) {
      lastRoomCheck = time;
      const room = roomAt(camera.position.x, camera.position.z);
      if (room && room.id !== activeRoom.id) {
        activeRoom = room;
        saveView();
      }
      updateRoomUI(room);
    }
  }
  if (renderNeeded) {
    renderer.render(scene, camera);
    renderNeeded = false;
  }
  // Read-only diagnostics for testing navigation and GPU rendering.
  if (time - lastSnapshot > 100) {
    lastSnapshot = time;
    window.__koma = {
      mode,
      room: activeRoom.id,
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      yaw,
      pitch,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      obstacles: world.obstacles,
    };
  }
}
renderer.setAnimationLoop(frame);
document.querySelector("#loading").classList.add("loaded");
setTimeout(() => document.querySelector("#loading").remove(), 600);
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  toast("The 3D view paused. Reload the page to continue.");
});
