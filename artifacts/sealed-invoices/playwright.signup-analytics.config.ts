import { execSync } from "node:child_process";
import { defineConfig } from "@playwright/test";

function systemChromium(): string | undefined {
  try {
    return execSync("which chromium").toString().trim() || undefined;
  } catch {
    return undefined;
  }
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "signup-completion-analytics.spec.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:80",
    launchOptions: {
      executablePath: systemChromium(),
    },
  },
});