// Talking to the user's own browser wallet (MetaMask, Rabby, Coinbase Wallet
// and friends) over the EIP-1193 provider they inject as window.ethereum.
// Used to pay an invoice from the client's own funds: the server hands us the
// exact transaction (to, data, value, chain) and this module only asks the
// wallet to be on that chain and to send it. No signing keys ever touch the
// app, and no money math happens here.

export interface ExternalPaymentRequest {
  chainId: number;
  chainIdHex: string;
  to: string;
  data: string;
  value: string;
}

export interface WalletChainInfo {
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorerBaseUrl: string;
}

/**
 * Arc's public RPC endpoints, handed to the wallet only when it has never
 * seen the chain (wallet_addEthereumChain). Public facts from docs.arc.io;
 * the server may use a private RPC of its own, which must never be shared.
 */
export function publicRpcUrlFor(chainId: number): string | null {
  switch (chainId) {
    case 5042:
      return 'https://rpc.mainnet.arc.io';
    case 5042002:
      return 'https://rpc.testnet.arc.io';
    default:
      return null;
  }
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

/** Thrown for every wallet-side problem with a message safe to show as-is. */
export class WalletError extends Error {
  readonly code: 'no_wallet' | 'rejected' | 'wrong_chain' | 'failed';
  constructor(code: WalletError['code'], message: string) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
  }
}

export function hasBrowserWallet(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum?.request;
}

function providerOrThrow(): Eip1193Provider {
  if (!hasBrowserWallet()) {
    throw new WalletError(
      'no_wallet',
      'No browser wallet was found. Install MetaMask (or another wallet extension) and reload this page.',
    );
  }
  return window.ethereum as Eip1193Provider;
}

function errorCode(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

function errorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return 'The wallet returned an error.';
}

function isUserRejection(err: unknown): boolean {
  // EIP-1193 user rejection is 4001; some wallets use 'ACTION_REJECTED'.
  const code = errorCode(err);
  if (code === 4001) return true;
  const msg = errorMessage(err).toLowerCase();
  return msg.includes('user rejected') || msg.includes('user denied');
}

/** Ask the wallet for the active account, prompting to connect if needed. */
export async function connectWallet(): Promise<string> {
  const provider = providerOrThrow();
  let accounts: unknown;
  try {
    accounts = await provider.request({ method: 'eth_requestAccounts' });
  } catch (err) {
    if (isUserRejection(err)) {
      throw new WalletError('rejected', 'You closed the wallet prompt, so nothing was connected.');
    }
    throw new WalletError('failed', errorMessage(err));
  }
  const first = Array.isArray(accounts) ? accounts[0] : undefined;
  if (typeof first !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(first)) {
    throw new WalletError('failed', 'The wallet did not return an account address.');
  }
  return first;
}

/**
 * Make sure the wallet is on the invoice's Arc network. Switches if the
 * wallet already knows the chain, otherwise offers to add it (with Arc's
 * public RPC and explorer) and then switches.
 */
export async function ensureChain(chain: WalletChainInfo): Promise<void> {
  const provider = providerOrThrow();
  const current = await provider.request({ method: 'eth_chainId' });
  if (typeof current === 'string' && current.toLowerCase() === chain.chainIdHex.toLowerCase()) {
    return;
  }
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chain.chainIdHex }],
    });
  } catch (err) {
    if (isUserRejection(err)) {
      throw new WalletError('rejected', `You declined switching the wallet to ${chain.name}.`);
    }
    // 4902: the wallet has never seen this chain. Offer to add it, which in
    // most wallets also switches to it once the user approves.
    const code = errorCode(err);
    if (code !== 4902 && !errorMessage(err).toLowerCase().includes('unrecognized chain')) {
      throw new WalletError('wrong_chain', errorMessage(err));
    }
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chain.chainIdHex,
            chainName: chain.name,
            nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.explorerBaseUrl],
          },
        ],
      });
    } catch (addErr) {
      if (isUserRejection(addErr)) {
        throw new WalletError('rejected', `You declined adding ${chain.name} to the wallet.`);
      }
      throw new WalletError('wrong_chain', errorMessage(addErr));
    }
  }
  const after = await provider.request({ method: 'eth_chainId' });
  if (typeof after !== 'string' || after.toLowerCase() !== chain.chainIdHex.toLowerCase()) {
    throw new WalletError(
      'wrong_chain',
      `The wallet is not on ${chain.name}. Switch networks in the wallet and try again.`,
    );
  }
}

/**
 * Send the server-built payment exactly as given. Returns the transaction
 * hash the wallet reports; the server then verifies the receipt on-chain
 * before anything is marked paid.
 */
export async function sendPayment(from: string, tx: ExternalPaymentRequest): Promise<string> {
  const provider = providerOrThrow();
  let hash: unknown;
  try {
    hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from, to: tx.to, data: tx.data, value: tx.value }],
    });
  } catch (err) {
    if (isUserRejection(err)) {
      throw new WalletError('rejected', 'You rejected the payment in the wallet, so nothing was sent.');
    }
    throw new WalletError('failed', errorMessage(err));
  }
  if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new WalletError('failed', 'The wallet did not return a transaction hash.');
  }
  return hash;
}

/**
 * The whole flow for paying from the user's own wallet: connect, land on the
 * right Arc network, send the exact transaction. Every step can throw a
 * WalletError with a message meant for the screen.
 */
export async function payFromBrowserWallet(
  tx: ExternalPaymentRequest,
  chain: WalletChainInfo,
): Promise<{ txHash: string; from: string }> {
  const from = await connectWallet();
  await ensureChain(chain);
  const txHash = await sendPayment(from, tx);
  return { txHash, from };
}
