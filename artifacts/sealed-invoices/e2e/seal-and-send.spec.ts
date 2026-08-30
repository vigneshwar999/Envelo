import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  apiGetJson,
  createInvoice,
  custodialAddressOf,
  ensureReadyKey,
  mintSignInToken,
  signIn,
} from "./helpers";

/**
 * Independent reimplementation of the canonical-JSON rule the exported copy
 * documents in its own howToVerify text (keys sorted at every level, arrays
 * in order, no whitespace). Deliberately NOT imported from src/lib/crypto.ts:
 * the point is that a stranger following only the file's instructions - no
 * app code, no server - reaches the same fingerprint.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

// The core product loop, both sides of it, with real crypto and the real chain:
//
//   1. Riko (the recipient) signs in FIRST and heals his envelope key, so the
//      seal that follows wraps for the key his browser actually holds.
//   2. Sela signs in and seals a real invoice for Riko through the real form -
//      encryption happens in her browser, the server receives only ciphertext.
//   3. Honesty checks on the detail page: the number, status and fingerprint
//      shown must AGREE with a fresh API read - the stale-query class of
//      bug that once hid the wallet transfer button.
//   4. The background anchor lands onchain (the operator wallet pays gas, so
//      no faucet dependency) and the UI says so after reload.
//   5. The sealed envelope round-trips for the SENDER: opening it shows the
//      exact marker text that was typed into the form.
//   6. "Verify Content Matches Record" recomputes the fingerprint from the
//      DECRYPTED document; the spec requires BOTH verdicts: record match AND
//      an explicit onchain match (a chain read that silently fails must not
//      pass as success).
//   7. Back on the dashboard (in-app navigation, no reload), the new row's
//      badges agree with a fresh list read.
//   8. Finally the RECIPIENT opens the same envelope in his own browser and
//      sees the marker - proof the copy wrapped for him actually decrypts,
//      not just the sender's.
//
// Personas: Sela Sealer sends. She is flagged is_test_persona (senders never
// need to be findable by anyone), so lookups and pickers never surface her.
// Riko Resetter receives - shared with the lost-key spec and deliberately
// UNFLAGGED so the client lookup can find him (flagged personas are hidden
// from lookups and directories alike). Ephemeral contexts start key-less,
// so ensureReadyKey self-heals both personas through the reset flow each
// run (safe under the suite's workers:1 - specs never overlap). Each run
// leaves one more unpaid 0.01 USDC drill invoice on the pair - expected
// debris, and no payments happen here.

const SEALER_ID =
  process.env.SEAL_SENDER_ID ?? "user_3IYnPU41gmlrSIzKbyQFXlI5s7B"; // Sela Sealer
const RECIPIENT_ID =
  process.env.LOSTKEY_RESETTER_ID ?? "user_3IYk3QntMQ7G1tTrKMDY39QlaNw"; // Riko Resetter
const RECIPIENT_NAME = "Riko Resetter";

test("seal & send: form -> sealed envelope -> anchored fingerprint -> verified content -> recipient opens it", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  // Riko first: the seal must target the key his browser holds right now.
  const ctxR = await browser.newContext();
  const pageR = await ctxR.newPage();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await signIn(pageR, await mintSignInToken(RECIPIENT_ID));
    await ensureReadyKey(pageR);

    await signIn(page, await mintSignInToken(SEALER_ID));
    await ensureReadyKey(page);

    // The client field is a lookup, not a directory dropdown. Prove its
    // honest answers before relying on it: an unknown email says so plainly
    // (no fake "sent anyway"), a custodial wallet ADDRESS resolves to the
    // same person an email would, and a resolved card can be cleared again.
    await page.goto("/invoices/new");
    await page.getByTestId("input-client-query").fill(`nobody-${Date.now()}@example.com`);
    await page.getByTestId("button-client-lookup").click();
    await expect(page.getByTestId("text-client-lookup-note")).toContainText(
      /No account with that email/,
      { timeout: 15_000 },
    );
    await page.getByTestId("input-client-query").fill(await custodialAddressOf(RECIPIENT_ID));
    await page.getByTestId("button-client-lookup").click();
    await expect(page.getByTestId("text-client-resolved")).toContainText(RECIPIENT_NAME, {
      timeout: 15_000,
    });
    await page.getByTestId("button-client-clear").click();
    await expect(page.getByTestId("input-client-query")).toBeVisible();

    // The marker proves the decrypted CONTENT round-trips, not just a flag.
    // Deliberately non-ASCII: the keep-a-copy file's fingerprint must be
    // reproducible from the documented canonicalization rule even when the
    // content needs real string escaping/encoding decisions.
    const marker = `Seal drill ${Date.now()} — ünïcode ₹ ✓`;
    const { id, invoiceNumber } = await createInvoice(
      page,
      { id: RECIPIENT_ID, name: RECIPIENT_NAME },
      {
      numberPrefix: "SEAL",
      title: "Seal flow drill (automated)",
      description: marker,
    });

    // Detail page vs a FRESH API read: number, fingerprint, status.
    const { status, body: inv } = await apiGetJson(page, `/api/invoices/${id}`);
    expect(status).toBe(200);
    expect(inv.invoiceNumber).toBe(invoiceNumber);
    expect(inv.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(inv.status).toBe("awaiting_payment");
    await expect(
      page.getByRole("heading", { name: `Invoice ${invoiceNumber}` }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("badge-invoice-status")).toHaveText(
      "Awaiting Payment",
    );
    // The audit trail records the sealing.
    await expect(page.getByText(/sealed invoice/)).toBeVisible({ timeout: 30_000 });

    // The background anchor must actually land - API truth first...
    await expect
      .poll(
        async () => (await apiGetJson(page, `/api/invoices/${id}`)).body?.anchorStatus,
        {
          timeout: 120_000,
          intervals: [2_000],
          message:
            "fingerprint never reached 'anchored' - background onchain anchoring is broken",
        },
      )
      .toBe("anchored");
    const anchored = (await apiGetJson(page, `/api/invoices/${id}`)).body;
    expect(anchored.anchorTxHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
    // ...then the UI must say so too.
    await page.reload();
    await expect(page.getByTestId("badge-anchor-anchored")).toBeVisible({
      timeout: 30_000,
    });

    // The envelope round-trips in the sender's own browser.
    await page.getByTestId("button-open-envelope").click();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // The verification card (only rendered once the content is decrypted)
    // must show exactly the fingerprint the API holds.
    await expect(page.getByTestId("text-fingerprint")).toHaveText(inv.fingerprint);

    // Verify: recompute the fingerprint from the decrypted content. BOTH
    // verdicts are required - record match AND explicit onchain match. If
    // the chain read fails, the UI says "could not be checked" and this
    // assertion fails rather than letting a silent skip pass as success.
    await page.getByTestId("button-verify").click();
    await expect(page.getByTestId("verify-result-match")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("verify-onchain-match")).toBeVisible();

    // Keep-a-copy: the file saved from the opened envelope must stay
    // verifiable with NOTHING but the file and the chain. Download it, then
    // recompute the fingerprint from the file alone (independent canonical-
    // JSON + SHA-256 above) and demand it equals both the file's own claim
    // and the fingerprint the API anchored in the tx already proven onchain.
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("button-download-copy").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`invoice-${invoiceNumber}-copy.json`);
    const copyPath = await download.path();
    const copy = JSON.parse(readFileSync(copyPath, "utf8"));
    expect(copy.app).toBe("sealed-invoices");
    expect(copy.kind).toBe("invoice-copy");
    expect(copy.invoiceId).toBe(id);
    // The decrypted CONTENT is in the file (the marker typed into the form).
    expect(copy.document.lineItems[0].description).toBe(marker);
    const recomputed = createHash("sha256")
      .update(canonicalJson(copy.document), "utf8")
      .digest("hex");
    expect(recomputed).toBe(copy.fingerprint);
    expect(copy.fingerprint).toBe(inv.fingerprint);
    // The anchor pointers must lead to the REAL transaction.
    expect(copy.anchor.txHash).toBe(anchored.anchorTxHash);
    expect(copy.anchor.explorerTxUrl).toContain(anchored.anchorTxHash);

    // Dashboard row agreement via in-app navigation (no full page load).
    await page.locator('a[href="/dashboard"]').first().click();
    const row = page.getByTestId(`row-invoice-${id}`);
    await expect(row).toBeVisible({ timeout: 30_000 });
    const listed = (await apiGetJson(page, "/api/invoices")).body?.find(
      (x: any) => x.id === id,
    );
    expect(listed?.status).toBe("awaiting_payment");
    expect(listed?.anchorStatus).toBe("anchored");
    await expect(row.getByTestId(`badge-status-${id}`)).toHaveText(
      "Awaiting Payment",
    );
    await expect(row.getByTestId(`badge-anchored-${id}`)).toBeVisible();

    // The decisive delivery proof: the copy wrapped for the RECIPIENT
    // decrypts in HIS browser. A bug that wraps the client's copy with the
    // wrong key would pass every sender-side check above and fail here.
    await pageR.goto(`/invoices/${id}`);
    await pageR.getByTestId("button-open-envelope").click();
    await expect(pageR.getByText(marker)).toBeVisible({ timeout: 30_000 });
  } finally {
    await ctxR.close();
    await ctx.close();
  }
});
