import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { retryOnePendingAnchor } from "../chain/arc";
import { logger } from "../lib/logger";

export function isAuthorizedRecovery(header: string | undefined, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function handleAnchorRecovery(
  req: Request,
  res: Response,
  recover: typeof retryOnePendingAnchor = retryOnePendingAnchor,
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
    // Never detach this work: Vercel may terminate the function on response.
    const result = await recover();
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Scheduled anchor recovery failed");
    res.status(503).json({ error: "Anchor recovery did not complete." });
  }
}

const router: IRouter = Router();
router.get("/internal/anchor-recovery", (req, res) => {
  void handleAnchorRecovery(req, res);
});
export default router;