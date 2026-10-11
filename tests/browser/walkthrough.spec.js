import { test, expect } from "@playwright/test";
import { canOccupy, rooms, p } from "../../src/plan.js";

async function ready(page, path = "./") {
  await page.goto(path);
  await page.waitForFunction(() => window.__koma?.triangles > 1000);
  await expect(page.locator("#loading")).toHaveCount(0);
}
test("production site renders and every room destination is clear of furniture", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  expect(await page.evaluate(() => window.__koma.drawCalls)).toBeLessThan(150);
  await page.screenshot({ path: "test-results/desktop-overview.png" });
  for (const room of rooms) {
    await page
      .getByRole("button", { name: `Visit ${room.name}`, exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => `${window.__koma.mode}:${window.__koma.room}`),
      )
      .toBe(`walk:${room.id}`);
    await expect(page.locator("#view-title")).toHaveText(room.name);
    const state = await page.evaluate(() => window.__koma);
    expect(
      canOccupy(state.position.x, state.position.z, state.obstacles),
      room.name,
    ).toBe(true);
    if (room.id === "wc")
      await page.screenshot({ path: "test-results/desktop-wc.png" });
  }
  await page
    .getByRole("button", { name: "Visit Living room", exact: true })
    .click();
  await page.waitForTimeout(650);
  await page.screenshot({ path: "test-results/desktop-living.png" });
  expect(errors).toEqual([]);
});
test("walking, mouse look, reset, and Escape behave as visitor controls", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Step inside" }).click();
  await expect.poll(() => page.evaluate(() => window.__koma.mode)).toBe("walk");
  const before = await page.evaluate(() => window.__koma.position);
  await page.keyboard.down("s");
  try {
    await expect
      .poll(
        async () => {
          const pos = await page.evaluate(() => window.__koma.position);
          return Math.hypot(pos.x - before.x, pos.z - before.z);
        },
        { timeout: 10000 },
      )
      .toBeGreaterThan(0.2);
  } finally {
    await page.keyboard.up("s");
  }
  const yaw = await page.evaluate(() => window.__koma.yaw);
  await page.mouse.move(800, 420);
  await page.mouse.down();
  await page.mouse.move(940, 440, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__koma.yaw)).not.toBe(yaw);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__koma.position.z))
    .toBeCloseTo(rooms[0].point[1], 3);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("a shared room URL opens that room and all rooms are reachable by walking", async ({
  page,
}) => {
  await ready(page, "./#room=bedroom");
  await expect(page.locator("#view-title")).toHaveText("Primary bedroom");
  const { obstacles } = await page.evaluate(() => window.__koma);
  const step = 0.11,
    key = (x, z) => `${x},${z}`,
    start = rooms[0].point.map((v) => Math.round(v / step));
  const seen = new Set([key(...start)]),
    queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = x + dx,
        b = z + dz,
        k = key(a, b);
      if (!seen.has(k) && canOccupy(a * step, b * step, obstacles)) {
        seen.add(k);
        queue.push([a, b]);
      }
    }
  }
  for (const room of rooms) {
    const [x, z] = room.point.map((v) => Math.round(v / step));
    expect(
      seen.has(key(x, z)),
      `${room.name} must be walkable from the living room`,
    ).toBe(true);
  }
});
test("mobile rooms and a touch joystick work without horizontal overflow", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await ready(page, "http://127.0.0.1:4173/interiordesign/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "test-results/mobile-overview.png" });
  await page
    .getByRole("button", { name: `Rooms ${rooms.length}`, exact: true })
    .tap();
  await page
    .getByRole("button", { name: "Visit Kitchen & dining", exact: true })
    .tap();
  await expect(page.locator("#view-title")).toHaveText("Kitchen & dining");
  await expect(page.locator("#joystick")).toBeVisible();
  const pos = await page.evaluate(() => window.__koma.position);
  const rect = await page.locator("#joystick").boundingBox();
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y + 30 }],
  });
  await page.waitForTimeout(650);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => {
      const next = await page.evaluate(() => window.__koma.position);
      return Math.hypot(next.x - pos.x, next.z - pos.z);
    })
    .toBeGreaterThan(0.15);
  await page.screenshot({ path: "test-results/mobile-walk.png" });
  await context.close();
});
