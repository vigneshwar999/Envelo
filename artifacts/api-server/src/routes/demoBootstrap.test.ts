import { describe, expect, it } from "vitest";
import { isDemoBootstrapAllowed } from "./demoBootstrap";

describe("demo bootstrap launch gate", () => {
  it("is disabled by default", () => {
    expect(isDemoBootstrapAllowed({ CLERK_SECRET_KEY: "sk_test_example" })).toBe(false);
  });

  it("only permits explicitly enabled test tenants", () => {
    expect(isDemoBootstrapAllowed({
      DEMO_BOOTSTRAP_ENABLED: "1",
      CLERK_SECRET_KEY: "sk_test_example",
    })).toBe(true);
    expect(isDemoBootstrapAllowed({
      DEMO_BOOTSTRAP_ENABLED: "1",
      CLERK_SECRET_KEY: "sk_live_example",
    })).toBe(false);
    expect(isDemoBootstrapAllowed({ DEMO_BOOTSTRAP_ENABLED: "1" })).toBe(false);
  });

  it("keeps the legacy kill switch effective", () => {
    expect(isDemoBootstrapAllowed({
      DEMO_BOOTSTRAP_ENABLED: "1",
      DEMO_BOOTSTRAP_DISABLED: "1",
      CLERK_SECRET_KEY: "sk_test_example",
    })).toBe(false);
  });
});