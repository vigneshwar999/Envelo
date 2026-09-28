import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RECOVERY_PATH = '/api/internal/anchor-recovery';
const REQUEST_TIMEOUT_MS = 55_000;

function recoveryTarget(value) {
  if (!value) throw new Error('ENVELO_RECOVERY_URL is required.');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('ENVELO_RECOVERY_URL must be an absolute HTTPS URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.pathname !== RECOVERY_PATH ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`ENVELO_RECOVERY_URL must be an HTTPS URL ending in ${RECOVERY_PATH}, without credentials, query or fragment.`);
  }
  return url;
}

export async function triggerAnchorRecovery({
  url = process.env.ENVELO_RECOVERY_URL,
  secret = process.env.CRON_SECRET,
  fetchImpl = globalThis.fetch,
} = {}) {
  const target = recoveryTarget(url);
  if (!secret || typeof secret !== 'string' || secret.trim() !== secret || /[\r\n]/.test(secret)) {
    throw new Error('CRON_SECRET is required and must contain no surrounding whitespace.');
  }

  let response;
  try {
    response = await fetchImpl(target, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Do not include fetch errors in logs: an implementation could include
    // request headers, which contain the shared recovery secret.
    throw new Error('Recovery request failed or timed out; inspect the scheduler and API logs.');
  }
  if (!response.ok) {
    throw new Error(`Recovery endpoint returned HTTP ${response.status}; inspect the API logs.`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Recovery endpoint did not return valid JSON.');
  }
  if (
    !result ||
    typeof result.selected !== 'boolean' ||
    typeof result.attempted !== 'boolean' ||
    typeof result.anchored !== 'boolean' ||
    (result.attempted && !result.selected) ||
    (result.anchored && !result.attempted)
  ) {
    throw new Error('Recovery endpoint returned an unexpected result.');
  }
  if (result.selected && !result.anchored) {
    throw new Error('A pending invoice is still unanchored; inspect the API logs and retry on the next schedule.');
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await triggerAnchorRecovery();
    console.log(result.selected ? 'One invoice anchored.' : 'No pending invoice selected.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Anchor recovery failed.');
    process.exitCode = 1;
  }
}