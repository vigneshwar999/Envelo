import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, grantsTable, invoiceEventsTable, usersTable } from "@workspace/db";
import { insertGrantBound } from "../lib/keyBoundInserts";
import {
  CreateGrantBody,
  CreateGrantResponse,
  ListGrantsResponse,
  RevokeGrantResponse,
} from "@workspace/api-zod";
import { isUuid, toGrant } from "../lib/serializers";
import { canSeeInvoice, findInvoice } from "../lib/access";
import { userIdOf } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function namesById(): Promise<Map<string, string>> {
  const rows = await db.select().from(usersTable);
  return new Map(rows.map((row) => [row.id, row.displayName]));
}

router.get("/invoices/:invoiceId/grants", async (req, res) => {
  const userId = userIdOf(req);
  const invoiceId = req.params.invoiceId;
  const invoice = await findInvoice(invoiceId);
  // Outsiders get the same 404 as for the invoice itself - this endpoint
  // must not confirm that an invoice id exists.
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  const rows = await db
    .select()
    .from(grantsTable)
    .where(eq(grantsTable.invoiceId, invoiceId))
    .orderBy(desc(grantsTable.createdAt));
  // The owner manages all grants; everyone else sees only grants issued to
  // them (so a grantee can check their own expiry without seeing who else
  // has access).
  const visible =
    invoice.freelancerId === userId
      ? rows
      : rows.filter((g) => g.granteeId === userId);
  const names = await namesById();
  res.json(ListGrantsResponse.parse(visible.map((g) => toGrant(g, names))));
});

router.post("/invoices/:invoiceId/grants", async (req, res) => {
  const userId = userIdOf(req);
  const body = CreateGrantBody.parse(req.body);
  const invoiceId = req.params.invoiceId;
  const invoice = await findInvoice(invoiceId);
  // Outsiders can't tell this invoice exists at all.
  if (!invoice || !(await canSeeInvoice(invoice, userId))) {
    res.status(404).json({ error: "Invoice not found." });
    return;
  }
  if (invoice.freelancerId !== userId) {
    res.status(403).json({
      error: "Only the invoice owner can grant access to this envelope.",
    });
    return;
  }
  const [grantee] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, body.granteeId));
  if (!grantee) {
    res.status(400).json({ error: "That user is not registered." });
    return;
  }
  if (grantee.id === userId) {
    res.status(400).json({ error: "You already hold a key to this envelope." });
    return;
  }
  const expiresAt = new Date(body.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    res.status(400).json({ error: "The expiry time must be in the future." });
    return;
  }

  // The wrap was prepared in the owner's browser against a key read earlier.
  // Store it bound to that exact key, under a row lock - if the grantee
  // rotated or reset meanwhile, refuse instead of saving a share they could
  // never open.
  const names = await namesById();
  const result = await insertGrantBound({
    invoiceId,
    grantorId: userId,
    grantorName: names.get(userId) ?? "The owner",
    granteeId: grantee.id,
    granteePublicKeyJwk: body.granteePublicKeyJwk,
    wrappedKey: body.wrappedKey,
    expiresAt,
  });
  if (!result.ok) {
    if (result.reason === "no_grantee") {
      res.status(400).json({ error: "That user is not registered." });
      return;
    }
    res.status(409).json({
      error: `${result.granteeName}'s envelope key changed since this page loaded. Reload the page and share again so the wrap targets the key they hold now.`,
    });
    return;
  }
  res.status(201).json(CreateGrantResponse.parse(toGrant(result.grant, names)));
});

router.post("/invoices/:invoiceId/grants/:grantId/revoke", async (req, res) => {
  const userId = userIdOf(req);
  const { invoiceId, grantId } = req.params;
  if (!isUuid(invoiceId) || !isUuid(grantId)) {
    res.status(404).json({ error: "Grant not found." });
    return;
  }
  const [grant] = await db
    .select()
    .from(grantsTable)
    .where(eq(grantsTable.id, grantId));
  if (!grant || grant.invoiceId !== invoiceId) {
    res.status(404).json({ error: "Grant not found." });
    return;
  }
  if (grant.grantorId !== userId) {
    // Same shape as an unknown id - non-grantors cannot probe grant existence.
    res.status(404).json({ error: "Grant not found." });
    return;
  }
  if (grant.revokedAt) {
    res.status(409).json({ error: "This grant is already revoked." });
    return;
  }
  const [updated] = await db
    .update(grantsTable)
    .set({ revokedAt: new Date() })
    .where(eq(grantsTable.id, grantId))
    .returning();
  const names = await namesById();
  await db.insert(invoiceEventsTable).values({
    invoiceId: grant.invoiceId,
    kind: "grant_revoked",
    actorId: userId,
    detail: `${names.get(userId) ?? "The owner"} revoked ${
      names.get(grant.granteeId) ?? "the grantee"
    }'s view access.`,
  });
  res.json(RevokeGrantResponse.parse(toGrant(updated!, names)));
});

export default router;
