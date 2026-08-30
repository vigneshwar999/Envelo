import { expect, test } from "@playwright/test";
import {
  apiGetJson,
  createInvoice,
  ensureReadyKey,
  envelopeStatus,
  mintSignInToken,
  signIn,
  storageKeys,
} from "./helpers";

// The graceful key change, end to end with the REAL crypto - the opposite of
// the lost-key drill. Rotation happens while the CURRENT key still works, so
// nothing may lock and nobody may be asked to re-share:
//
//   1. Signe seals a real invoice for Riko; Riko opens it (the seal targeted
//      his current key).
//   2. Riko dismisses the backup reminder - so its REAPPEARANCE later proves
//      rotation re-armed it, not that it simply never went away.
//   3. Riko rotates from the dashboard key card: his browser unwraps every
//      copy with the old key, re-wraps for a fresh key, and the server swaps
//      everything in one atomic request.
//   4. Proof of the swap: the stored public key actually changed.
//   5. Proof nothing broke: the SAME envelope still opens - now necessarily
//      with the NEW key, since this assertion follows a full page load that
//      reads whatever localStorage holds.
//   6. Proof nobody else noticed: Signe sees no re-share badge for this
//      invoice, the API reports her counterparty needs nothing, and her own
//      copy still opens (rotation touched none of HER rows).
//
// Personas: the same dedicated Signe/Riko pair as the lost-key drill. The
// playwright config runs specs sequentially (workers: 1), so the two specs
// never fight over Riko's key state. Each run leaves one more unpaid 0.01
// USDC drill invoice behind - expected debris on dedicated personas.

const SENDER_ID =
  process.env.LOSTKEY_SENDER_ID ?? "user_3IYk3MHOYPfNzVTHwvfUv59Ic4t"; // Signe Sender
const ROTATOR_ID =
  process.env.LOSTKEY_RESETTER_ID ?? "user_3IYk3QntMQ7G1tTrKMDY39QlaNw"; // Riko Resetter
const ROTATOR_NAME = "Riko Resetter";

test("key rotation carries every envelope over and no counterparty notices", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  const ctxR = await browser.newContext();
  const pageR = await ctxR.newPage();
  const ctxS = await browser.newContext();
  const pageS = await ctxS.newPage();
  try {
    await signIn(pageR, await mintSignInToken(ROTATOR_ID));
    await ensureReadyKey(pageR);

    await signIn(pageS, await mintSignInToken(SENDER_ID));
    await ensureReadyKey(pageS);

    // A unique marker proves decrypted CONTENT round-trips, not just flags.
    const marker = `Rotation drill ${Date.now()}`;
    const { id: invoiceId } = await createInvoice(pageS, ROTATOR_NAME, {
      numberPrefix: "ROT",
      title: "Key rotation drill",
      description: marker,
    });

    // Sanity: the current key opens the envelope BEFORE the rotation.
    await pageR.goto(`/invoices/${invoiceId}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // Dismiss the backup reminder so that seeing it again is meaningful.
    await pageR.goto("/dashboard");
    await expect(pageR.getByTestId("banner-backup-reminder")).toBeVisible({
      timeout: 30_000,
    });
    await pageR.getByTestId("button-reminder-dismiss").click();
    await expect(pageR.getByTestId("banner-backup-reminder")).toHaveCount(0);

    const [, pubKeyStorageKey] = storageKeys(ROTATOR_ID);
    const oldPubKey = await pageR.evaluate(
      (k) => localStorage.getItem(k),
      pubKeyStorageKey,
    );
    expect(oldPubKey).toBeTruthy();

    // Rotate. The dialog only closes on success - any server refusal or
    // crypto failure renders inline and keeps the explainer mounted, which
    // would fail the wait below loudly.
    await pageR.getByTestId("button-rotate-key").click();
    await expect(pageR.getByTestId("text-rotate-explainer")).toBeVisible();
    await pageR.getByTestId("button-rotate-key-confirm").click();
    await expect(pageR.getByTestId("text-rotate-explainer")).toHaveCount(0, {
      timeout: 60_000,
    });

    // The stored key really changed...
    const newPubKey = await pageR.evaluate(
      (k) => localStorage.getItem(k),
      pubKeyStorageKey,
    );
    expect(newPubKey).toBeTruthy();
    expect(newPubKey).not.toBe(oldPubKey);

    // ...and the dismissed backup reminder is back: a new key means the old
    // backup file is worthless, so the nudge re-arms.
    await expect(pageR.getByTestId("banner-backup-reminder")).toBeVisible({
      timeout: 30_000,
    });

    // The decisive proof: after a FULL page load (fresh crypto module, keys
    // read from localStorage), the same envelope still opens - which is only
    // possible if the server-side copy was really re-wrapped for the new key.
    expect(await envelopeStatus(pageR, invoiceId)).toBe(200);
    await pageR.goto(`/invoices/${invoiceId}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });
    await expect(pageR.getByTestId("panel-my-copy-locked")).toHaveCount(0);

    // Signe's side: no badge, no re-share plea for THIS invoice (older drill
    // debris may keep the banner itself alive), and the API agrees her
    // counterparty needs nothing.
    await pageS.goto("/dashboard");
    await expect(pageS.getByTestId(`row-invoice-${invoiceId}`)).toBeVisible({
      timeout: 30_000,
    });
    await expect(pageS.getByTestId(`badge-reshare-${invoiceId}`)).toHaveCount(0);
    await expect(pageS.getByTestId(`link-reshare-invoice-${invoiceId}`)).toHaveCount(0);
    const fromApi = await apiGetJson(pageS, `/api/invoices/${invoiceId}`);
    expect(fromApi.status).toBe(200);
    expect(fromApi.body.counterpartyNeedsRekey).toBe(false);

    // And her own copy still opens - rotation touched none of her rows.
    await pageS.goto(`/invoices/${invoiceId}`);
    await pageS.getByTestId("button-open-envelope").click();
    await expect(pageS.getByText(marker)).toBeVisible({ timeout: 30_000 });
  } finally {
    await ctxR.close();
    await ctxS.close();
  }
});

// The nightmare interleaving: the server commits the rotation, but the
// browser never hears the answer (connection dies mid-response, tab closes,
// machine crashes). At that instant every server-side copy is wrapped for a
// key that exists ONLY in this browser - if it lived in memory alone, it
// would be gone. This drill proves the staged-rotation record bridges the
// gap: the next ordinary page load notices the registered key matches the
// staged one, promotes it, and everything opens as if nothing happened.
test("a rotation interrupted after the server commits recovers on the next load", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  const ctxR = await browser.newContext();
  const pageR = await ctxR.newPage();
  const ctxS = await browser.newContext();
  const pageS = await ctxS.newPage();
  try {
    await signIn(pageR, await mintSignInToken(ROTATOR_ID));
    await ensureReadyKey(pageR);
    await signIn(pageS, await mintSignInToken(SENDER_ID));
    await ensureReadyKey(pageS);

    // An envelope sealed BEFORE the drill - the thing that must survive.
    const marker = `Interrupted rotation drill ${Date.now()}`;
    const { id: invoiceId } = await createInvoice(pageS, ROTATOR_NAME, {
      numberPrefix: "ROTX",
      title: "Interrupted rotation drill",
      description: marker,
    });

    // Dismiss the backup reminder so its return proves recovery re-armed it.
    await pageR.goto("/dashboard");
    await expect(pageR.getByTestId("banner-backup-reminder")).toBeVisible({
      timeout: 30_000,
    });
    await pageR.getByTestId("button-reminder-dismiss").click();
    await expect(pageR.getByTestId("banner-backup-reminder")).toHaveCount(0);

    const [, pubKeyStorageKey] = storageKeys(ROTATOR_ID);
    const stagedStorageKey = `sealed-invoices:staged-rotation:${ROTATOR_ID}`;
    const oldPubKey = await pageR.evaluate(
      (k) => localStorage.getItem(k),
      pubKeyStorageKey,
    );
    expect(oldPubKey).toBeTruthy();

    // The interruption: let the request REACH the server (it commits), then
    // kill the connection so the page sees only a network error. Patching
    // window.fetch inside the page keeps the request byte-for-byte identical
    // to a real one (auth headers included) - Playwright's route.fetch()
    // re-issues from outside the browser and gets 401'd by Clerk.
    await pageR.evaluate(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : String(input);
        if (url.includes("/users/me/rotate-key")) {
          // Deliver the real request so the server commits...
          await realFetch(input, init).catch(() => {});
          // ...then pretend the connection died before the answer came back.
          throw new TypeError("Failed to fetch (drill: connection died)");
        }
        return realFetch(input, init);
      };
    });

    await pageR.getByTestId("button-rotate-key").click();
    await pageR.getByTestId("button-rotate-key-confirm").click();

    // The dialog must be honest about the ambiguity and point at the fix.
    await expect(pageR.getByTestId("text-rotate-error")).toContainText(
      /reload/i,
      { timeout: 60_000 },
    );

    // Pin the dangerous state this drill exists for: the ACTIVE key in this
    // browser is still the old one, and only the staged record knows the new
    // keypair the server just re-wrapped everything for.
    expect(
      await pageR.evaluate((k) => localStorage.getItem(k), pubKeyStorageKey),
    ).toBe(oldPubKey);
    const stagedRaw = await pageR.evaluate(
      (k) => localStorage.getItem(k),
      stagedStorageKey,
    );
    expect(stagedRaw).toBeTruthy();
    const stagedPub = (JSON.parse(stagedRaw!) as { publicKeyJwk: string })
      .publicKeyJwk;
    expect(stagedPub).not.toBe(oldPubKey);

    // "Come back later": a full load with nothing left in memory. The reload
    // also wipes the fetch patch, so the network is honest again.
    await pageR.goto("/dashboard");

    // Reconciliation promotes the staged key to the active slot...
    await expect
      .poll(
        () => pageR.evaluate((k) => localStorage.getItem(k), pubKeyStorageKey),
        { timeout: 30_000 },
      )
      .toBe(stagedPub);
    expect(
      await pageR.evaluate((k) => localStorage.getItem(k), stagedStorageKey),
    ).toBeNull();

    // ...re-arms the backup reminder (the new key has no backup file)...
    await expect(pageR.getByTestId("banner-backup-reminder")).toBeVisible({
      timeout: 30_000,
    });

    // ...and the envelope sealed before the drill opens with the recovered
    // key. No restore prompt, no locked panel - a bystander would never know
    // the rotation was interrupted at its worst possible moment.
    expect(await envelopeStatus(pageR, invoiceId)).toBe(200);
    await pageR.goto(`/invoices/${invoiceId}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });
    await expect(pageR.getByTestId("panel-my-copy-locked")).toHaveCount(0);
  } finally {
    await ctxR.close();
    await ctxS.close();
  }
});

// The opposite interruption: the rotate request never reaches the server at
// all (the connection dies as the button is clicked). The staged key now
// describes a rotation the server has never heard of - but the next load
// must NOT just trust appearances and delete it, because for all this
// browser knows the request is still crawling through some proxy about to
// commit. Recovery therefore FENCES the account first (after which that
// request can never commit) and discards the staged key only on that
// verdict. The old key stays active, everything still opens, and a fresh
// rotation afterwards works normally - no wedged account.
test("a rotation whose request never arrives is rolled back safely on the next load", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  const ctxR = await browser.newContext();
  const pageR = await ctxR.newPage();
  const ctxS = await browser.newContext();
  const pageS = await ctxS.newPage();
  try {
    await signIn(pageR, await mintSignInToken(ROTATOR_ID));
    await ensureReadyKey(pageR);
    await signIn(pageS, await mintSignInToken(SENDER_ID));
    await ensureReadyKey(pageS);

    const marker = `Vanished rotation drill ${Date.now()}`;
    const { id: invoiceId } = await createInvoice(pageS, ROTATOR_NAME, {
      numberPrefix: "ROTV",
      title: "Vanished rotation drill",
      description: marker,
    });

    const [, pubKeyStorageKey] = storageKeys(ROTATOR_ID);
    const stagedStorageKey = `sealed-invoices:staged-rotation:${ROTATOR_ID}`;

    await pageR.goto("/dashboard");
    await expect(pageR.getByTestId("button-rotate-key")).toBeVisible({
      timeout: 30_000,
    });
    const oldPubKey = await pageR.evaluate(
      (k) => localStorage.getItem(k),
      pubKeyStorageKey,
    );
    expect(oldPubKey).toBeTruthy();

    // The interruption: the rotate-key request is swallowed whole - the
    // server never sees it.
    await pageR.evaluate(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : String(input);
        if (url.includes("/users/me/rotate-key")) {
          throw new TypeError("Failed to fetch (drill: request never left)");
        }
        return realFetch(input, init);
      };
    });

    await pageR.getByTestId("button-rotate-key").click();
    await pageR.getByTestId("button-rotate-key-confirm").click();
    await expect(pageR.getByTestId("text-rotate-error")).toContainText(
      /reload/i,
      { timeout: 60_000 },
    );

    // The honest in-between state: active key untouched, staged key kept -
    // the page cannot know the request went nowhere.
    expect(
      await pageR.evaluate((k) => localStorage.getItem(k), pubKeyStorageKey),
    ).toBe(oldPubKey);
    expect(
      await pageR.evaluate((k) => localStorage.getItem(k), stagedStorageKey),
    ).toBeTruthy();

    // Reload (which also drops the fetch patch): recovery bumps the fence,
    // the server reports the OLD key as final, and only then is the staged
    // record discarded.
    await pageR.goto("/dashboard");
    await expect
      .poll(
        () => pageR.evaluate((k) => localStorage.getItem(k), stagedStorageKey),
        { timeout: 30_000 },
      )
      .toBeNull();
    expect(
      await pageR.evaluate((k) => localStorage.getItem(k), pubKeyStorageKey),
    ).toBe(oldPubKey);

    // The old key still opens everything - nothing was half-swapped.
    expect(await envelopeStatus(pageR, invoiceId)).toBe(200);
    await pageR.goto(`/invoices/${invoiceId}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // And the account is not wedged: a real rotation goes through cleanly
    // against the bumped fence.
    await pageR.goto("/dashboard");
    await expect(pageR.getByTestId("button-rotate-key")).toBeVisible({
      timeout: 30_000,
    });
    await pageR.getByTestId("button-rotate-key").click();
    await pageR.getByTestId("button-rotate-key-confirm").click();
    await expect
      .poll(
        () => pageR.evaluate((k) => localStorage.getItem(k), pubKeyStorageKey),
        { timeout: 60_000 },
      )
      .not.toBe(oldPubKey);
    expect(
      await pageR.evaluate((k) => localStorage.getItem(k), stagedStorageKey),
    ).toBeNull();
    expect(await envelopeStatus(pageR, invoiceId)).toBe(200);
  } finally {
    await ctxR.close();
    await ctxS.close();
  }
});
