# Envelo on Arc mainnet: migration plan

Arc mainnet went live on 17 September 2026 (chain ID `5042`, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`, USDC as the native gas token with 18-decimal native accounting and a 6-decimal ERC-20 interface, fee target of about $0.001 per transfer). Envelo runs on Arc Testnet (`5042002`). This document is the plan for moving it to mainnet without turning a privacy product into an unlicensed custodian.

## What Envelo does on-chain today

- One registry contract, `SealedInvoiceRegistry` (version 3), deployed lazily by the first funded invoice sender and recorded in the `chain_state` table. Every invoice row also stores the registry address it was anchored to, so old anchors stay verifiable after a redeploy.
- Anchoring calls `anchorInvoice` with a SHA-256 fingerprint of the invoice plaintext. Payment is a second call, to the payable `payInvoice`, which forwards the native USDC to the payee and records the paid flag in the same transaction. Grants and revocations do not touch the chain.
- **What v3 does not enforce.** `anchorInvoice` is first-write-wins for anyone who knows the key, and `payInvoice` accepts any positive `msg.value`, any `payee` and any caller, then flips `paid` for good. The server marks the invoice paid from that boolean alone (`arc.ts` discards the event's amount, payer and payee). On testnet this is a demo shortcut; on mainnet it means anyone who learns an invoice key could "pay" 1 wei to themselves and block the real payment. Fixing this is a precondition for Phase 1, not a Phase 3 nicety.
- Every user gets a custodial wallet whose private key is generated server-side and stored in `chain_wallets`. This is acceptable only because test USDC has no value; the schema comment says exactly that.
- The sender pays gas for anchoring (and for the one-time registry deployment), the client pays the invoice amount plus gas. There is no gas sponsorship. Balances come from the Circle faucet, surfaced through `FAUCET_URL`.
- All chain constants are compile-time literals in `artifacts/api-server/src/chain/arc.ts` (RPC, chain ID, explorer, faucet, "Arc Testnet", "test USDC"). The web app, the mobile app and the generated API types repeat the testnet wording in around forty places, and the e2e suite funds its personas from the faucet directly.

## Principles for mainnet

1. **Never hold customer money.** Custodial wallets with plaintext keys in Postgres do not move to mainnet. Anchoring can be paid by an operator wallet Envelo controls; payments must come from wallets the client controls.
2. **Keep testnet alive.** Testnet stays the free sandbox for demos, tests and new users. The app must run against both chains from the same codebase, selected per environment, and old testnet anchors must remain verifiable.
3. **No silent fallbacks.** Today a failed gas estimate falls back to a fixed 0.1 test-USDC figure (`FEE_ESTIMATE_FALLBACK_WEI`), and a failed anchor is left `pending` for retry while the RPC is reachable, `unavailable` only when it is not. On mainnet the fixed fallback goes away: if gas cannot be estimated or the operator wallet is empty, the attempt fails loudly, the invoice stays `pending` with a visible reason, and an alert fires.
4. **Truthful copy.** Every "test USDC", "testnet" and "faucet" string is driven by the active chain profile, never hard-coded.

## Phases

### Phase 0: chain profiles (no behaviour change)

- Replace the literals in `arc.ts` with a `ChainProfile` object (`id`, `name`, `rpcUrl`, `explorerUrl`, `faucetUrl | null`, `currencyLabel`, `isTestnet`, `nativeDecimals`) and keep one client per known profile (testnet and mainnet). An `ARC_NETWORK` environment variable (`testnet` default, `mainnet` opt-in) picks the profile used for new writes; reads for an existing invoice always use the profile matching the `chain_id` stored on that invoice. Expose the active profile on `GET /chain/status` so web and mobile render names, explorer links and faucet hints from the API instead of their own strings.
- Namespace `chain_state` keys and the registry address by chain ID so a mainnet deployment cannot read the testnet contract address, and store `chain_id` on invoice rows next to the registry address.
- Validate payment receipts properly: decode the `InvoicePaid` event and compare `amount` and `payee` with the invoice before marking it paid, instead of trusting the `paid` boolean. This is a server-only change and should ship on testnet first.
- Regenerate the API types (`pnpm --filter @workspace/api-spec run codegen`) after the OpenAPI descriptions lose their testnet wording.
- Ship this to production with `ARC_NETWORK=testnet`. Nothing changes for users; the code is now capable of mainnet.

### Phase 1: anchoring on mainnet (fingerprints only, no customer funds)

- Deploy a `SealedInvoiceRegistry` **v4** on mainnet, not v3. v4 changes two things: anchoring is restricted to the operator address (the sender no longer submits the transaction on mainnet), and every anchor carries a payment commitment `keccak256(payee, amount, salt)` so that `payInvoice(invoiceKey, payee, salt)` reverts unless `msg.value` and `payee` match what the sender committed to. Nothing new leaks before payment (the commitment is a hash); after payment the amount is public anyway, as it is today. Deploy and exercise v4 on testnet first, then on mainnet from an operator wallet whose key lives in a secret (not the database), with a documented rotation path. Deployment is a one-time cost of a few cents at the published fee target.
- Anchoring is paid by the operator wallet, not the sender. At about $0.001 per transaction, 10,000 anchors cost on the order of $10 to $50 including the paid-flag update, so a small prefunded balance covers a long runway. Add a balance alert (log plus email) at a configurable floor.
- Client payments stay off mainnet in this phase: an invoice anchored on mainnet can still be marked paid only through an on-chain payment (Phase 2) or not at all. Do not add a "mark as paid" button that writes an unverifiable flag; the whole point of the paid flag is that it is backed by a transfer.
- Verification (`/verify`) reads the chain recorded on the invoice, so testnet invoices verify against testnet and mainnet invoices against mainnet.
- Exit criteria: mainnet registry address published on the landing page and in `docs/`, at least one invoice anchored and verified on `explorer.arc.io`, balance alerts tested.

### Phase 2: payments from user-controlled wallets

- Clients pay from a wallet they control: MetaMask, Rabby, Coinbase Wallet or Rainbow configured for Arc (all documented by Arc), or an embedded Circle Wallet created for the user. Envelo builds the `payInvoice` transaction (the registry already forwards the USDC and records the paid flag in one call), the client signs it in their wallet, and the server watches for the receipt and records `pay_tx_hash`.
- Senders receive funds directly at a payout address they set in their profile; Envelo never sits in the middle of the money. The existing "linked payout address" path in `arc.ts` is the starting point.
- Funding a client's Arc wallet happens outside Envelo: CCTP or Circle Gateway from USDC on another chain, or an exchange withdrawal once Arc is listed. Show the client the exact amount plus estimated fee in dollars, as today.
- Mind the two faces of USDC on Arc. `payInvoice` moves the native balance (18-decimal `msg.value`); CCTP and Gateway deliver USDC through the 6-decimal ERC-20 interface. Before Phase 2 ships, confirm on testnet whether the ERC-20 interface is a view over the same native balance or a separate token that needs a wrap or unwrap step. If a step is needed, either add it to the funding flow or move payment to an ERC-20 `approve` + `transferFrom` path in v4. Either way, quote amounts with the right decimals for the path in use; a 6-versus-18 mistake is a million-fold error.
- Remove the custodial wallet creation for mainnet users entirely (the table stays for testnet). Delete the withdraw/sweep code path on mainnet; there is nothing to sweep.
- Exit criteria: an invoice paid on mainnet from a third-party wallet, paid flag verified on-chain, receipt shown in web and mobile, and the testnet demo still works unchanged.

### Phase 3: production hardening

- Operator key in a KMS or HSM-backed signer rather than a raw secret, with an audit log of every anchoring transaction.
- Confirmation policy: treat a mainnet transaction as final only after the receipt is in a finalized block (Arc has sub-second deterministic finality, so this is cheap), and make anchoring idempotent per invoice (already true for testnet through the persisted signed intent; keep it).
- Terms and privacy updates: Envelo is a software provider, the client's wallet provider holds the funds, on-chain data is public and permanent (fingerprint, addresses, amount of the transfer).
- Monitoring: RPC health, pending-anchor retry backlog, operator balance, and explorer link checks in the e2e suite (mainnet checks read-only, never paying).
- Selective-disclosure privacy for the amount on the transfer once Arc ships its planned confidential transfer features; until then the transfer amount is public, which the product copy must say.

## Decisions needed before Phase 1

| Decision | Recommendation |
| --- | --- |
| Contract version | v4 with operator-only anchoring and payee-plus-amount binding; v3 stays only for existing testnet anchors. Get an external review of v4 before mainnet payments (Phase 2). |
| Who operates the mainnet wallet | A dedicated operator key in the deployment secrets, prefunded with a small USDC balance, rotated on a schedule. |
| Whether senders ever pay anchoring gas on mainnet | No. Anchoring is Envelo's cost of goods; it is a fraction of a cent. |
| Custody | None. Payments only from user-controlled or embedded wallets the user owns. |
| Pricing | Free anchoring during Phase 1 and 2; a per-seat or per-invoice fee can come once payments work, and the fee must never depend on holding funds. |
| Legal | Confirm with counsel that a non-custodial invoice tool with public-chain anchoring needs no money-transmission licence in the operating jurisdiction before Phase 2 goes live. |

## Cost estimate at the published fee target

| Action | Approximate mainnet cost |
| --- | --- |
| Registry deployment (one-time) | a few cents |
| Anchor an invoice | ~$0.001 to $0.005 |
| Pay an invoice (transfer plus paid flag, paid by the client) | ~$0.001 |
| 10,000 invoices anchored and paid | roughly $20 to $60 |

Actual fees follow Arc's EIP-1559 market with EWMA smoothing; the app already reads `eth_gasPrice` and shows dollar estimates, so real numbers appear in the UI before any transaction is sent.

## Not in scope

- Moving testnet users or testnet invoices to mainnet. Testnet data stays on testnet.
- Sponsoring client gas. A client who pays an invoice pays a fraction of a cent in fees; hiding it adds a paymaster and a risk surface for no user benefit.
- Any change to the browser-side encryption model. Sealing, grants and key backup are chain-independent and stay as they are.
