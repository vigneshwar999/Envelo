import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getGetEnvelopeQueryKey,
  getGetInvoiceQueryKey,
  getGetPayPreviewQueryKey,
  getListInvoiceEventsQueryKey,
  useGetChainStatus,
  useGetEnvelope,
  useGetInvoice,
  useGetMe,
  useGetPayPreview,
  useListInvoiceEvents,
  usePayInvoice,
  useVerifyInvoice,
  type EnvelopeAccess,
  type VerificationResult,
} from "@workspace/api-client-react";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { KeyStatusBanner } from "@/components/KeyStatusBanner";
import {
  Badge,
  Banner,
  Button,
  Card,
  KeyValueRow,
  LinkText,
  LoadingView,
  MonoText,
  SectionTitle,
} from "@/components/ui";
import { deriveKeyStatus, useEnvelopeKey } from "@/context/KeyContext";
import { apiErrorMessage } from "@/lib/apiError";
import { computeFingerprint, openEnvelope, type InvoiceDocument } from "@/lib/crypto";
import { formatDate, formatDateTime, formatUsdc, shortHex } from "@/lib/format";

const c = colors.light;

export default function InvoiceDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const queryClient = useQueryClient();

  const meQ = useGetMe();
  const invoiceQ = useGetInvoice(id, {
    query: { queryKey: getGetInvoiceQueryKey(id), enabled: id !== "" },
  });
  const chainQ = useGetChainStatus();
  const eventsQ = useListInvoiceEvents(id, {
    query: { queryKey: getListInvoiceEventsQueryKey(id), enabled: id !== "" },
  });
  const envelopeQ = useGetEnvelope(id, {
    query: { queryKey: getGetEnvelopeQueryKey(id), enabled: false, retry: false },
  });
  const key = useEnvelopeKey();
  const verifyMut = useVerifyInvoice();
  const payMut = usePayInvoice();

  const [document, setDocument] = useState<InvoiceDocument | null>(null);
  const [access, setAccess] = useState<EnvelopeAccess | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmingPay, setConfirmingPay] = useState(false);

  const invoice = invoiceQ.data;
  const me = meQ.data;
  const chain = chainQ.data;
  const iAmClient = !!(invoice && me && invoice.clientId === me.id);
  const payPreviewQ = useGetPayPreview(id, {
    query: {
      queryKey: getGetPayPreviewQueryKey(id),
      enabled: id !== "" && iAmClient && invoice?.status === "awaiting_payment",
      staleTime: 0,
    },
  });
  const payPreview = payPreviewQ.data;
  const keyStatus = deriveKeyStatus(
    key.loading,
    key.publicKeyJwk,
    key.privateKeyJwk,
    me?.publicKeyJwk ?? null,
  );
  const explorerBaseUrl = chain?.explorerBaseUrl ?? null;

  const handleOpen = async () => {
    if (!key.privateKeyJwk) return;
    setOpening(true);
    setOpenError(null);
    try {
      const result = await envelopeQ.refetch();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("The envelope couldn't be fetched. Try again.");
      // Yield once so the spinner paints before the CPU-heavy decryption.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const { document: doc } = openEnvelope(
        result.data.ciphertext,
        result.data.wrappedKey,
        key.privateKeyJwk,
      );
      setDocument(doc);
      setAccess(result.data);
    } catch (err) {
      setOpenError(
        err instanceof Error && !("status" in (err as object))
          ? err.message
          : apiErrorMessage(err, "This envelope couldn't be opened right now."),
      );
    } finally {
      setOpening(false);
    }
  };

  const handleVerify = () => {
    if (!document) return;
    setVerifyError(null);
    const computedFingerprint = computeFingerprint(document);
    verifyMut.mutate(
      { invoiceId: id, data: { computedFingerprint } },
      {
        onSuccess: (result) => setVerification(result),
        onError: (err) =>
          setVerifyError(apiErrorMessage(err, "Verification failed. Please try again.")),
      },
    );
  };

  const handlePay = () => {
    setPayError(null);
    payMut.mutate(
      { invoiceId: id },
      {
        onSuccess: () => {
          setConfirmingPay(false);
          queryClient.invalidateQueries();
        },
        onError: (err) => {
          setConfirmingPay(false);
          setPayError(
            apiErrorMessage(err, "The payment couldn't be completed. Please try again."),
          );
        },
      },
    );
  };

  if (invoiceQ.isLoading || meQ.isLoading) {
    return <LoadingView label="Loading invoice…" />;
  }
  if (invoiceQ.error || !invoice) {
    return (
      <View style={styles.errorWrap}>
        <Banner tone="error">
          {apiErrorMessage(invoiceQ.error, "This invoice couldn't be loaded.")}
        </Banner>
        <Button title="Try again" variant="secondary" onPress={() => invoiceQ.refetch()} />
      </View>
    );
  }

  const awaiting = invoice.status === "awaiting_payment";

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {/* ---------------- header ---------------- */}
      <Card style={{ gap: 10 }}>
        <View style={styles.headerRow}>
          <MonoText style={styles.invoiceNumber}>{invoice.invoiceNumber}</MonoText>
          {awaiting ? (
            <Badge
              label={iAmClient ? "For you to pay" : "Awaiting payment"}
              tone={iAmClient ? "amber" : "neutral"}
              testID="badge-status"
            />
          ) : (
            <Badge label="Paid" tone="green" testID="badge-status" />
          )}
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amount} testID="text-amount">
            {formatUsdc(invoice.amountUsdc)}
          </Text>
          <Text style={styles.amountUnit}>test USDC</Text>
        </View>
        <KeyValueRow label="From">
          <Text style={styles.valueText}>{invoice.freelancerName}</Text>
        </KeyValueRow>
        <KeyValueRow label="To">
          <Text style={styles.valueText}>{invoice.clientName}</Text>
        </KeyValueRow>
        {invoice.dueDate ? (
          <KeyValueRow label="Due">
            <Text style={styles.valueText}>{formatDate(invoice.dueDate)}</Text>
          </KeyValueRow>
        ) : null}
        <KeyValueRow label="Fingerprint stamp">
          {invoice.anchorStatus === "anchored" ? (
            <Badge label="Stamped on Arc testnet" tone="green" />
          ) : invoice.anchorStatus === "pending" ? (
            <Badge label="Stamp pending" tone="neutral" />
          ) : (
            <Badge label="Not stamped" tone="neutral" />
          )}
        </KeyValueRow>
        {invoice.anchorStatus === "unavailable" ? (
          <Text style={styles.mutedNote}>
            The test network was unreachable when this invoice was created. Verification
            still checks the app's record.
          </Text>
        ) : null}
        {invoice.anchorTxHash && explorerBaseUrl ? (
          <LinkText
            label="View the stamp on ArcScan"
            onPress={() => Linking.openURL(`${explorerBaseUrl}/tx/${invoice.anchorTxHash}`)}
            testID="link-anchor-tx"
          />
        ) : null}
      </Card>

      {/* ---------------- envelope ---------------- */}
      <SectionTitle>The envelope</SectionTitle>
      {document ? (
        <Card style={{ gap: 10 }} testID="card-document">
          <Text style={styles.decryptNote}>
            Decrypted on this device — the server and the chain never see this.
          </Text>
          <Text style={styles.docTitle} testID="text-doc-title">
            {document.title}
          </Text>
          {document.lineItems.map((item, index) => (
            <View key={index} style={styles.lineItem}>
              <Text style={styles.lineDesc}>{item.description}</Text>
              <Text style={styles.lineQty}>
                {item.quantity} × {formatUsdc(item.unitPriceUsdc)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatUsdc(document.amountUsdc)} test USDC
            </Text>
          </View>
          {document.notes ? <Text style={styles.notes}>{document.notes}</Text> : null}
          <Text style={styles.mutedNote}>
            Issued {formatDate(document.issueDate)}
            {document.dueDate ? ` · due ${formatDate(document.dueDate)}` : ""}
          </Text>
          {access?.accessSource === "grant" ? (
            <Banner tone="info" testID="banner-grant-access">
              {access.grantExpiresAt
                ? `Shared with you until ${formatDateTime(access.grantExpiresAt)}. The owner can end the share sooner — that stops future opens.`
                : "Shared with you. The owner can end the share at any time — that stops future opens."}
            </Banner>
          ) : null}
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          {invoice.myCopyLocked ? (
            <Banner tone="warning" testID="banner-copy-locked">
              Your copy of the envelope key was removed when your account's key was reset.
              The envelope itself is untouched — ask{" "}
              {iAmClient ? invoice.freelancerName : invoice.clientName} to re-share access
              from the web app.
            </Banner>
          ) : keyStatus === "none" || keyStatus === "mismatch" ? (
            <KeyStatusBanner
              status={keyStatus}
              onRestore={() => router.push("/restore-key")}
            />
          ) : (
            <>
              <Text style={styles.bodyText}>
                The invoice details are sealed. Open the envelope to decrypt them on this
                device.
              </Text>
              <Button
                title={opening ? "Opening…" : "Open envelope"}
                variant="seal"
                onPress={handleOpen}
                loading={opening}
                disabled={keyStatus === "loading"}
                testID="button-open-envelope"
              />
            </>
          )}
          {openError ? (
            <Banner tone="error" testID="banner-open-error">
              {openError}
            </Banner>
          ) : null}
        </Card>
      )}

      {/* ---------------- verify ---------------- */}
      {document ? (
        <>
          <SectionTitle>Verify the seal</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Text style={styles.bodyText}>
              Recomputes the fingerprint from what you just decrypted and compares it with
              the app's record and the stamp on Arc's test network.
            </Text>
            <Button
              title={verifyMut.isPending ? "Verifying…" : "Verify the seal"}
              variant="secondary"
              onPress={handleVerify}
              loading={verifyMut.isPending}
              testID="button-verify"
            />
            {verifyError ? (
              <Banner tone="error" testID="banner-verify-error">
                {verifyError}
              </Banner>
            ) : null}
            {verification ? (
              <View style={{ gap: 6 }} testID="card-verification">
                <KeyValueRow label="App record">
                  <Text
                    style={[
                      styles.verdict,
                      { color: verification.matchesRecord ? c.success : c.destructive },
                    ]}
                    testID="text-matches-record"
                  >
                    {verification.matchesRecord ? "✓ Matches" : "✗ Doesn't match"}
                  </Text>
                </KeyValueRow>
                <KeyValueRow label="Arc testnet">
                  <Text
                    style={[
                      styles.verdict,
                      {
                        color:
                          verification.matchesOnchain === true
                            ? c.success
                            : verification.matchesOnchain === false
                              ? c.destructive
                              : c.mutedForeground,
                      },
                    ]}
                    testID="text-matches-onchain"
                  >
                    {verification.matchesOnchain === true
                      ? "✓ Matches"
                      : verification.matchesOnchain === false
                        ? "✗ Doesn't match"
                        : "— Not stamped"}
                  </Text>
                </KeyValueRow>
                <Text style={styles.summary} testID="text-verification-summary">
                  {verification.summary}
                </Text>
                <MonoText style={styles.fingerprint}>
                  {shortHex(verification.computedFingerprint, 16, 12)}
                </MonoText>
                {verification.anchorTxHash && explorerBaseUrl ? (
                  <LinkText
                    label="View the stamp on ArcScan"
                    onPress={() =>
                      Linking.openURL(`${explorerBaseUrl}/tx/${verification.anchorTxHash}`)
                    }
                    testID="link-verification-tx"
                  />
                ) : null}
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* ---------------- payment ---------------- */}
      <SectionTitle>Payment</SectionTitle>
      <Card style={{ gap: 10 }}>
        {invoice.status === "paid" ? (
          <>
            <Banner tone="success" testID="banner-paid">
              Paid{invoice.paidAt ? ` ${formatDateTime(invoice.paidAt)}` : ""} in test USDC
              on Arc's test network.
            </Banner>
            {invoice.payTxHash && explorerBaseUrl ? (
              <LinkText
                label="View the payment on ArcScan"
                onPress={() =>
                  Linking.openURL(`${explorerBaseUrl}/tx/${invoice.payTxHash}`)
                }
                testID="link-pay-tx"
              />
            ) : null}
          </>
        ) : iAmClient ? (
          <>
            {!chain ? (
              <Text style={styles.bodyText}>Checking the test network…</Text>
            ) : !chain.readyForPayments ? (
              <Banner tone="warning" testID="banner-chain-not-ready">
                {chain.statusMessage}
              </Banner>
            ) : payPreviewQ.isLoading ? (
              <Text style={styles.bodyText}>Checking the amount, network fee, and wallet balance…</Text>
            ) : payPreviewQ.error ? (
              <>
                <Banner tone="error" testID="banner-pay-preview-error">
                  {apiErrorMessage(
                    payPreviewQ.error,
                    "The live payment details couldn't be loaded.",
                  )}
                </Banner>
                <Button
                  title="Try again"
                  variant="secondary"
                  onPress={() => payPreviewQ.refetch()}
                  testID="button-retry-pay-preview"
                />
              </>
            ) : payPreview?.canPay === false ? (
              <>
                <Banner tone="warning" testID="banner-amount-too-large">
                  This payment needs {formatUsdc(payPreview.totalUsdc)} test USDC including
                  the estimated network fee. Your wallet has{" "}
                  {formatUsdc(payPreview.walletBalanceUsdc)} and is about{" "}
                  {formatUsdc(payPreview.shortfallUsdc)} short. Top up at the faucet, then
                  try again.
                </Banner>
                <LinkText
                  label="Get test USDC from the faucet"
                  onPress={() => Linking.openURL(chain.faucetUrl)}
                  testID="link-faucet-detail"
                />
              </>
            ) : confirmingPay ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.bodyText}>
                  Pay {formatUsdc(invoice.amountUsdc)} test USDC to {invoice.freelancerName}
                  {payPreview?.feeEstimateUsdc
                    ? ` plus an estimated ${formatUsdc(payPreview.feeEstimateUsdc)} test USDC network fee`
                    : ""}
                  ? This moves practice money on Arc's test network — not real dollars.
                </Text>
                <View style={styles.buttonRow}>
                  <Button
                    title={payMut.isPending ? "Paying…" : "Confirm payment"}
                    variant="seal"
                    onPress={handlePay}
                    loading={payMut.isPending}
                    disabled={payPreview?.canPay !== true}
                    testID="button-confirm-pay"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setConfirmingPay(false)}
                    disabled={payMut.isPending}
                    testID="button-cancel-pay"
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <>
                {payPreview?.walletBalanceUsdc ? (
                  <Text style={styles.bodyText}>
                    Wallet balance: {formatUsdc(payPreview.walletBalanceUsdc)} test USDC
                    {payPreview.feeEstimateUsdc
                      ? ` · estimated fee ${formatUsdc(payPreview.feeEstimateUsdc)}`
                      : ""}
                  </Text>
                ) : null}
                <Button
                  title={`Pay ${formatUsdc(invoice.amountUsdc)} test USDC`}
                  variant="seal"
                  onPress={() => setConfirmingPay(true)}
                  disabled={payPreview?.canPay !== true}
                  testID="button-pay"
                />
              </>
            )}
            {payError ? (
              <Banner tone="error" testID="banner-pay-error">
                {payError}
              </Banner>
            ) : null}
          </>
        ) : (
          <Text style={styles.bodyText}>
            Waiting for {invoice.clientName} to pay. The payment will show up here the
            moment it lands on the test network.
          </Text>
        )}
      </Card>

      {/* ---------------- activity ---------------- */}
      <SectionTitle>Activity</SectionTitle>
      <Card style={{ gap: 0 }}>
        {eventsQ.isLoading ? (
          <Text style={styles.bodyText}>Loading activity…</Text>
        ) : eventsQ.error ? (
          <Text style={styles.mutedNote}>Activity is unavailable right now.</Text>
        ) : eventsQ.data && eventsQ.data.length > 0 ? (
          eventsQ.data.map((event, index) => (
            <View
              key={event.id}
              style={[styles.eventRow, index > 0 && styles.eventRowBorder]}
            >
              <Text style={styles.eventDetail}>{event.detail}</Text>
              <Text style={styles.eventDate}>{formatDateTime(event.createdAt)}</Text>
              {event.txHash && explorerBaseUrl ? (
                <LinkText
                  label={shortHex(event.txHash)}
                  onPress={() => Linking.openURL(`${explorerBaseUrl}/tx/${event.txHash}`)}
                />
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.mutedNote}>No activity recorded yet.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 64, gap: 12 },
  errorWrap: { flex: 1, padding: 24, gap: 12, backgroundColor: c.background },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  invoiceNumber: { fontSize: 15 },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  amount: {
    fontFamily: fonts.sansBold,
    fontSize: 34,
    color: c.foreground,
  },
  amountUnit: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: c.mutedForeground,
  },
  valueText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: c.foreground,
    textAlign: "right",
  },
  mutedNote: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: c.mutedForeground,
  },
  bodyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: c.foreground,
  },
  decryptNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: c.sealForeground,
    backgroundColor: c.sealSoft,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  docTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: c.foreground,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  lineDesc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: c.foreground,
    flexShrink: 1,
  },
  lineQty: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: c.mutedForeground,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: 8,
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: c.foreground,
  },
  totalValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: c.foreground,
  },
  notes: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: c.mutedForeground,
    fontStyle: "italic",
  },
  verdict: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  summary: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: c.foreground,
  },
  fingerprint: {
    fontSize: 12,
    color: c.mutedForeground,
  },
  buttonRow: { flexDirection: "row", gap: 8 },
  eventRow: { paddingVertical: 10, gap: 2 },
  eventRowBorder: { borderTopWidth: 1, borderTopColor: c.border },
  eventDetail: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: c.foreground,
  },
  eventDate: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: c.mutedForeground,
  },
});
