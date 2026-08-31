# Envelo

**Private paperwork. Public proof.**

Envelo is a privacy-first invoicing app built on Circle's Arc Testnet. Sensitive invoice details are sealed (encrypted) in the sender's browser, a tamper-evident fingerprint is anchored on-chain, and payments settle in test USDC. Only the parties to an invoice can open the envelope — everyone else can still verify the proof.

> Testnet project: all balances are test USDC on Arc Testnet. No real money moves.

## What's inside

This is a pnpm workspace monorepo:

| Path | What it is |
| --- | --- |
| `artifacts/sealed-invoices` | Web app (React + Vite) — public pages and the signed-in dashboard |
| `artifacts/api-server` | Node API server backing the app |
| `artifacts/mobile` | Expo (React Native) mobile companion |
| `artifacts/arc-pitch-deck` | Pitch deck |
| `artifacts/demo-video` | Animated demo video |
| `artifacts/mockup-sandbox` | Internal component preview sandbox |

## Features

- Envelopes sealed client-side: invoice details are encrypted in the browser before anything is stored
- On-chain anchoring on Arc Testnet, so anyone can verify an invoice's fingerprint without seeing its contents
- Test USDC settlement with deposits, withdrawals, and wallet management
- Envelope key lifecycle: backup, restore, rotation, and lost-key reset
- Clerk authentication
- Playwright end-to-end suite covering the core flows

## Running locally

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/sealed-invoices run dev
```

Authentication requires Clerk keys in the environment: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, and `SESSION_SECRET`.

Built on [Replit](https://replit.com).
