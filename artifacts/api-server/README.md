# Envelo — API Server

Express (TypeScript) backend for Envelo. Stores sealed envelopes (ciphertext only), invoice metadata, and wallet state; talks to Arc Testnet (via viem) for anchoring and settlement verification.

The server never sees invoice plaintext — sealing happens in the client.

## Develop

```bash
PORT=3001 pnpm --filter @workspace/api-server dev
```

### Required environment

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `PORT` | Port to bind |

## Test

```bash
pnpm --filter @workspace/api-server test
```

## Layout

```
src/
├── routes/       # HTTP route handlers
├── middlewares/  # Auth, validation, logging
├── chain/        # Arc Testnet interaction (anchoring, USDC)
└── lib/          # Shared server utilities
```

The HTTP contract is defined in `lib/api-spec` (OpenAPI) — clients and Zod schemas are generated from it.
