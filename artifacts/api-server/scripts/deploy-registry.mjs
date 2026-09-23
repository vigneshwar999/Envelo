// Deploy SealedInvoiceRegistry (v4) to Arc Testnet or Arc Mainnet.
//
//   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-registry.mjs --network testnet [--anchorer 0x...]
//   DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-registry.mjs --network mainnet --anchorer 0x...
//
// The deployer becomes the contract owner. `--anchorer` is the only address
// allowed to anchor; omit it (or pass the zero address) to let anyone anchor,
// which is what the sandbox wants (senders anchor from their own wallets).
// On mainnet always pass Envelo's operator address. Never paste a key into
// the command line: put it in the DEPLOYER_PRIVATE_KEY environment variable.
//
// After a successful deploy, bake the printed address into
// src/chain/networks.ts (TESTNET_REGISTRY_DEFAULT / MAINNET_REGISTRY_DEFAULT),
// or set ARC_<NETWORK>_REGISTRY_ADDRESS in the environment.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeDeployData,
  formatUnits,
  http,
  isAddress,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const NETWORKS = {
  testnet: {
    chainId: 5042002,
    name: "Arc Testnet",
    rpcUrl: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.io",
    explorer: "https://explorer.testnet.arc.io",
  },
  mainnet: {
    chainId: 5042,
    name: "Arc Mainnet",
    rpcUrl: process.env.ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
  },
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const networkKey = arg("network");
const network = NETWORKS[networkKey];
if (!network) {
  console.error("Usage: --network testnet|mainnet [--anchorer 0x...]");
  process.exit(1);
}
const anchorer = arg("anchorer") ?? zeroAddress;
if (!isAddress(anchorer)) {
  console.error("--anchorer must be an address");
  process.exit(1);
}
if (networkKey === "mainnet" && anchorer === zeroAddress) {
  console.error("Refusing to deploy an open (anyone-can-anchor) registry on mainnet; pass --anchorer");
  process.exit(1);
}
const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
if (!rawKey) {
  console.error("Set DEPLOYER_PRIVATE_KEY in the environment (never on the command line)");
  process.exit(1);
}
const key = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
  console.error("DEPLOYER_PRIVATE_KEY is not a 32-byte hex key");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const artifactSource = readFileSync(
  join(here, "..", "src", "chain", "registryArtifact.ts"),
  "utf8",
);
const abi = JSON.parse(
  artifactSource.match(/export const REGISTRY_ABI = ([\s\S]*?) as const;/)[1],
);
const bytecode = JSON.parse(
  artifactSource.match(/export const REGISTRY_BYTECODE = ("0x[0-9a-f]+") as const;/)[1],
);

const chain = defineChain({
  id: network.chainId,
  name: network.name,
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [network.rpcUrl] } },
});
const account = privateKeyToAccount(key);
const transport = http(network.rpcUrl, { timeout: 20_000 });
const publicClient = createPublicClient({ chain, transport });
const wallet = createWalletClient({ account, chain, transport });

const liveChainId = await publicClient.getChainId();
if (liveChainId !== network.chainId) {
  console.error(`RPC reports chain ${liveChainId}, expected ${network.chainId}`);
  process.exit(1);
}
const balance = await publicClient.getBalance({ address: account.address });
console.log(`Network:   ${network.name} (chain ${network.chainId})`);
console.log(`Deployer:  ${account.address} (${formatUnits(balance, 18)} USDC)`);
console.log(`Anchorer:  ${anchorer === zeroAddress ? "anyone (open registry)" : anchorer}`);

const gas = await publicClient.estimateGas({
  account,
  data: encodeDeployData({ abi, bytecode, args: [anchorer] }),
});
const gasPrice = await publicClient.getGasPrice();
const costWei = gas * gasPrice;
console.log(`Est. cost: ${formatUnits(costWei, 18)} USDC (${gas} gas @ ${gasPrice} wei)`);
if (balance < costWei) {
  console.error("Deployer balance cannot cover the deployment; nothing sent");
  process.exit(1);
}

const hash = await wallet.deployContract({ abi, bytecode, args: [anchorer] });
console.log(`Sent:      ${network.explorer}/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("Deployment reverted");
  process.exit(1);
}
const address = receipt.contractAddress;
const onchainAnchorer = await publicClient.readContract({
  address,
  abi,
  functionName: "anchorer",
});
const onchainOwner = await publicClient.readContract({
  address,
  abi,
  functionName: "owner",
});
console.log(`Deployed:  ${address}`);
console.log(`Explorer:  ${network.explorer}/address/${address}`);
console.log(`Owner:     ${onchainOwner}`);
console.log(`Anchorer:  ${onchainAnchorer}`);
console.log(`Block:     ${receipt.blockNumber}`);
console.log(
  `\nNext: set ${networkKey.toUpperCase()}_REGISTRY_DEFAULT in src/chain/networks.ts to "${address}" (or ARC_${networkKey.toUpperCase()}_REGISTRY_ADDRESS in the environment).`,
);
