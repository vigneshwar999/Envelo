# Deploying Envelo to Vercel

The repo is pre-configured for Vercel: `vercel.json` builds the web app as a
static site and runs the Express API as a serverless function under `/api`.
You need three free accounts — **Neon** (database), **Clerk** (login), and
**Vercel** (hosting) — and about 15 minutes.

## 1. Database — Neon

1. Go to [neon.tech](https://neon.tech), create a project (any name, region close to you).
2. Copy the **pooled** connection string (the host contains `-pooler`), e.g.
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
   Serverless functions need the pooled URL.
3. Create the tables — either option:
   - **From Replit (easiest):** add the Neon URL as a secret and ask the agent
     to push the schema (`pnpm --filter @workspace/db push` against it).
   - **Locally:** `DATABASE_URL="<neon url>" pnpm --filter @workspace/db push`

## 2. Login — Clerk

1. Go to [clerk.com](https://clerk.com), create an application (React), enable
   the sign-in methods you want (email, Google, …).
2. From **API keys** copy the **Publishable key** (`pk_…`) and **Secret key** (`sk_…`).
3. Do **not** set `VITE_CLERK_PROXY_URL` on Vercel — that proxy is only for the
   Replit-managed Clerk setup.

## 3. Hosting — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the
   GitHub repo `vigneshwar999/Envelo`.
2. Framework preset: **Other** (`vercel.json` drives install, build, output, and routing).
3. Add these **Environment Variables** before deploying:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** connection string |
   | `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_…`) |
   | `VITE_CLERK_PUBLISHABLE_KEY` | same publishable key (baked into the frontend at build) |
   | `CLERK_SECRET_KEY` | Clerk secret key (`sk_…`) |
   | `SESSION_SECRET` | any long random string (only used by the demo-account bootstrap API) |

   Optional: `DEMO_BOOTSTRAP_DISABLED=1` to switch the demo bootstrap route off.
4. Click **Deploy**.

## 4. First run

- The app is usable immediately after deploy.
- On the first request the server creates its **operator wallet** in the
  database; the first on-chain action (first sealed invoice) also performs
  one-time chain setup, so it can take noticeably longer than later ones.
- The operator wallet must hold Arc testnet USDC for gas — fund it the same
  way as on Replit (faucet to the operator address shown in the app).

## Updating the app

Development stays on Replit:

1. Make changes in the Replit workspace.
2. Push to GitHub (`scripts/push-to-github.sh` from the workspace — never plain `git push`).
3. Vercel auto-redeploys `main` within a minute or two.

Key or database changes are made in the Vercel dashboard (Environment
Variables) — a redeploy applies them.

## Serverless caveats (testnet-tolerable)

- **Cold starts:** the first API request after idle is slower (wallet
  bootstrap + connection setup).
- **60s request cap:** long chain operations run within a single request and
  are capped at 60 seconds (`vercel.json` → `maxDuration`).
- **Parallel instances:** simultaneous on-chain sends from separate instances
  can occasionally race on the operator wallet nonce and retry; harmless at
  demo scale.
- The Playwright e2e suite and Replit workflows remain Replit-only tooling.
