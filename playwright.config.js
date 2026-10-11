import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173/interiordesign/",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    launchOptions: {
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      args: [
        "--no-sandbox",
        "--enable-webgl",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command:
      "npm run build && npm run preview -- --port 4173 --base /interiordesign/",
    url: "http://127.0.0.1:4173/interiordesign/",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
