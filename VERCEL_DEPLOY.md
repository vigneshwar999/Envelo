# Deploying Envelo to Vercel

The GitHub repository is the deployment source. Vercel serves the web app and
the demo at `/demo-video/`, and runs the Express API under `/api`. Production
uses Supabase PostgreSQL and an independently managed Clerk application.
Replit is not needed to host or operate the production app.

## 1. Database — Supabase

1. Create a Supabase PostgreSQL project and use its **transaction pooler**
   connection string for Vercel's `DATABASE_URL` (usually port 6543). Do not
   put this string in Git, shell history, or a frontend `VITE_` variable.
2. Review schema changes before applying them to the production database.
   A new, empty database can be initialized with
   `pnpm --filter @workspace/db push` using a securely supplied `DATABASE_URL`.
   Do not run that command against a database containing existing data
   without reviewing its proposed changes and taking a backup first.
3. A repository checkout contains the **schema, not historical rows**. If an
   older provider/database or backup is located, export it first and plan a
   migration, including how old Clerk IDs and client-held envelope keys map
   to the new accounts. Do not overwrite the current production database.

## 2. Login — Clerk

1. Use your own Clerk production instance and configure its application
   domain for `envelo.online` and the sign-in methods you want.
2. Store its production publishable and secret keys in Vercel environment
   variables. The publishable key is compiled into the browser; the secret
   key must remain server-side.
3. Do **not** set `VITE_CLERK_PROXY_URL` on Vercel — that setting belongs to
   the old managed-proxy setup. Accounts in a different Clerk instance do
   not automatically appear in this one.

## 3. Hosting — Vercel

1. Import `vigneshwar999/Envelo` into Vercel and connect `main` as the
   production branch. The existing Vercel project already uses this repository.
2. Framework preset: **Other** (`vercel.json` drives install, build, output, and routing).
3. Add these **Environment Variables** before deploying:

   | Name | Value |
   | --- | --- |
    | `DATABASE_URL` | Supabase **transaction pooler** connection string |
   | `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_…`) |
   | `VITE_CLERK_PUBLISHABLE_KEY` | same publishable key (baked into the frontend at build) |
   | `CLERK_SECRET_KEY` | Clerk secret key (`sk_…`) |
   | `SESSION_SECRET` | any long random string (only used by the demo-account bootstrap API) |

   Optional: `DEMO_BOOTSTRAP_DISABLED=1` to switch the demo bootstrap route off.
4. Click **Deploy**.

## 4. First run

- Verify `/`, `/sign-in`, `/demo-video/` and `/api/healthz` after deployment.
- The first authenticated chain-status request initializes the **sandbox
  operator wallet** in the database. The first on-chain action may take longer
  than later ones. Fund a sandbox wallet only if you intend to exercise
  testnet transactions; live mainnet behavior has separate requirements.

## Updating the app

Changes can be made in any Git checkout. Review and test them, then commit to
GitHub `main` with the repository owner's approval. Vercel automatically
builds and promotes successful GitHub deployments. Avoid uploading separate
local-only deployments: that leaves the live site ahead of GitHub.

Key or database changes are made in the Vercel dashboard (Environment
Variables) — a redeploy applies them.

## Serverless caveats (testnet-tolerable)

- **Cold starts:** the first API request after idle can be slower due to
  function startup; public pages and health no longer wait for wallet setup.
- **60s request cap:** long chain operations run within a single request and
  are capped at 60 seconds (`vercel.json` → `maxDuration`).
- **Parallel instances:** simultaneous on-chain sends from separate instances
  can occasionally race on the operator wallet nonce and retry; harmless at
  demo scale.
- The repository includes local development tools that are not production
  hosting dependencies.
