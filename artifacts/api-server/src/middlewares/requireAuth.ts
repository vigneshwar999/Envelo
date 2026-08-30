import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

// Express request with the authenticated Clerk user id attached.
export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Every protected route derives WHO is acting from the Clerk session - never
 * from ids sent in the request body or path. That is the core security fix
 * over the old demo-persona system, where the browser simply claimed to be
 * someone.
 */
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId =
    (auth?.sessionClaims?.["userId"] as string | undefined) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Please sign in to use Sealed Invoices." });
    return;
  }
  req.userId = userId;
  next();
}

/** The id set by requireAuth; throws if a route forgot the middleware. */
export function userIdOf(req: Request): string {
  const id = (req as AuthedRequest).userId;
  if (!id) throw new Error("Route is missing the requireAuth middleware");
  return id;
}
