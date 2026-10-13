import { test, expect } from "@playwright/test";
import { PerspectiveCamera, Vector3 } from "three";
import { canOccupy, kitchenBay } from "../../src/plan.js";

test("shared kitchen views show the fitted furniture, preserve the camera at night, and keep plan labels visible on mobile", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./#room=living&view=kitchen-entrance");
  await page.waitForFunction(() => window.__koma?.kitchenBounds?.length > 0);
  await expect(page.locator("#loading")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => `${window.__koma.mode}:${window.__koma.kitchenFocus}`,
      ),
    )
    .toBe("walk:entrance");
  const entrance = await page.evaluate(() => window.__koma);
  expect(
    canOccupy(entrance.position.x, entrance.position.z, entrance.obstacles),
  ).toBe(true);
  const furniture = Object.fromEntries(
    entrance.kitchenBounds.map((box) => [box.id, box]),
  );
  const island = furniture.island;
  expect(island.max[0] - island.min[0]).toBeCloseTo(2.1, 5);
  expect(island.max[2] - island.min[2]).toBeCloseTo(0.95, 5);
  expect(island.max[1]).toBeCloseTo(0.903, 5);
  expect(furniture["sink-80"].min[0]).toBeGreaterThan(
    kitchenBay.mainEastInside,
  );
  expect(furniture["sink-80"].max[0]).toBeLessThan(kitchenBay.backInside);
  expect(
    Object.keys(furniture).filter((id) => id.startsWith("stool-")),
  ).toHaveLength(3);
  expect(
    Object.keys(furniture).filter((id) => id.startsWith("lantern-")),
  ).toHaveLength(3);
  await page.screenshot({
    path: "test-results/kitchen-entrance.png",
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Night", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__koma.lighting))
    .toBe("night");
  const night = await page.evaluate(() => window.__koma);
  expect(night.position).toEqual(entrance.position);
  expect(night.yaw).toBe(entrance.yaw);
  expect(night.pitch).toBe(entrance.pitch);
  expect(night.lightState.sunIntensity).toBe(0);
  expect(night.lightState.interiorLights).toBe(true);

  // A NaN in a walnut bump normal previously contaminated the reflection
  // probe and made this warm stone worktop black at night. Check actual rendered
  // colour at the projected worktop, so the regression follows the geometry
  // instead of depending on a fixed screenshot pixel or exact GPU snapshot.
  const canvas = page.locator("#scene canvas");
  const viewport = await canvas.boundingBox();
  const camera = new PerspectiveCamera(
    65,
    viewport.width / viewport.height,
    0.06,
    150,
  );
  camera.position.set(night.position.x, night.position.y, night.position.z);
  camera.rotation.set(night.pitch, night.yaw, 0, "YXZ");
  camera.updateMatrixWorld();
  const countertop = new Vector3(
    (island.min[0] + island.max[0]) / 2,
    island.max[1] + 0.003,
    (island.min[2] + island.max[2]) / 2,
  ).project(camera);
  const sample = {
    x: Math.round((countertop.x * 0.5 + 0.5) * viewport.width),
    y: Math.round((-countertop.y * 0.5 + 0.5) * viewport.height),
  };
  expect(sample.x).toBeGreaterThan(5);
  expect(sample.x).toBeLessThan(viewport.width - 5);
  expect(sample.y).toBeGreaterThan(5);
  expect(sample.y).toBeLessThan(viewport.height - 5);
  const png = await canvas.screenshot({
    path: "test-results/kitchen-night.png",
    animations: "disabled",
    scale: "css",
  });
  const colour = await page.evaluate(
    async ({ png, sample }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const buffer = document.createElement("canvas");
      buffer.width = image.width;
      buffer.height = image.height;
      const context = buffer.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        sample.x - 4,
        sample.y - 4,
        9,
        9,
      ).data;
      const totals = [0, 0, 0];
      for (let i = 0; i < pixels.length; i += 4)
        for (let channel = 0; channel < 3; channel++)
          totals[channel] += pixels[i + channel];
      return totals.map((total) => total / 81);
    },
    { png: png.toString("base64"), sample },
  );
  expect(
    colour.reduce((sum, value) => sum + value, 0) / 3,
    `night stone remains illuminated: RGB ${colour.map(Math.round)}`,
  ).toBeGreaterThan(80);
  expect(
    colour[0] - colour[2],
    "the beige stone retains warm colour, not a clipped white reflection",
  ).toBeGreaterThan(5);

  await page.getByRole("button", { name: "Kitchen plan", exact: true }).click();
  await expect(page).toHaveURL(/#overview&view=kitchen-plan&lighting=night$/);
  await expect
    .poll(() =>
      page.evaluate(
        () => `${window.__koma.mode}:${window.__koma.kitchenFocus}`,
      ),
    )
    .toBe("overview:plan");
  await expect(page.locator("#kitchen-labels")).toBeVisible();
  await expect(page.locator("#kitchen-labels")).toContainText(
    "Island · 210 × 95 cm",
  );
  await expect(page.locator("#kitchen-labels")).toContainText(
    "75 cm sink · recessed bay",
  );
  await expect(page.locator("#kitchen-labels")).toContainText(
    "110 cm working aisle",
  );
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__koma.lighting))
    .toBe("day");
  await page.screenshot({
    path: "test-results/kitchen-plan.png",
    animations: "disabled",
  });

  // Directly loading the copied plan link restores the same measured view.
  await page.reload();
  await page.waitForFunction(() => window.__koma?.kitchenFocus === "plan");
  await expect(page.locator("#kitchen-labels")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  await expect
    .poll(() =>
      page.locator(".kitchen-label").evaluateAll((labels) =>
        labels.every((label) => {
          const rect = label.getBoundingClientRect();
          return (
            rect.left >= 0 &&
            rect.right <= window.innerWidth &&
            rect.top >= 0 &&
            rect.bottom <= window.innerHeight
          );
        }),
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/kitchen-plan-mobile.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Kitchen view", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__koma.kitchenFocus))
    .toBe("entrance");
  await expect(page).toHaveURL(/view=kitchen-entrance/);
  await expect(page.locator("#kitchen-labels")).toBeHidden();
  expect(errors).toEqual([]);
});
