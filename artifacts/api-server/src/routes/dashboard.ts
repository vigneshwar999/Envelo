import { Router, type IRouter } from "express";
import { desc, eq, inArray, or } from "drizzle-orm";
import {
  db,
  grantsTable,
  invoiceEventsTable,
  invoicesTable,
} from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { centsOf, centsToUsdc, grantStatus, toEvent } from "../lib/serializers";
import { userIdOf } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Everything on the dashboard is scoped to the signed-in user: their own
// invoices (sent or received) plus any shared with them through an active
// grant. Nobody sees totals for other people's business.
router.get("/dashboard/summary", async (req, res) => {
  const userId = userIdOf(req);

  const [mine, grantsTouchingMe] = await Promise.all([
    db
      .select()
      .from(invoicesTable)
      .where(
        or(eq(invoicesTable.freelancerId, userId), eq(invoicesTable.clientId, userId)),
      ),
    db
      .select()
      .from(grantsTable)
      .where(or(eq(grantsTable.granteeId, userId), eq(grantsTable.grantorId, userId))),
  ]);

  const invoiceIds = new Set(mine.map((row) => row.id));
  const activeGrantedIds = grantsTouchingMe
    .filter(
      (g) =>
        g.granteeId === userId &&
        grantStatus(g) === "active" &&
        !invoiceIds.has(g.invoiceId),
    )
    .map((g) => g.invoiceId);
  const granted =
    activeGrantedIds.length > 0
      ? await db
          .select()
          .from(invoicesTable)
          .where(inArray(invoicesTable.id, activeGrantedIds))
      : [];

  const invoices = [...mine, ...granted];

  let paidCents = 0n;
  let outstandingCents = 0n;
  let awaitingPayment = 0;
  let paid = 0;
  let anchoredCount = 0;
  for (const invoice of invoices) {
    if (invoice.status === "paid") {
      paid += 1;
      paidCents += centsOf(invoice.amountUsdc);
    } else {
      awaitingPayment += 1;
      outstandingCents += centsOf(invoice.amountUsdc);
    }
    if (invoice.anchorStatus === "anchored") anchoredCount += 1;
  }

  const allVisibleIds = invoices.map((row) => row.id);
  const recent =
    allVisibleIds.length > 0
      ? await db
          .select()
          .from(invoiceEventsTable)
          .where(inArray(invoiceEventsTable.invoiceId, allVisibleIds))
          .orderBy(desc(invoiceEventsTable.createdAt))
          .limit(8)
      : [];

  res.json(
    GetDashboardSummaryResponse.parse({
      totalInvoices: invoices.length,
      awaitingPayment,
      paid,
      totalPaidUsdc: centsToUsdc(paidCents),
      totalOutstandingUsdc: centsToUsdc(outstandingCents),
      activeGrants: grantsTouchingMe.filter((g) => grantStatus(g) === "active").length,
      anchoredCount,
      recentEvents: recent.map(toEvent),
    }),
  );
});

export default router;
