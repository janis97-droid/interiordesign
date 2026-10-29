import { test, expect } from "@playwright/test";
import { livingItems, livingFootprint } from "../../src/living-layout.js";
import { canOccupy } from "../../src/plan.js";

test("reference living furniture renders inside its allotted footprints and leaves the arrival clear", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("./#room=living");
  await page.waitForFunction(() => window.__koma?.livingBounds?.length === 5);
  await expect(page.locator("#loading")).toHaveCount(0);
  const state = await page.evaluate(() => window.__koma);
  expect(state.room).toBe("living");
  const west = state.livingBounds.find(b => b.id === "west-sofa");
  expect(west.source).toBe("blender-glb");
  expect(west.max[1] - west.min[1]).toBeCloseTo(0.90, 2);
  expect(west.min[1]).toBeCloseTo(0.003, 3);
  expect((west.min[0] + west.max[0]) / 2).toBeCloseTo(3.10, 3);
  expect((west.min[2] + west.max[2]) / 2).toBeCloseTo(1.85, 3);
  expect(west.max[0] - west.min[0]).toBeCloseTo(0.94, 2);
  expect(west.max[2] - west.min[2]).toBeCloseTo(2.20, 2);
  expect(state.livingBounds.find(b => b.id === "south-sofa").source).toBe("procedural");
  expect(canOccupy(state.position.x, state.position.z, state.obstacles)).toBe(
    true,
  );
  for (const item of livingItems) {
    const actual = state.livingBounds.find((b) => b.id === item.id),
      area = livingFootprint(item);
    expect(actual, item.id).toBeTruthy();
    expect(actual.min[0], item.id).toBeGreaterThanOrEqual(
      area.x - area.width / 2 - 0.01,
    );
    expect(actual.max[0], item.id).toBeLessThanOrEqual(
      area.x + area.width / 2 + 0.01,
    );
    expect(actual.min[2], item.id).toBeGreaterThanOrEqual(
      area.z - area.depth / 2 - 0.01,
    );
    expect(actual.max[2], item.id).toBeLessThanOrEqual(
      area.z + area.depth / 2 + 0.01,
    );
  }
  expect(state.drawCalls).toBeLessThan(150);
  await page.screenshot({
    animations: "disabled",
    path: "test-results/living-furnished.png",
  });
  await page.getByRole("button", { name: "Night", exact: true }).click();
  await expect(page.locator("#night-light")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.__koma.livingBounds.find(b => b.id === 'west-sofa').source)).toBe('blender-glb');
  await page.screenshot({ animations: 'disabled', path: 'test-results/living-blender-night.png' });
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await page
    .getByRole("button", { name: "Visit Balcony", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.__koma.room))
    .toBe("balcony");
  expect(errors).toEqual([]);
});
