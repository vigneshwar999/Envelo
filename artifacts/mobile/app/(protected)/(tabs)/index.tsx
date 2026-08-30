import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getGetDashboardSummaryQueryKey,
  getListInvoicesQueryKey,
  useGetDashboardSummary,
  useGetMe,
  useListInvoices,
  type Invoice,
} from "@workspace/api-client-react";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { AccountNotSetUp } from "@/components/AccountNotSetUp";
import { InvoiceCard } from "@/components/InvoiceCard";
import { KeyStatusBanner } from "@/components/KeyStatusBanner";
import { Banner, Card, LoadingView } from "@/components/ui";
import { WaxSeal } from "@/components/WaxSeal";
import { deriveKeyStatus, useEnvelopeKey } from "@/context/KeyContext";
import { apiErrorMessage, apiErrorStatus } from "@/lib/apiError";
import { formatUsdc } from "@/lib/format";

const c = colors.light;

type Filter = "all" | "awaiting" | "paid";

export default function InvoicesScreen() {
  const router = useRouter();
  const meQ = useGetMe();
  const me = meQ.data;
  const notSetUp = apiErrorStatus(meQ.error) === 404;

  const invoicesQ = useListInvoices({
    query: { queryKey: getListInvoicesQueryKey(), enabled: !!me },
  });
  const summaryQ = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), enabled: !!me },
  });
  const key = useEnvelopeKey();
  const keyStatus = deriveKeyStatus(
    key.loading,
    key.publicKeyJwk,
    key.privateKeyJwk,
    me?.publicKeyJwk ?? null,
  );

  const [filter, setFilter] = useState<Filter>("all");

  const invoices = useMemo(() => {
    const list = invoicesQ.data ?? [];
    const filtered =
      filter === "all"
        ? list
        : list.filter((inv) =>
            filter === "awaiting" ? inv.status === "awaiting_payment" : inv.status === "paid",
          );
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [invoicesQ.data, filter]);

  const refreshing = meQ.isRefetching || invoicesQ.isRefetching || summaryQ.isRefetching;
  const onRefresh = () => {
    meQ.refetch();
    if (me) {
      invoicesQ.refetch();
      summaryQ.refetch();
    }
  };

  const summary = summaryQ.data;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <WaxSeal size={40} />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.title}>Invoices</Text>
          <Text style={styles.subtitle}>Sealed envelopes on Arc's test network</Text>
        </View>
      </View>

      {summary ? (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{summary.awaitingPayment}</Text>
            <Text style={styles.statLabel}>awaiting</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{summary.paid}</Text>
            <Text style={styles.statLabel}>paid</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{formatUsdc(summary.totalOutstandingUsdc)}</Text>
            <Text style={styles.statLabel}>test USDC due</Text>
          </Card>
        </View>
      ) : null}

      {me && (keyStatus === "none" || keyStatus === "mismatch") ? (
        <KeyStatusBanner status={keyStatus} onRestore={() => router.push("/restore-key")} />
      ) : null}

      <View style={styles.filterRow}>
        {(
          [
            { id: "all", label: "All" },
            { id: "awaiting", label: "Awaiting" },
            { id: "paid", label: "Paid" },
          ] as Array<{ id: Filter; label: string }>
        ).map((f) => (
          <Pressable
            key={f.id}
            testID={`filter-${f.id}`}
            onPress={() => setFilter(f.id)}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterText, filter === f.id && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {invoicesQ.error ? (
        <Banner tone="error">
          {apiErrorMessage(invoicesQ.error, "Your invoices couldn't be loaded right now.")}
        </Banner>
      ) : null}
    </View>
  );

  let body: React.ReactElement;
  if (meQ.isLoading) {
    body = <LoadingView label="Loading your account…" />;
  } else if (notSetUp) {
    body = (
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <WaxSeal size={40} />
          <View>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>Sealed envelopes on Arc's test network</Text>
          </View>
        </View>
        <AccountNotSetUp onRefresh={() => meQ.refetch()} refreshing={meQ.isRefetching} />
      </View>
    );
  } else if (meQ.error) {
    body = (
      <View style={styles.container}>
        <Banner tone="error">
          {apiErrorMessage(meQ.error, "Your account couldn't be loaded right now.")}
        </Banner>
        <Pressable onPress={() => meQ.refetch()} testID="button-retry-me">
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <FlatList
        testID="list-invoices"
        data={invoices}
        keyExtractor={(item: Invoice) => item.id}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            myUserId={me?.id ?? ""}
            onPress={() => router.push(`/invoice/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          invoicesQ.isLoading ? (
            <LoadingView label="Loading invoices…" />
          ) : invoicesQ.error ? null : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {filter === "all" ? "No invoices yet" : "Nothing here yet"}
              </Text>
              <Text style={styles.emptyBody}>
                Invoices are created in the web app. Anything sent to you — or by you —
                shows up here, ready to open, verify, and pay in test USDC.
              </Text>
            </Card>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  container: { padding: 16, gap: 16 },
  listContent: { padding: 16, paddingBottom: 96 },
  header: { gap: 14, marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    color: c.foreground,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: c.mutedForeground,
  },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 6 },
  statValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: c.foreground,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: c.mutedForeground,
    marginTop: 2,
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  filterText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: c.mutedForeground,
  },
  filterTextActive: { color: "#FFFFFF" },
  emptyCard: { alignItems: "center", gap: 8, paddingVertical: 28 },
  emptyTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: c.foreground,
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: c.mutedForeground,
    textAlign: "center",
  },
  retry: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: c.seal,
    textDecorationLine: "underline",
  },
});
