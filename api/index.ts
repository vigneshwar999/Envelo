/**
 * Vercel serverless entry for the Envelo API.
 *
 * Wraps the exported Express app (artifacts/api-server/src/app.ts).
 * All /api/* requests are rewritten here by vercel.json; Express sees the
 * original URL, so the existing "/api"-mounted router works unchanged.
 *
 * The operator wallet bootstrap (done at process start on Replit) runs
 * lazily once per serverless instance before the first request is served.
 * attemptChainSetup() is intentionally skipped here: it is a best-effort
 * pre-warm only, and the same setup is triggered by the first on-chain
 * action at request time.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import app from '../artifacts/api-server/src/app';
import { ensureOperatorWallet } from '../artifacts/api-server/src/chain/arc';

let ready: Promise<void> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!ready) {
    ready = ensureOperatorWallet().then(
      () => undefined,
      (err) => {
        // Allow the next request to retry the bootstrap instead of caching
        // a permanently broken instance.
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
