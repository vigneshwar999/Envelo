# Envelo — Web App

The main Envelo web application: public marketing pages plus the signed-in product (dashboard, invoice creation, wallet, envelope key management).

## Stack

React 18 · Vite · Tailwind CSS v4 · shadcn/ui · framer-motion · Clerk · TanStack Query

## Develop

```bash
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sealed-invoices dev
```

Requires `VITE_CLERK_PUBLISHABLE_KEY` and a running API server (see `artifacts/api-server`).

## Build

```bash
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/sealed-invoices build
```

## End-to-end tests

Playwright specs live in `e2e/`:

```bash
pnpm --filter @workspace/sealed-invoices test:e2e
```

## Layout

```
src/
├── pages/        # Route components (Explore, Dashboard, InvoiceDetail, ...)
├── components/   # Layout shell, marketing sections, UI primitives
├── crypto/       # Client-side sealing (AES-256-GCM) and key handling
└── lib/          # API client, analytics, helpers
```
