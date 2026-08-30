import { execSync } from "node:child_process";
import { defineConfig } from "@playwright/test";

// This environment (NixOS) lacks the shared libraries Playwright's own
// chromium download expects, so use the system chromium installed via Nix.
// Resolved through PATH because the /nix/store path changes across rebuilds.
function systemChromium(): string | undefined {
  try {
    return execSync("which chromium").toString().trim() || undefined;
  } catch {
    return undefined;
  }
}

// Regression checks that run against the LIVE dev servers (web + API), the
// same way the preview pane serves the app - no mocks anywhere. Keep the
// workflows "artifacts/sealed-invoices: web" and "artifacts/api-server: API
// Server" running before invoking `pnpm run test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  // One retry absorbs environmental blips (this container runs five dev
  // servers beside chromium; renderer crashes and stalled loads happen
  // under memory pressure). A genuine regression still fails: it fails
  // both attempts. Every test starts from fresh browser contexts and
  // ensureReadyKey copes with any persona state, so retries are safe.
  retries: 1,
  reporter: [["list"]],
  use: {
    // The workspace proxy serves the app at its preview path ("/").
    baseURL: "http://localhost:80",
    launchOptions: {
      executablePath: systemChromium(),
    },
  },
});
