import { Router, type IRouter } from "express";
import { GetAnchorPreviewResponse, GetChainStatusResponse } from "@workspace/api-zod";
import {
  attemptChainSetup,
  decideAffordability,
  ensureWalletFor,
  estimateAnchorFeeWei,
  formatFeeUsdc,
  formatUsdc,
  getBalance,
  getContractAddress,
  getWallet,
  isRpcConnected,
  ARC_CHAIN_ID,
  EXPLORER_BASE_URL,
  FAUCET_URL,
  NETWORK_NAME,
} from "../chain/arc";
import { userIdOf } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/chain/status", async (req, res) => {
  const userId = userIdOf(req);

  // Best-effort background pass: a funded sender with a previously approved,
  // pending anchor can activate the registry and anchor in one transaction.
  attemptChainSetup().catch(() => {});

  const connected = await isRpcConnected();
  const contractAddress = await getContractAddress();
  const operator = await getWallet("operator");
  const myWallet = await getWallet(userId);

  const operatorBalance =
    connected && operator ? await getBalance(operator.address) : null;
  const myBalance =
    connected && myWallet ? await getBalance(myWallet.address) : null;
  const contractDeployed = contractAddress !== null;

  // Every wallet pays its own way now (senders anchor, payers pay), so
  // "ready" only means the rails exist: chain reachable and contract live.
  // Whether a SPECIFIC action is affordable is answered per-action by the
  // anchor-preview and pay-preview endpoints against the acting wallet.
  const readyForPayments = connected && contractDeployed;

  let statusMessage: string;
  if (!connected) {
    statusMessage = `${NETWORK_NAME} cannot be reached right now. Invoices still seal and save locally; anchoring and payments resume automatically once the network is back.`;
  } else if (!contractDeployed) {
    statusMessage = `Ready to activate on ${NETWORK_NAME}. The first funded invoice sender who confirms Seal & Send deploys the shared registry and anchors their fingerprint in one transaction. Sealed Invoices does not sponsor gas.`;
  } else {
    statusMessage = `Connected to ${NETWORK_NAME} (chain ${ARC_CHAIN_ID}). Every transaction is real and paid by the wallet that acts: senders cover their own anchor fee, payers cover the invoice amount plus gas. Top up your wallet with free test USDC at ${FAUCET_URL}.`;
  }

  res.json(
    GetChainStatusResponse.parse({
      network: NETWORK_NAME,
      chainId: ARC_CHAIN_ID,
      rpcConnected: connected,
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
    }),
  );
});

// What the Seal & Send approval sheet shows. Every value is a live server
// fact: the deployed contract address, the network constants the server
// actually uses, a fee estimated against the chain AT THIS MOMENT, the
// sender's real wallet balance, and one verdict (canAfford) computed by the
// same rule the create route enforces. The anchor fee is paid by the
// sender's own custodial wallet - there is no sponsorship.
router.get("/chain/anchor-preview", async (req, res) => {
  const userId = userIdOf(req);
  const contractAddress = await getContractAddress();
  const walletAddress = await ensureWalletFor(userId);
  const [feeWei, balanceWei] = await Promise.all([
    estimateAnchorFeeWei(walletAddress),
    getBalance(walletAddress),
  ]);
  const verdict =
    balanceWei !== null
      ? decideAffordability(balanceWei, feeWei)
      : null;
  res.json(
    GetAnchorPreviewResponse.parse({
      network: NETWORK_NAME,
      chainId: ARC_CHAIN_ID,
      contractAddress,
      explorerBaseUrl: EXPLORER_BASE_URL,
      faucetUrl: FAUCET_URL,
      feeEstimateUsdc: formatFeeUsdc(feeWei),
      walletAddress,
      walletBalanceUsdc:
        balanceWei === null ? null : formatFeeUsdc(balanceWei),
      canAfford: verdict === null ? null : verdict.canAfford,
      shortfallUsdc:
        verdict !== null && !verdict.canAfford
          ? formatFeeUsdc(verdict.shortfallWei)
          : null,
    }),
  );
});

export default router;
