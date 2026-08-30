import app from "./app";
import { logger } from "./lib/logger";
import { attemptChainSetup, ensureOperatorWallet } from "./chain/arc";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main(): Promise<void> {
  // The operator wallet must exist before anything else: its address is the
  // faucet target that funds the whole demo.
  await ensureOperatorWallet();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });

  // Best-effort background pass: deploys/anchors if the wallet is funded.
  attemptChainSetup().catch((err) =>
    logger.warn({ err }, "Initial chain setup pass failed"),
  );
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
