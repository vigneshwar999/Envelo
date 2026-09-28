import assert from 'node:assert/strict';
import { test } from 'node:test';
import { triggerAnchorRecovery } from './trigger-anchor-recovery.mjs';

const url = 'https://envelo.example/api/internal/anchor-recovery';
const secret = 'test-only-not-a-real-secret';

test('requires a verified HTTPS recovery path before sending the secret', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; };
  for (const badUrl of [
    'http://envelo.example/api/internal/anchor-recovery',
    'https://envelo.example/other',
    'https://user:pass@envelo.example/api/internal/anchor-recovery',
    `${url}?to=elsewhere`,
    `${url}#fragment`,
  ]) {
    await assert.rejects(triggerAnchorRecovery({ url: badUrl, secret, fetchImpl }));
  }
  await assert.rejects(triggerAnchorRecovery({ url, secret: '', fetchImpl }));
  await assert.rejects(triggerAnchorRecovery({ url, secret: `${secret}\n`, fetchImpl }));
  assert.equal(calls, 0);
});

test('sends exactly one request without following redirects', async () => {
  const result = await triggerAnchorRecovery({
    url,
    secret,
    fetchImpl: async (target, options) => {
      assert.equal(target.href, url);
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.Authorization, `Bearer ${secret}`);
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal);
      return new Response(JSON.stringify({ selected: true, attempted: true, anchored: true }), { status: 200 });
    },
  });
  assert.deepEqual(result, { selected: true, attempted: true, anchored: true });
});

test('exits with a failure when an invoice remains pending or the API fails', async () => {
  for (const body of [
    { selected: true, attempted: false, anchored: false },
    { selected: true, attempted: true, anchored: false },
  ]) {
    await assert.rejects(triggerAnchorRecovery({
      url, secret, fetchImpl: async () => new Response(JSON.stringify(body)),
    }), /still unanchored/);
  }
  await assert.rejects(triggerAnchorRecovery({
    url, secret, fetchImpl: async () => new Response('{}', { status: 503 }),
  }), /HTTP 503/);
  await assert.rejects(triggerAnchorRecovery({
    url, secret, fetchImpl: async () =>
      new Response(JSON.stringify({ selected: false, attempted: false, anchored: true })),
  }), /unexpected result/);
  await assert.rejects(triggerAnchorRecovery({
    url, secret, fetchImpl: async () => { throw new Error(`do not log ${secret}`); },
  }), (error) => !error.message.includes(secret));
  assert.deepEqual(await triggerAnchorRecovery({
    url, secret, fetchImpl: async () =>
      new Response(JSON.stringify({ selected: false, attempted: false, anchored: false })),
  }), { selected: false, attempted: false, anchored: false });
});