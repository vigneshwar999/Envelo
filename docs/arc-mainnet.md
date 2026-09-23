# Envelo on Arc mainnet

Envelo runs on two Arc networks from one codebase. Every invoice is created on exactly one of them and carries that choice for life: its chain id, the registry it was anchored to, the explorer its links point at and the way it gets paid all come from the invoice row, never from a global setting.

| | Sandbox | Live |
| --- | --- | --- |
| Network | Arc Testnet, chain id `5042002` | Arc Mainnet, chain id `5042` |
| RPC | `https://rpc.testnet.arc.io` | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.testnet.arc.io` | `https://explorer.arc.io` |
| Money | test USDC from `faucet.circle.com` | real USDC |
| Who anchors | the sender, from the app-managed sandbox wallet | Envelo's operator wallet |
| Who pays | the client, from the app-managed sandbox wallet (or their own browser wallet) | the client, from their own browser wallet only |
| Where the money lands | the sender's sandbox wallet, or a linked payout address | the sender's linked payout address (required) |
| Registry | `SealedInvoiceRegistry` v4 at `0xde0565b22c4451e714c81f5a0ce5f83b6d11e51d` | `SealedInvoiceRegistry` v4, address in `artifacts/api-server/src/chain/networks.ts` |

On both networks USDC is the native currency with 18 decimals, so `payInvoice` moves `msg.value` and there is no ERC-20 approval step.

## Principles

1. **Envelo never holds real money.** The app-managed wallets with keys in Postgres exist for the sandbox only. A live invoice is anchored by the operator wallet and paid from a wallet the client controls straight to a wallet the sender controls. There is no custodial balance, no sweep, and nothing to withdraw.
2. **The sandbox stays.** Testnet is the free place to try Envelo, run the demo and run the tests. Nothing about it changed for existing invoices; anchors made on the earlier v3 registry stay verifiable because every invoice remembers its own registry address.
3. **No silent fallbacks on live.** The sandbox still uses a fixed 0.1 test-USDC fee estimate when the RPC cannot estimate gas. Live does not: if the fee cannot be estimated, the operator wallet is below its floor, or the registry is not configured, the request fails with a plain-language reason and the invoice is not created.
4. **Truthful copy.** Network names, currency labels, explorer links and faucet hints are rendered from the API's chain description, not from strings in the web or mobile app. The amount of a payment is public on the chain; Envelo says so and claims no confidential transfers.

## What the v4 registry enforces

`contracts/SealedInvoiceRegistry.sol` version 4 is deployed on both networks.

- `anchorInvoice(key, fingerprint, commitment)` stores the SHA-256 fingerprint of the invoice plaintext plus `keccak256(payee, amount, salt)`. On mainnet only the operator address may anchor; on testnet the registry is open because every sender anchors from their own sandbox wallet.
- `payInvoice(key, payee, salt)` reverts unless `msg.value` and `payee` reproduce the commitment, forwards the USDC to `payee` and emits `InvoicePaid(key, payer, payee, amount)`. Nobody can mark an invoice paid with the wrong amount or to the wrong address, whoever they are.
- The server never trusts a `paid` flag alone. For both payment paths it loads the receipt, finds the registry's `InvoicePaid` log for that invoice key and only then records `pay_tx_hash`, the payer and the paid time.

The payee and salt are fixed when the invoice is created. On live the sender must have a linked payout address first; the creation form says so before anything is sealed.

## How a live invoice moves

1. **Create.** The sender picks Live in the network selector. The approval sheet shows the network, the registry, that Envelo pays the anchor, and the payout address the money will go to.
2. **Anchor.** The API signs `anchorInvoice` with the operator key (`ARC_MAINNET_OPERATOR_PRIVATE_KEY`) and retries in the background until the receipt lands. While the operator balance is under `ARC_MAINNET_OPERATOR_MIN_BALANCE_USDC` (default 1 USDC) the approval sheet explains why and creating a live invoice is refused; an invoice created before that keeps retrying.
3. **Pay.** The client opens the invoice and presses "Pay from wallet". The API builds the exact transaction (`to`, `data`, `value`, chain id) from the invoice row; the browser asks the client's wallet (MetaMask, Rabby, Coinbase Wallet, Rainbow or any EIP-1193 provider) to switch to Arc Mainnet, adding it if needed, and to sign that transaction unchanged.
4. **Confirm.** The browser posts the transaction hash to `POST /invoices/{id}/payment-submitted`. The server checks the receipt for the `InvoicePaid` event and answers `paid` or `pending`; the page keeps asking every few seconds until it is paid. The audit trail links the transaction on `explorer.arc.io`.
5. **Verify.** "Verify Content Matches Record" recomputes the fingerprint in the browser and compares it with the database and with the registry on the invoice's own network. The keep-a-copy file records the network name, chain id and anchor transaction so the check works without Envelo.

Nothing about sealing, grants, key backup or the lost-key reset depends on the network.

## Configuration

Mainnet is off until all three are true. `GET /chain/status` reports which one is missing (`flag_off`, `no_operator_key`, `no_registry`).

| Setting | Meaning |
| --- | --- |
| `ARC_MAINNET_ENABLED=true` | the explicit on switch; off, nothing new is signed for or offered on mainnet (no anchors, no wallet payments) while reads, verification and the settlement of payments already sent keep working |
| `ARC_MAINNET_OPERATOR_PRIVATE_KEY` | secret; signs every mainnet anchor, never logged, read on each use |
| `ARC_MAINNET_REGISTRY_ADDRESS` | optional override of the address baked into `networks.ts` |
| `ARC_MAINNET_OPERATOR_MIN_BALANCE_USDC` | optional floor, default `1`; anchoring refuses below it and the status panel shows a low-balance warning |
| `ARC_MAINNET_RPC_URL` / `ARC_TESTNET_RPC_URL` | optional private RPC endpoints; the browser uses the public ones for wallet network switching |

Production runs on Replit autoscale: after changing any of these in the deployment's environment, republish so the new values take effect.

## Runbook

**Deploy or redeploy the registry** (one-time per network, paid by the deployer):

```
cd artifacts/api-server
DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy-registry.mjs --network mainnet --anchorer <operator address>
```

The script refuses to deploy an open registry on mainnet. Bake the printed address into `networks.ts` (or set `ARC_MAINNET_REGISTRY_ADDRESS`) and restart the API.

**Fund the operator.** Send USDC on Arc Mainnet to the operator address shown in the Network Status panel. An anchor costs on the order of 0.001 to 0.005 USDC, so 10 USDC covers thousands of invoices. Watch `operatorBalanceUsdc` and `operatorLow` in `GET /chain/status`.

**Rotate the operator key.** Deploy a fresh registry with the new address as anchorer (old anchors stay readable on the old registry because invoices pin their registry), update the secret and the address, republish. Invoices still `pending` at rotation time anchor on the new registry.

**Pause or roll back.** Set `ARC_MAINNET_ENABLED=false` and republish. Creating live invoices stops, pending live anchors stop retrying, and the Pay sheet on live invoices shows "Live payments are paused" instead of a wallet transaction. Nothing already on the chain is affected: verification keeps working, a payment that was already broadcast still settles through `payment-submitted` and the 15-second reconciliation on invoice reads, and everything resumes when the flag is set back.

**Rotation safety.** An anchor that was signed but not yet mined when the key or registry changed is never rebroadcast: the API recovers its signer and target from the stored bytes, and if either differs from the current operator or registry it discards the intent and signs a fresh one (or, if the old transaction did land, pins the invoice to the registry it landed on).

## Tests

- `artifacts/api-server`: `pnpm run test` covers the v4 payment commitment (the exact Solidity preimage rule), the `anchorInvoice` and `payInvoice` calldata, and the `InvoicePaid` log validation that rejects look-alike events, other invoices, wrong payees and wrong amounts.
- `artifacts/sealed-invoices/e2e/pay-invoice.spec.ts` pays a real sandbox invoice both ways: from the app-managed wallet, and from a browser wallet (a minimal EIP-1193 provider whose `eth_sendTransaction` is signed in Node with the persona's funded key and broadcast to Arc Testnet, so the server's receipt check runs against a real transaction).
- Mainnet is never exercised by automated tests. A manual smoke test after each deploy: create one live invoice for 0.01 USDC, pay it from a browser wallet, check the transaction on `explorer.arc.io` and run Verify.

## Not in scope

- Moving sandbox invoices to live. Sandbox data stays on the sandbox.
- Sponsoring client gas. A payment costs the client a fraction of a cent; a paymaster would add a risk surface for no user benefit.
- Confidential amounts. The transfer amount is public on Arc today; Envelo will not claim otherwise until Arc ships confidential transfers.
- Any change to the browser-side encryption model.
