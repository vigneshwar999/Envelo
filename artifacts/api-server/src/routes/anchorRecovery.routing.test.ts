import { once } from "node:events";
import express from "express";
import { expect, it } from "vitest";
import router from "./index";

it("routes recovery to its bearer gate before session authentication", async () => {
  const originalSecret = process.env["CRON_SECRET"];
  process.env["CRON_SECRET"] = "routing-test-secret";
  const app = express();
  app.use("/api", router);
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port.");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/internal/anchor-recovery`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized." });
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
    if (originalSecret === undefined) delete process.env["CRON_SECRET"];
    else process.env["CRON_SECRET"] = originalSecret;
  }
});