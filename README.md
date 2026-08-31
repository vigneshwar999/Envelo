# Envelo

**Private paperwork. Public proof.**

Envelo is a privacy-first invoicing platform built on Circle's Arc Testnet. Invoice details are sealed (encrypted) in the sender's browser before they ever leave the device, a tamper-evident fingerprint of every envelope is anchored on-chain, and payments settle in test USDC. Only the parties to an invoice can open the envelope — everyone else can still verify the proof.

> **Testnet project** — all balances are test USDC on Arc Testnet. No real money moves.

---

## How it works

| Step | What happens | Where |
| --- | --- | --- |
| 1. Seal | Invoice details are encrypted with AES-256-GCM before leaving the device | Browser |
| 2. Anchor | A SHA-256 fingerprint of the sealed envelope is committed on-chain | Arc Testnet |
| 3. Settle | The recipient pays the invoice in test USDC | Arc Testnet |
| 4. Verify | Anyone can check integrity against the anchor — without seeing the contents | Public |

### Trust boundary

| Zone | Sees plaintext | Stores |
| --- | --- | --- |
| Your browser | Yes | Envelope keys (client-side) |
| API server | No | Ciphertext + routing metadata only |
| Arc Testnet | No | Fingerprints and USDC transfers only |

## Repository structure

```
.
├── artifacts/
│   ├── sealed-invoices/   # Web app — React + Vite (marketing site + signed-in dashboard)
│   ├── api-server/        # Node.js API server (TypeScript)
│   ├── mobile/            # Expo (React Native) companion app
│   ├── arc-pitch-deck/    # Investor pitch deck (web slides)
│   └── demo-video/        # Animated product demo (web)
├── lib/
│   ├── api-spec/          # OpenAPI specification (single source of truth for the API)
│   ├── api-zod/           # Zod schemas generated from the spec
│   ├── api-client-react/  # Typed React client hooks
│   └── db/                # Drizzle ORM schema + migrations
├── package.json           # pnpm workspace root
└── pnpm-workspace.yaml
```

## Tech stack

- **Frontend** — React 18, Vite, Tailwind CSS v4, shadcn/ui, framer-motion
- **Backend** — Node.js (Express) + TypeScript, PostgreSQL with Drizzle ORM
- **Auth** — Clerk
- **Chain** — Arc Testnet (EVM-compatible), test USDC settlement
- **Mobile** — Expo / React Native
- **Quality** — Playwright end-to-end suite, Vitest, strict TypeScript across the workspace

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- PostgreSQL database

### Install

```bash
pnpm install
```

### Environment variables

| Variable | Used by | Description |
| --- | --- | --- |
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | API server | Clerk backend key |
| `CLERK_PUBLISHABLE_KEY` | API server | Clerk frontend key (verification) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Web app | Clerk frontend key |
| `PORT` | Every app | Port the dev server binds to (required) |
| `BASE_PATH` | Web apps | Base URL path, e.g. `/` |

### Run

```bash
# Push the database schema
DATABASE_URL=... pnpm --filter @workspace/db push

# API server
PORT=3001 pnpm --filter @workspace/api-server dev

# Web app
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sealed-invoices dev
```

Each artifact has its own README with details.

## Testing

```bash
pnpm run typecheck                                     # strict TS across the workspace
pnpm --filter @workspace/api-server test               # API unit tests (Vitest)
pnpm --filter @workspace/sealed-invoices test:e2e      # Playwright end-to-end suite
pnpm run build                                         # full workspace build
```

## Key features

- Client-side sealing — invoice details are encrypted before anything is stored
- On-chain anchoring — anyone can verify an invoice's fingerprint without seeing its contents
- Test USDC settlement with deposits, withdrawals, and wallet management
- Envelope key lifecycle — backup, restore, rotation, and lost-key reset
- Full e2e regression suite covering sealing, anchoring, settlement, and key flows

---

*Envelo runs exclusively on Arc Testnet. It is a demonstration project and not a financial product.*
