import { expect, test, type Page } from "@playwright/test";
import {
  apiGetJson,
  createInvoice,
  ensureReadyKey,
  envelopeStatus,
  expireGrantNow,
  mintSignInToken,
  requiredPersonaId,
  setTestPersonaFlag,
  signIn,
} from "./helpers";

// The third way an envelope opens - a time-limited grant to an outside
// viewer (the "share with your accountant" feature) - end to end with the
// REAL crypto in real browser contexts, no mocks anywhere:
//
//   1. Vera (the outside viewer) signs in and heals her envelope key FIRST,
//      so the grant that follows wraps for the key her browser holds now.
//   2. Sela seals a real invoice for Riko. Before any grant exists, Vera's
//      session gets a clean 404 for it - outsiders cannot even confirm the
//      invoice exists.
//   3. Sela opens her own envelope and grants Vera access through the real
//      picker. The AES key is re-wrapped for Vera's public key in SELA'S
//      browser - the server only ever stores ciphertext - and the grant the
//      API reports expires ~24h out.
//   4. Vera's dashboard lists the invoice honestly as "Shared", and the
//      sealed envelope DECRYPTS in her browser to the exact marker text -
//      the decisive proof the re-wrapped copy actually works.
//   5. Sela revokes through the UI. Vera loses access immediately and the
//      UI says so honestly: fresh API reads flip to 404/absent, her
//      dashboard row disappears, and the invoice page reports not-found
//      (a revoked grantee may not even probe that the invoice exists).
//   6. A second grant brings Vera back (revocation is not a dead end), then
//      its expiry is time-warped into the past in the DB - the exact state
//      24 real hours would produce - and the same door closes by the OTHER
//      mechanism, on both sides: her reads go dark and Sela's panel says
//      "expired" after a reload.
//
// Personas: Sela Sealer owns and seals (shared with seal-and-send; she is
// flagged, which is fine - owners are never picked from a list). Riko
// Resetter is the invoice client in name only and never acts here. Vera
// Viewer is the dedicated grantee persona; her steady state is
// is_test_persona = true so demo pickers never show her. Flagged users are
// hidden from GET /api/users though - the grant picker included - so the
// spec unflags her for exactly the picker window and restores the flag in
// finally. Ephemeral contexts start key-less; ensureReadyKey self-heals
// Sela and Vera each run (safe under the suite's workers: 1). Each run
// leaves one unpaid 0.01 USDC drill invoice, and Vera's key reset discards
// her dead grant copies from prior runs - expected debris on dedicated
// personas. No payments happen, so there is no faucet dependency.

const OWNER_ID = requiredPersonaId("SEAL_SENDER_ID"); // Sela Sealer
const CLIENT_ID = requiredPersonaId("LOSTKEY_RESETTER_ID"); // Riko Resetter
const CLIENT_NAME = "Riko Resetter"; // the invoice client; never acts here
const VIEWER_ID = requiredPersonaId("GRANT_VIEWER_ID"); // Vera Viewer
const VIEWER_NAME = "Vera Viewer";

/**
 * Fresh-eyes proof that the viewer currently has NO path to this invoice,
 * API and UI agreeing: envelope 404, detail 404, absent from a fresh list
 * read, no dashboard row once the list has settled, and a direct visit
 * reports not-found. The server hides the invoice entirely (404, never 403)
 * so a revoked or expired grantee cannot even probe that it exists - the
 * honest UI story is therefore "no such invoice", not "locked".
 */
async function expectNoAccess(pageV: Page, invoiceId: string): Promise<void> {
  expect(await envelopeStatus(pageV, invoiceId)).toBe(404);
  const detail = await apiGetJson(pageV, `/api/invoices/${invoiceId}`);
  expect(detail.status).toBe(404);
  const list = await apiGetJson(pageV, "/api/invoices");
  expect(list.status).toBe(200);
  expect((list.body as { id: string }[]).some((x) => x.id === invoiceId)).toBe(false);

  await pageV.goto("/dashboard");
  // Wait until the invoice list actually settled (rows or the empty state);
  // asserting the row's absence while the list still loads would pass
  // vacuously. The row-invoice testid pattern is proven live elsewhere in
  // this spec, while the invoice is granted.
  await expect(
    pageV
      .locator('[data-testid^="row-invoice-"]')
      .first()
      .or(pageV.getByText("No invoices yet")),
  ).toBeVisible({ timeout: 30_000 });
  await expect(pageV.getByTestId(`row-invoice-${invoiceId}`)).toHaveCount(0);

  await pageV.goto(`/invoices/${invoiceId}`);
  await expect(pageV.getByTestId("text-invoice-not-found")).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Owner-side: pick Vera in the REAL Access Control picker, press Grant, and
 * return the new grant once a FRESH grants read reports it active AND the
 * panel shows its row - UI and API compared on equal terms.
 */
async function grantThroughPicker(
  pageO: Page,
  invoiceId: string,
  priorGrantIds: string[],
): Promise<{ id: string; expiresAt: string }> {
  await pageO.getByTestId("select-grantee").click();
  await pageO.getByRole("option", { name: VIEWER_NAME }).click();
  await pageO.getByTestId("button-grant-access").click();
  let grant: { id: string; expiresAt: string } | undefined;
  await expect
    .poll(
      async () => {
        const { status, body } = await apiGetJson(
          pageO,
          `/api/invoices/${invoiceId}/grants`,
        );
        if (status !== 200) return `grants read failed with ${status}`;
        grant = (body as { id: string; granteeId: string; status: string; expiresAt: string }[]).find(
          (g) =>
            g.granteeId === VIEWER_ID &&
            g.status === "active" &&
            !priorGrantIds.includes(g.id),
        );
        return grant ? "created" : "no active grant for the viewer yet";
      },
      {
        timeout: 30_000,
        message:
          "the Grant click never produced an active grant in a fresh API read - " +
          "check the API logs / an error toast on the Access Control panel",
      },
    )
    .toBe("created");
  await expect(pageO.getByTestId(`grant-row-${grant!.id}`)).toBeVisible({
    timeout: 30_000,
  });
  return grant!;
}

test("accountant share: grant -> viewer decrypts -> revoke closes -> expiry closes", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  // Vera first: the wrap must target the key her browser holds right now.
  const ctxV = await browser.newContext();
  const pageV = await ctxV.newPage();
  const ctxO = await browser.newContext();
  const pageO = await ctxO.newPage();
  try {
    await signIn(pageV, await mintSignInToken(VIEWER_ID));
    await ensureReadyKey(pageV);
    // Open the picker window: her steady state is flagged (hidden from all
    // pickers), so unflag until both grants are issued. finally re-flags no
    // matter how this run ends.
    await setTestPersonaFlag(VIEWER_ID, false);

    await signIn(pageO, await mintSignInToken(OWNER_ID));
    await ensureReadyKey(pageO);

    // The marker proves decrypted CONTENT round-trips, not just some flag.
    const marker = `Accountant drill ${Date.now()}`;
    const { id: invoiceId } = await createInvoice(pageO, { id: CLIENT_ID, name: CLIENT_NAME }, {
      numberPrefix: "SHARE",
      title: "Accountant share drill",
      description: marker,
    });

    // Baseline: before any grant, Vera has no path to this invoice (this
    // also proves the not-found surface this spec relies on later renders
    // for HER session, so the post-revoke checks cannot pass by typo).
    await expectNoAccess(pageV, invoiceId);

    // The owner opens her own envelope - the decrypted AES key is what gets
    // re-wrapped; the UI refuses to grant before this.
    await pageO.getByTestId("button-open-envelope").click();
    await expect(pageO.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // Grant #1 through the real picker; the grant is time-limited for real:
    // the expiry a fresh read reports sits ~24h out.
    const first = await grantThroughPicker(pageO, invoiceId, []);
    const msLeft = new Date(first.expiresAt).getTime() - Date.now();
    expect(msLeft).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(msLeft).toBeLessThan(25 * 60 * 60 * 1000);
    // The audit trail tells the story in plain language.
    await expect(pageO.getByText(/granted .* time-limited view access/)).toBeVisible({
      timeout: 30_000,
    });

    // Vera's fresh reads agree, and carry the grant's own expiry.
    const env = await apiGetJson(pageV, `/api/invoices/${invoiceId}/envelope`);
    expect(env.status).toBe(200);
    expect(env.body.accessSource).toBe("grant");
    expect(env.body.grantExpiresAt).toBe(first.expiresAt);
    const listed = await apiGetJson(pageV, "/api/invoices");
    expect((listed.body as { id: string }[]).some((x) => x.id === invoiceId)).toBe(
      true,
    );
    // She sees her own grant (and only hers) with its expiry.
    const grantsForViewer = await apiGetJson(
      pageV,
      `/api/invoices/${invoiceId}/grants`,
    );
    expect(grantsForViewer.status).toBe(200);
    expect(
      (grantsForViewer.body as { id: string; status: string }[]).map((g) => [
        g.id,
        g.status,
      ]),
    ).toEqual([[first.id, "active"]]);

    // Her dashboard lists the row, honestly labeled "Shared" - she is
    // neither the sender nor the client.
    await pageV.goto("/dashboard");
    const rowV = pageV.getByTestId(`row-invoice-${invoiceId}`);
    await expect(rowV).toBeVisible({ timeout: 30_000 });
    await expect(rowV.getByText("Shared", { exact: true })).toBeVisible();

    // The decisive proof: the copy re-wrapped for HER key decrypts in HER
    // browser to the exact text Sela typed into the form.
    await rowV.click();
    await pageV.getByTestId("button-open-envelope").click();
    await expect(pageV.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // Sela revokes through the real UI; panel, audit trail and a fresh read
    // must all agree.
    await pageO.getByTestId(`button-revoke-${first.id}`).click();
    await expect(pageO.getByTestId(`grant-row-${first.id}`)).toHaveCount(0, {
      timeout: 30_000,
    });
    const afterRevoke = await apiGetJson(pageO, `/api/invoices/${invoiceId}/grants`);
    const revoked = (
      afterRevoke.body as { id: string; status: string; revokedAt: string | null }[]
    ).find((g) => g.id === first.id);
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.revokedAt).toBeTruthy();
    await expect(pageO.getByText(/revoked .* view access/)).toBeVisible({
      timeout: 30_000,
    });

    // The door is closed for Vera, and her UI says so honestly.
    await expectNoAccess(pageV, invoiceId);

    // Revocation is not a dead end: a second grant brings her back...
    const second = await grantThroughPicker(pageO, invoiceId, [first.id]);
    // ...and the picker window is over - restore her steady flagged state
    // before the remaining checks (nothing below needs her pickable).
    await setTestPersonaFlag(VIEWER_ID, true);

    expect(await envelopeStatus(pageV, invoiceId)).toBe(200);
    await pageV.goto(`/invoices/${invoiceId}`);
    await pageV.getByTestId("button-open-envelope").click();
    await expect(pageV.getByText(marker)).toBeVisible({ timeout: 30_000 });

    // Expiry, the other way a grant dies. Nobody can wait 24 hours here, so
    // move THIS grant's expiry into the past in the database - the exact
    // state time itself produces; every read below still goes through the
    // real API.
    await expireGrantNow(second.id);

    // Same closed door, other mechanism.
    await expectNoAccess(pageV, invoiceId);

    // And Sela's side is honest about it too: a fresh read says "expired",
    // and after a reload the row is out of Active Grants (expired grants
    // live in the audit trail, not the active list).
    const afterExpiry = await apiGetJson(pageO, `/api/invoices/${invoiceId}/grants`);
    expect(
      (afterExpiry.body as { id: string; status: string }[]).find(
        (g) => g.id === second.id,
      )?.status,
    ).toBe("expired");
    await pageO.reload();
    await expect(pageO.getByText(/No active grants/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(pageO.getByTestId(`grant-row-${second.id}`)).toHaveCount(0);
  } finally {
    // Steady state no matter how the run ended: Vera stays out of the demo
    // pickers. Idempotent - usually a no-op after the in-flow restore. (On a
    // first-ever run that failed before her sign-in there is no row yet;
    // that is the one case the warning below covers.)
    await setTestPersonaFlag(VIEWER_ID, true).catch((err) =>
      console.warn(`Could not restore Vera's is_test_persona flag: ${err}`),
    );
    await ctxV.close();
    await ctxO.close();
  }
});
