#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @workspace/api-server build:vercel
BASE_PATH=/ pnpm --filter @workspace/sealed-invoices build
PORT=5173 BASE_PATH=/demo-video/ pnpm --filter @workspace/demo-video build
mkdir -p artifacts/sealed-invoices/dist/public/demo-video
cp -a artifacts/demo-video/dist/public/. artifacts/sealed-invoices/dist/public/demo-video/