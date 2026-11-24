import { useQuery } from '@tanstack/react-query';
import { publicRpcUrlFor } from './wallet';

// Read-only: the USDC balance of an address on Arc Mainnet, straight from
// Arc's public RPC. No wallet prompt, no signing; works for a pasted address
// as well as a connected one. USDC is Arc's native currency (18 decimals).

const ARC_MAINNET_CHAIN_ID = 5042;

async function fetchMainnetBalanceWei(address: string): Promise<bigint> {
  const rpc = publicRpcUrlFor(ARC_MAINNET_CHAIN_ID);
  if (!rpc) throw new Error('No Arc Mainnet RPC');
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
  });
  if (!res.ok) throw new Error(`Arc Mainnet RPC answered ${res.status}`);
  const body = (await res.json()) as { result?: unknown };
  if (typeof body.result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(body.result)) {
    throw new Error('Arc Mainnet RPC returned no balance');
  }
  return BigInt(body.result);
}

/** "18000000000000000" -> "0.018"; at most 4 decimals, never shows a positive balance as 0. */
export function formatUsdcWei(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  if (whole === 0n && !frac) return wei > 0n ? '<0.0001' : '0';
  return `${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''}`;
}

export function useMainnetBalance(address: string | null | undefined, active = true) {
  const valid = !!address && /^0x[0-9a-fA-F]{40}$/.test(address);
  return useQuery({
    queryKey: ['arc-mainnet-balance', address?.toLowerCase()],
    queryFn: () => fetchMainnetBalanceWei(address as string),
    enabled: valid && active,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
