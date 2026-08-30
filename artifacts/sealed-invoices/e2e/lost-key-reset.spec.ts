import { expect, test } from "@playwright/test";
import {
  createInvoice,
  ensureReadyKey,
  envelopeStatus,
  mintSignInToken,
  requiredPersonaId,
  resetThroughDialogs,
  signIn,
  storageKeys,
} from "./helpers";

// The whole lost-key story, end to end, with the REAL crypto in real browser
// contexts - no mocks anywhere:
//
//   1. Riko's browser holds a working key; Signe seals a real invoice for it.
//   2. Riko opens it (sanity: the seal targeted his current key).
//   3. Riko's key material is wiped from localStorage - the "lost key".
//   4. Riko takes the explicit reset path (Restore dialog -> "No backup
//      file anywhere?" -> type RESET). Server-side, his wrapped copies are
//      deleted as unrecoverable.
//   5. Honesty checks: his copy shows as locked in the UI, and the envelope
//      endpoint answers 409 (not a silent success, not a generic 403).
//   6. Signe's side shows "Re-share needed"; ONE click re-wraps the envelope
//      key for Riko's NEW public key in HER browser.
//   7. The SAME invoice now opens in Riko's browser with the new key - the
//      decisive proof that seal -> reset -> re-share -> open round-trips.
//
// Personas: a dedicated pair (Signe Sender / Riko Resetter), deliberately
// NOT flagged is_test_persona - the sender must find the recipient in the
// real invoice picker. Contexts here are ephemeral, so every run starts
// key-less; ensureReadyKey heals each persona through the same reset flow
// this spec tests. Cost of that design: each run leaves one more unpaid
// 0.01 USDC drill invoice between the two personas, and their copies of
// PRIOR runs' invoices stay locked forever (both sides eventually reset).
// That is expected debris on dedicated personas, not breakage. No payments
// happen here, so the spec never depends on faucet funds.

const SENDER_ID = requiredPersonaId("LOSTKEY_SENDER_ID"); // Signe Sender
const RESETTER_ID = requiredPersonaId("LOSTKEY_RESETTER_ID"); // Riko Resetter
const RESETTER_NAME = "Riko Resetter";

test("lost key -> reset -> re-share -> the same envelope opens again", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  // Riko first: his key must be current before Signe seals for it.
  const ctxR = await browser.newContext();
  const pageR = await ctxR.newPage();
  const ctxS = await browser.newContext();
  const pageS = await ctxS.newPage();
  try {
    await signIn(pageR, await mintSignInToken(RESETTER_ID));
    await ensureReadyKey(pageR);

    await signIn(pageS, await mintSignInToken(SENDER_ID));
    await ensureReadyKey(pageS);

    // A unique marker proves later that the DECRYPTED CONTENT round-tripped,
    // not just some status flag.
    const marker = `Emergency drill ${Date.now()}`;
    const { id: invoiceId } = await createInvoice(
      pageS,
      { id: RESETTER_ID, name: RESETTER_NAME },
      {
        numberPrefix: "DRILL",
        title: "Lost key drill",
        description: marker,
      },
    );

    // Sanity: Riko can open the envelope BEFORE the loss.
    await pageR.goto(`/invoices/${invoiceId}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // The loss: key material vanishes from Riko's browser.
    await pageR.evaluate((keys) => {
      for (const k of keys) localStorage.removeItem(k);
    }, storageKeys(RESETTER_ID));
    await pageR.reload();

    // The invoice page offers restore; there is no backup, so reset.
    await pageR.getByTestId("button-restore-key-invoice").click();
    await resetThroughDialogs(pageR);

    // Honesty checks: the copy is locked in the UI, the server says 409 (a
    // party's missing copy is a re-share case, not the generic grant 403),
    // and the dashboard row carries the Locked badge.
    await expect(pageR.getByTestId("panel-my-copy-locked")).toBeVisible({
      timeout: 30_000,
    });
    expect(await envelopeStatus(pageR, invoiceId)).toBe(409);
    await pageR.goto("/dashboard");
    await expect(pageR.getByTestId(`badge-locked-${invoiceId}`)).toBeVisible({
      timeout: 30_000,
    });

    // Signe's side: the heads-up banner names who is waiting, the row
    // carries the badge, and the banner's link leads straight to the
    // invoice. The re-wrap happens in HER browser, one click.
    await pageS.goto("/dashboard");
    await expect(pageS.getByTestId(`badge-reshare-${invoiceId}`)).toBeVisible({
      timeout: 30_000,
    });
    await expect(pageS.getByTestId("banner-reshare-needed")).toBeVisible();
    await expect(pageS.getByTestId("banner-reshare-needed")).toContainText(
      "waiting on your re-share",
    );
    await pageS.getByTestId(`link-reshare-invoice-${invoiceId}`).click();
    await expect(pageS.getByTestId("panel-reshare")).toBeVisible({ timeout: 30_000 });
    await pageS.getByTestId("button-reshare").click();
    await expect(pageS.getByTestId("panel-reshare")).toHaveCount(0, {
      timeout: 30_000,
    });
    // The audit trail records the re-share (and that the server saw no keys).
    await expect(pageS.getByText(/re-shared the sealed envelope/)).toBeVisible({
      timeout: 30_000,
    });

    // Honesty: back on the dashboard, THIS invoice no longer begs for a
    // re-share - no badge, no banner link. (The banner itself may stay:
    // older drill invoices from previous runs can still be waiting.)
    await pageS.goto("/dashboard");
    await expect(pageS.getByTestId(`row-invoice-${invoiceId}`)).toBeVisible({
      timeout: 30_000,
    });
    await expect(pageS.getByTestId(`badge-reshare-${invoiceId}`)).toHaveCount(0);
    await expect(pageS.getByTestId(`link-reshare-invoice-${invoiceId}`)).toHaveCount(0);

    // The decisive proof: the SAME envelope now opens with Riko's NEW key.
    expect(await envelopeStatus(pageR, invoiceId)).toBe(200);
    await pageR.goto(`/invoices/${invoiceId}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });
  } finally {
    await ctxR.close();
    await ctxS.close();
  }
});
