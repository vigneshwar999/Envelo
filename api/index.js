// Replaced by `pnpm --filter @workspace/api-server build:vercel` during build.
// Keep this entry so Vercel discovers the function before the build command.
export default function handler(_req, res) {
  res.statusCode = 503;
  res.end("API bundle was not built");
}