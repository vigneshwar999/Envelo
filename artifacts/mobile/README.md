# Envelo — Mobile App

Expo (React Native) companion app for Envelo: view invoices, check envelope status, and track settlement on the go.

## Develop

```bash
PORT=8081 pnpm --filter @workspace/mobile dev
```

Then scan the QR code with Expo Go, or press `i` / `a` for a simulator.

Requires `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` for authentication and a reachable API server.

## Layout

```
app/          # File-based routes (expo-router)
components/   # Shared UI
context/      # App-wide state providers
lib/          # API client + helpers
```
