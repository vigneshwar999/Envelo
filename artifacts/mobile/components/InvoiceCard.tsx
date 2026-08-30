/** One row in the invoice list. */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Invoice } from "@workspace/api-client-react";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { formatDate, formatUsdc } from "@/lib/format";
import { Badge } from "@/components/ui";

const c = colors.light;

export function InvoiceCard(props: {
  invoice: Invoice;
  myUserId: string;
  onPress: () => void;
}) {
  const { invoice, myUserId, onPress } = props;
  const iAmClient = invoice.clientId === myUserId;
  const counterparty = iAmClient
    ? `From ${invoice.freelancerName}`
    : `To ${invoice.clientName}`;
  const awaiting = invoice.status === "awaiting_payment";

  return (
    <Pressable
      testID={`card-invoice-${invoice.id}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text style={styles.number}>{invoice.invoiceNumber}</Text>
        <Text style={styles.party} numberOfLines={1}>
          {counterparty}
        </Text>
        <View style={styles.badges}>
          {awaiting ? (
            iAmClient ? (
              <Badge label="For you to pay" tone="amber" />
            ) : (
              <Badge label="Awaiting payment" tone="neutral" />
            )
          ) : (
            <Badge label="Paid" tone="green" />
          )}
          {invoice.myCopyLocked ? <Badge label="Copy locked" tone="red" /> : null}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatUsdc(invoice.amountUsdc)}</Text>
        <Text style={styles.testUsdc}>test USDC</Text>
        {invoice.dueDate && awaiting ? (
          <Text style={styles.due}>Due {formatDate(invoice.dueDate)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: c.card,
    borderRadius: colors.radius + 4,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 12,
  },
  pressed: { opacity: 0.75 },
  left: { flexShrink: 1, gap: 4 },
  right: { alignItems: "flex-end", gap: 2, flexShrink: 0 },
  number: {
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    color: c.foreground,
  },
  party: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: c.mutedForeground,
  },
  badges: { flexDirection: "row", gap: 6, marginTop: 2 },
  amount: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: c.foreground,
  },
  testUsdc: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: c.mutedForeground,
  },
  due: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: c.warningForeground,
    marginTop: 2,
  },
});
