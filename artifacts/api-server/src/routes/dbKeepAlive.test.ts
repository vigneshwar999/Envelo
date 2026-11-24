import { afterEach, describe, expect, it } from "vitest";
import { handleDbKeepAlive } from "./dbKeepAlive";

const originalSecret = process.env["CRON_SECRET"];
afterEach(() => {
  if (originalSecret === undefined) delete process.env["CRON_SECRET"];
  else process.env["CRON_SECRET"] = originalSecret;
});

function response() {
  return {
    code: 200,
    body: null as unknown,
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}
const request = (header?: string) => ({
  get(name: string) { return name === "authorization" ? header : undefined; },
});

type Req = Parameters<typeof handleDbKeepAlive>[0];
type Res = Parameters<typeof handleDbKeepAlive>[1];
const run = async (header: string | undefined, ping: () => Promise<void>) => {
  const res = response();
  await handleDbKeepAlive(request(header) as unknown as Req, res as unknown as Res, ping);
  return res;
};

describe("database keep-alive", () => {
  it("does not exist without CRON_SECRET", async () => {
    delete process.env["CRON_SECRET"];
    let pinged = false;
    const res = await run("Bearer x", async () => { pinged = true; });
    expect(res.code).toBe(404);
    expect(pinged).toBe(false);
  });

  it("rejects a wrong secret without touching the database", async () => {
    process.env["CRON_SECRET"] = "right";
    let pinged = false;
    const res = await run("Bearer wrong", async () => { pinged = true; });
    expect(res.code).toBe(401);
    expect(pinged).toBe(false);
  });

  it("pings the database with the right secret", async () => {
    process.env["CRON_SECRET"] = "right";
    let pinged = false;
    const res = await run("Bearer right", async () => { pinged = true; });
    expect(res.code).toBe(200);
    expect(pinged).toBe(true);
  });

  it("reports 503 when the database does not answer", async () => {
    process.env["CRON_SECRET"] = "right";
    const res = await run("Bearer right", async () => { throw new Error("paused"); });
    expect(res.code).toBe(503);
  });
});
