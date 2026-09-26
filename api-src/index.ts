/** Vercel serverless entry, bundled to api/index.js before function packaging. */
import type { IncomingMessage, ServerResponse } from "node:http";

import app from "../artifacts/api-server/src/app";

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  (app as unknown as (rq: IncomingMessage, rs: ServerResponse) => void)(
    req,
    res,
  );
}