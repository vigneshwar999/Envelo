import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { parseUnits } from "viem";
import { db, usersTable } from "@workspace/db";
import { GetAnchorPreviewResponse, GetChainStatusResponse } from "@workspace/api-zod";
import {
  anchorPayerFor,
  attemptChainSetup,
  decideAffordability,
  ensureWalletFor,
  estimateAnchorFeeWei,
  formatFeeUsdc,
  formatUsdc,
  getBalance,
  getWallet,
  isArcNetworkKey,
  isRpcConnected,
  mainnetAvailability,
  mainnetOperatorMinBalanceUsdc,
  mainnetOperatorStatus,
  networkByKey,
  ARC_CHAIN_ID,
  ARC_MAINNET,
  ARC_TESTNET,
  EXPLORER_BASE_URL,
  FAUCET_URL,
  NETWORK_NAME,
  type ArcNetwork,
} from "../chain/arc";
import { userIdOf } from "../middlewares/requireAuth";

const router: IRouter = Router();

function mainnetDisabledReason(
  reason: "flag_off" | "no_operator_key" | "no_registry",
): string {
  switch (reason) {
    case "flag_off":
      return "Live invoicing on Arc Mainnet is switched off.";
    case "no_operator_key":
      return "Envelo's operator wallet for Arc Mainnet is not configured.";
    case "no_registry":
      return "The registry contract is not deployed on Arc Mainnet yet.";
  }
}

router.get("/chain/status", async (req, res) => {
  const userId = userIdOf(req);

  // Best-effort background pass: re-drive any anchor still pending on a
  // reachable network (a sender who topped up, an operator submission that
  // timed out).
  attemptChainSetup().catch(() => {});

  const [testnetConnected, mainnetConnected] = await Promise.all([
    isRpcConnected(ARC_TESTNET),
    isRpcConnected(ARC_MAINNET),
  ]);
  const contractAddress = ARC_TESTNET.registryAddress;
  const operator = await getWallet("operator");
  const myWallet = await getWallet(userId);

  const operatorBalance =
    testnetConnected && operator ? await getBalance(operator.address) : null;
  const myBalance =
    testnetConnected && myWallet ? await getBalance(myWallet.address) : null;
  const contractDeployed = contractAddress !== null;

  const mainnet = mainnetAvailability();
  const liveOperator = mainnet.enabled ? await mainnetOperatorStatus() : null;
  const operatorFloorWei = parseUnits(mainnetOperatorMinBalanceUsdc(), 18);
  const operatorLow =
    liveOperator?.balanceWei != null && liveOperator.balanceWei < operatorFloorWei;

  // Every wallet pays its own way (senders anchor, payers pay), so "ready"
  // only means the sandbox rails exist: chain reachable and registry live.
  // Whether a SPECIFIC action is affordable is answered per-action by the
  // anchor-preview and pay-preview endpoints against the acting wallet.
  const readyForPayments = testnetConnected && contractDeployed;

  let statusMessage: string;
  if (!testnetConnected) {
    statusMessage = `${NETWORK_NAME} cannot be reached right now. Invoices still seal and save locally; anchoring and payments resume automatically once the network is back.`;
  } else if (!contractDeployed) {
    statusMessage = `The registry contract is not configured for ${NETWORK_NAME}. Sealing still works; anchoring waits until it is.`;
  } else {
    statusMessage = `Connected to ${NETWORK_NAME} (chain ${ARC_CHAIN_ID}). Every transaction is real and paid by the wallet that acts: senders cover their own anchor fee, payers cover the invoice amount plus gas. Top up your sandbox wallet with free test USDC at ${FAUCET_URL}.`;
    if (mainnet.enabled) {
      statusMessage += ` Live invoices on ${ARC_MAINNET.name} are on: Envelo pays the anchor, and clients pay from their own wallet in real USDC.`;
    }
  }

  res.json(
    GetChainStatusResponse.parse({
      network: NETWORK_NAME,
      chainId: ARC_CHAIN_ID,
      rpcConnected: testnetConnected,
      contractAddress,
      contractDeployed,
      operatorAddress: operator?.address ?? null,
      operatorBalanceUsdc:
        operatorBalance === null ? null : formatUsdc(operatorBalance),
      myWalletAddress: myWallet?.address ?? null,
      myBalanceUsdc: myBalance === null ? null : formatUsdc(myBalance),
      faucetUrl: FAUCET_URL,
      explorerBaseUrl: EXPLORER_BASE_URL,
      readyForPayments,
      statusMessage,
      mainnetEnabled: mainnet.enabled,
      chains: [
        {
          key: ARC_TESTNET.key,
          mode: ARC_TESTNET.mode,
          name: ARC_TESTNET.name,
          chainId: ARC_TESTNET.chainId,
          explorerBaseUrl: ARC_TESTNET.explorerBaseUrl,
          faucetUrl: ARC_TESTNET.faucetUrl,
          rpcConnected: testnetConnected,
          contractAddress,
          enabled: true,
          disabledReason: null,
          anchorPaidBy: anchorPayerFor(ARC_TESTNET),
          operatorAddress: null,
          operatorBalanceUsdc: null,
          operatorLow: false,
        },
        {
          key: ARC_MAINNET.key,
          mode: ARC_MAINNET.mode,
          name: ARC_MAINNET.name,
          chainId: ARC_MAINNET.chainId,
          explorerBaseUrl: ARC_MAINNET.explorerBaseUrl,
          faucetUrl: null,
          rpcConnected: mainnetConnected,
          contractAddress: ARC_MAINNET.registryAddress,
          enabled: mainnet.enabled,
          disabledReason: mainnet.enabled ? null : mainnetDisabledReason(mainnet.reason),
          anchorPaidBy: anchorPayerFor(ARC_MAINNET),
          operatorAddress: liveOperator?.address ?? null,
          operatorBalanceUsdc:
            liveOperator?.balanceWei == null
              ? null
              : formatUsdc(liveOperator.balanceWei),
          operatorLow,
        },
      ],
    }),
  );
});

/**
 * Everything the create route needs to know about anchoring on a network for
 * one sender, computed by the same rules the route enforces: who pays, the
 * live fee, whether they can cover it, where payments will land, and the
 * plain-language blocker if creation would be refused. Shared with the
 * anchor-preview endpoint so the sheet and the server can never disagree.
 */
export async function assessAnchor(userId: string, network: ArcNetwork) {
  const [user] = await db
    .select({ payoutAddress: usersTable.payoutAddress })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  const payoutAddress = user?.payoutAddress ?? null;
  const paidBy = anchorPayerFor(network);

  let walletAddress: string | null;
  let blocker: string | null = null;
  if (network.mode === "live") {
    const availability = mainnetAvailability();
    if (!availability.enabled) {
      walletAddress = null;
      blocker = mainnetDisabledReason(availability.reason);
    } else {
      walletAddress = availability.operatorAddress;
      if (!payoutAddress) {
        blocker =
          "Live invoices are paid straight to your own wallet, so link a payout wallet in Settings before creating one on Arc Mainnet.";
      }
    }
  } else {
    walletAddress = await ensureWalletFor(userId);
    if (!network.registryAddress) {
      blocker = `The registry contract is not configured for ${network.name} yet, so nothing can be anchored there.`;
    }
  }

  const [feeWei, balanceWei] = walletAddress
    ? await Promise.all([
        estimateAnchorFeeWei(network, walletAddress),
        getBalance(walletAddress, network),
      ])
    : [null, null];
  const verdict =
    balanceWei !== null && feeWei !== null
      ? decideAffordability(balanceWei, feeWei)
      : null;

  if (!blocker && network.mode === "live") {
    // Real money: no honest fee or balance means no anchor, and an operator
    // below the fee (or its configured floor) is refused up front instead of
    // failing quietly in the background.
    const floorWei = parseUnits(mainnetOperatorMinBalanceUsdc(), 18);
    if (feeWei === null || balanceWei === null) {
      blocker = `${network.name} did not return a fee estimate or balance just now, so a live invoice cannot be priced. Try again in a moment.`;
    } else if (!verdict?.canAfford || balanceWei < floorWei) {
      blocker = `Envelo's operator wallet on ${network.name} holds ${formatFeeUsdc(balanceWei)} USDC, which is not enough to anchor safely right now (it keeps a ${mainnetOperatorMinBalanceUsdc()} USDC floor). Live invoicing resumes once it is topped up.`;
    }
  }

  return {
    network,
    paidBy,
    walletAddress,
    feeWei,
    balanceWei,
    verdict,
    payoutAddress,
    blocker,
  };
}

// What the Seal & Send approval sheet shows. Every value is a live server
// fact: the registry address, the network constants the server actually
// uses, a fee estimated against the chain AT THIS MOMENT, the paying wallet's
// real balance, and one verdict (canAfford) computed by the same rule the
// create route enforces. Sandbox anchors are paid by the sender's own
// built-in wallet; live anchors by Envelo's operator wallet.
router.get("/chain/anchor-preview", async (req, res) => {
  const userId = userIdOf(req);
  const requested = req.query["network"];
  const network = isArcNetworkKey(requested) ? networkByKey(requested) : ARC_TESTNET;
  const a = await assessAnchor(userId, network);
  res.json(
    GetAnchorPreviewResponse.parse({
      network: network.name,
      networkKey: network.key,
      networkMode: network.mode,
      chainId: network.chainId,
      contractAddress: network.registryAddress,
      explorerBaseUrl: network.explorerBaseUrl,
      faucetUrl: network.faucetUrl,
      feeEstimateUsdc: a.feeWei === null ? null : formatFeeUsdc(a.feeWei),
      anchorPaidBy: a.paidBy,
      walletAddress: a.walletAddress,
      walletBalanceUsdc: a.balanceWei === null ? null : formatFeeUsdc(a.balanceWei),
      canAfford: a.verdict === null ? null : a.verdict.canAfford,
      shortfallUsdc:
        a.verdict !== null && !a.verdict.canAfford
          ? formatFeeUsdc(a.verdict.shortfallWei)
          : null,
      payoutAddress: a.payoutAddress,
      blocker: a.blocker,
    }),
  );
});

export default router;
