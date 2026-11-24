import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";
import { isAuthorizedRecovery } from "./anchorRecovery";

// Supabase's free plan pauses a project after about a week without database
// activity, and a paused database takes the whole app down. Vercel Cron calls
// this once a day (vercel.json) with `Authorization: Bearer $CRON_SECRET`, and
// it runs one read-only query. Without CRON_SECRET it does not exist.

async function pingDatabase(): Promise<void> {
  await db.execute(sql`select 1`);
}

export async function handleDbKeepAlive(
  req: Request,
  res: Response,
  ping: () => Promise<void> = pingDatabase,
): Promise<void> {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  if (!isAuthorizedRecovery(req.get("authorization"), secret)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  try {
    await ping();
    res.json({ ok: true, checkedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "Scheduled database keep-alive failed");
    res.status(503).json({ error: "Database did not answer." });
  }
}

const router: IRouter = Router();
router.get("/internal/db-keepalive", (req, res) => {
  void handleDbKeepAlive(req, res);
});
export default router;
