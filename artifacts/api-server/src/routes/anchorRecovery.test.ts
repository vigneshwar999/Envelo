import { afterEach, describe, expect, it } from "vitest";
import {
  handleAnchorRecovery,
  isAuthorizedRecovery,
} from "./anchorRecovery";

const originalSecret = process.env["CRON_SECRET"];
afterEach(() => {
  if (originalSecret === undefined) delete process.env["CRON_SECRET"];
  else process.env["CRON_SECRET"] = originalSecret;
});

function response() {
  const result = {
    code: 200,
    body: null as unknown,
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return result;
}

function request(header?: string) {
  return { get(name: string) { return name === "authorization" ? header : undefined; } };
}

// The handler intentionally accepts an injectable recovery function, so the
// authorization and response-lifetime checks never touch a real database/RPC.
type HandlerRequest = Parameters<typeof handleAnchorRecovery>[0];
type HandlerResponse = Parameters<typeof handleAnchorRecovery>[1];
const req = (header?: string) => request(header) as HandlerRequest;
const res = () => response() as unknown as HandlerResponse;

describe("scheduled anchor recovery gate", () => {
  it("fails closed without a configured secret", async () => {
    delete process.env["CRON_SECRET"];
    const reply = res();
    let called = false;
    await handleAnchorRecovery(req(), reply, async () => {
      called = true;
      return { selected: true, attempted: true, anchored: true };
    });
    expect(reply.statusCode ?? (reply as unknown as ReturnType<typeof response>).code).toBe(404);
    expect(called).toBe(false);
  });

  it("rejects missing and incorrect bearer headers without recovery", async () => {
    process.env["CRON_SECRET"] = "test-only-recovery-secret";
    let called = 0;
    for (const header of [undefined, "Bearer wrong", "Basic test-only-recovery-secret"]) {
      const reply = response();
      await handleAnchorRecovery(req(header), reply as unknown as HandlerResponse, async () => {
        called++;
        return { selected: true, attempted: true, anchored: true };
      });
      expect(reply.code).toBe(401);
    }
    expect(called).toBe(0);
    expect(isAuthorizedRecovery("Bearer test-only-recovery-secret", process.env["CRON_SECRET"])).toBe(true);
  });

  it("waits for the request-bound retry before responding", async () => {
    process.env["CRON_SECRET"] = "test-only-recovery-secret";
    const reply = response();
    let finish!: (value: { selected: boolean; attempted: boolean; anchored: boolean }) => void;
    const recovery = new Promise<{ selected: boolean; attempted: boolean; anchored: boolean }>((resolve) => { finish = resolve; });
    const pending = handleAnchorRecovery(req("Bearer test-only-recovery-secret"), reply as unknown as HandlerResponse, () => recovery);
    expect(reply.body).toBeNull();
    finish({ selected: true, attempted: true, anchored: true });
    await pending;
    expect(reply.body).toEqual({ selected: true, attempted: true, anchored: true });
  });

  it("reports unexpected recovery failures", async () => {
    process.env["CRON_SECRET"] = "test-only-recovery-secret";
    const reply = response();
    await handleAnchorRecovery(req("Bearer test-only-recovery-secret"), reply as unknown as HandlerResponse, async () => {
      throw new Error("test-only failure");
    });
    expect(reply.code).toBe(503);
  });
});