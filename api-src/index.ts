/**
 * Vercel serverless entry. Bundled to api/index.js before Vercel packages
 * functions, so its TypeScript compiler does not re-check workspace sources.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import app from "../artifacts/api-server/src/app";
import { ensureOperatorWallet } from "../artifacts/api-server/src/chain/arc";

let ready: Promise<void> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!ready) {
    ready = ensureOperatorWallet().then(
      () => undefined,
      (err) => {
        ready = null;
        throw err;
      },
    );
  }
  await ready;
  (app as unknown as (rq: IncomingMessage, rs: ServerResponse) => void)(
    req,
    res,
  );
}