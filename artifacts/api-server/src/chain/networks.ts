// The two Arc networks Envelo can write to, described once. Everything that
// differs between the sandbox and real money lives here; the rest of the
// chain code takes an ArcNetwork and never hard-codes a URL or chain id.
//
// Facts (from docs.arc.io, checked 2026-09-24):
//   testnet  chain id 5042002, RPC https://rpc.testnet.arc.io,
//            explorer https://explorer.testnet.arc.io, faucet faucet.circle.com
//   mainnet  chain id 5042,    RPC https://rpc.mainnet.arc.io,
//            explorer https://explorer.arc.io, no faucet (real USDC)
// On both, USDC is the native currency with 18 decimals (msg.value is USDC).
import {
  createPublicClient,
  defineChain,
  http,
  isAddress,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

export type ArcNetworkKey = "testnet" | "mainnet";

/**
 * How money moves on this network:
 *   sandbox - test USDC; every user has an app-managed custodial wallet that
 *             anchors and pays for them (the demo experience).
 *   live    - real USDC; Envelo's operator wallet pays the anchor, the client
 *             pays from their own wallet, and the app never holds funds.
 */
export type ArcNetworkMode = "sandbox" | "live";

export const REGISTRY_VERSION = 4;

export interface ArcNetwork {
  key: ArcNetworkKey;
  mode: ArcNetworkMode;
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerBaseUrl: string;
  /** Where to get free funds - only the sandbox has one. */
  faucetUrl: string | null;
  chain: Chain;
  publicClient: PublicClient;
  /**
   * The current (v4) registry on this network, or null until it is deployed
   * and configured. Invoices anchored earlier keep their own pinned address.
   */
  registryAddress: Address | null;
}

function readAddressEnv(name: string, fallback: Address | null): Address | null {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  if (!isAddress(raw)) {
    throw new Error(`${name} is set but is not a valid address`);
  }
  return raw as Address;
}

function build(args: {
  key: ArcNetworkKey;
  mode: ArcNetworkMode;
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerBaseUrl: string;
  faucetUrl: string | null;
  registryAddress: Address | null;
}): ArcNetwork {
  const chain = defineChain({
    id: args.chainId,
    name: args.name,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [args.rpcUrl] } },
    blockExplorers: {
      default: { name: "Arc Explorer", url: args.explorerBaseUrl },
    },
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(args.rpcUrl, { timeout: 8_000 }),
  });
  return { ...args, chain, publicClient };
}

/**
 * Registry addresses baked in after each deployment (scripts/deploy-registry.mjs)
 * so every environment that runs this code talks to the same contract. An
 * env var overrides them, which is how a redeploy is rolled out without a
 * code change.
 */
// SealedInvoiceRegistry v4 on Arc Testnet, deployed 2026-09-24 (open anchorer,
// senders anchor from their own sandbox wallets). Same address in dev and prod.
const TESTNET_REGISTRY_DEFAULT: Address | null =
  "0xde0565b22c4451e714c81f5a0ce5f83b6d11e51d";
const MAINNET_REGISTRY_DEFAULT: Address | null = null;

export const ARC_TESTNET: ArcNetwork = build({
  key: "testnet",
  mode: "sandbox",
  chainId: 5042002,
  name: "Arc Testnet",
  rpcUrl: process.env["ARC_TESTNET_RPC_URL"]?.trim() || "https://rpc.testnet.arc.io",
  explorerBaseUrl: "https://explorer.testnet.arc.io",
  faucetUrl: "https://faucet.circle.com",
  registryAddress: readAddressEnv(
    "ARC_TESTNET_REGISTRY_ADDRESS",
    TESTNET_REGISTRY_DEFAULT,
  ),
});

export const ARC_MAINNET: ArcNetwork = build({
  key: "mainnet",
  mode: "live",
  chainId: 5042,
  name: "Arc Mainnet",
  rpcUrl: process.env["ARC_MAINNET_RPC_URL"]?.trim() || "https://rpc.mainnet.arc.io",
  explorerBaseUrl: "https://explorer.arc.io",
  faucetUrl: null,
  registryAddress: readAddressEnv(
    "ARC_MAINNET_REGISTRY_ADDRESS",
    MAINNET_REGISTRY_DEFAULT,
  ),
});

export const ARC_NETWORKS: readonly ArcNetwork[] = [ARC_TESTNET, ARC_MAINNET];

export function networkByKey(key: ArcNetworkKey): ArcNetwork {
  return key === "mainnet" ? ARC_MAINNET : ARC_TESTNET;
}

/** Every invoice row carries its chain id; this turns it back into a profile. */
export function networkForChainId(chainId: number): ArcNetwork {
  const found = ARC_NETWORKS.find((n) => n.chainId === chainId);
  if (!found) throw new Error(`Unknown Arc chain id ${chainId}`);
  return found;
}

export function isArcNetworkKey(value: unknown): value is ArcNetworkKey {
  return value === "testnet" || value === "mainnet";
}

// ------------------------------------------------------- mainnet operator

/**
 * The operator key signs every mainnet anchor (the registry there only
 * accepts anchors from this address). It is read from the environment on
 * each use, never cached in module state and never logged. A malformed key
 * is treated as "not configured" but logged once, so a typo in the secret
 * cannot silently pass as an intentional off switch.
 */
let warnedBadOperatorKey = false;

export function mainnetOperatorAccount(): PrivateKeyAccount | null {
  const raw = process.env["ARC_MAINNET_OPERATOR_PRIVATE_KEY"]?.trim();
  if (!raw) return null;
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    if (!warnedBadOperatorKey) {
      warnedBadOperatorKey = true;
      console.error(
        "ARC_MAINNET_OPERATOR_PRIVATE_KEY is set but is not a 32-byte hex key; mainnet stays disabled",
      );
    }
    return null;
  }
  return privateKeyToAccount(key as `0x${string}`);
}

/** The operator wallet must keep at least this much USDC for anchor gas. */
export function mainnetOperatorMinBalanceUsdc(): string {
  const raw = process.env["ARC_MAINNET_OPERATOR_MIN_BALANCE_USDC"]?.trim();
  return raw && /^\d+(\.\d+)?$/.test(raw) ? raw : "1";
}

export type MainnetAvailability =
  | { enabled: true; operatorAddress: Address; registryAddress: Address }
  | {
      enabled: false;
      reason: "flag_off" | "no_operator_key" | "no_registry";
    };

/**
 * The explicit on switch. Off, nothing new is signed for or offered on Arc
 * Mainnet - no anchors, no wallet payments - while reads, verification and
 * the settlement of payments already broadcast keep working.
 */
export function mainnetSwitchedOn(): boolean {
  return process.env["ARC_MAINNET_ENABLED"]?.trim() === "true";
}

/**
 * Live invoicing needs three things at once: the explicit on switch, the
 * operator key, and a deployed registry. Missing any of them keeps mainnet
 * off, and the status endpoint says which one so the fix is obvious.
 */
export function mainnetAvailability(): MainnetAvailability {
  if (!mainnetSwitchedOn()) {
    return { enabled: false, reason: "flag_off" };
  }
  const operator = mainnetOperatorAccount();
  if (!operator) return { enabled: false, reason: "no_operator_key" };
  if (!ARC_MAINNET.registryAddress) return { enabled: false, reason: "no_registry" };
  return {
    enabled: true,
    operatorAddress: operator.address,
    registryAddress: ARC_MAINNET.registryAddress,
  };
}

export function isMainnetEnabled(): boolean {
  return mainnetAvailability().enabled;
}

/**
 * Which networks a user may create an invoice on right now. The sandbox is
 * always there; live joins once mainnet is fully configured.
 */
export function creatableNetworks(): ArcNetwork[] {
  return isMainnetEnabled() ? [ARC_TESTNET, ARC_MAINNET] : [ARC_TESTNET];
}
