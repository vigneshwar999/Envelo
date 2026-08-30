/** Shown when the signed-in account has no profile row in the app yet. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { Button, Card } from "@/components/ui";
import { WaxSeal } from "@/components/WaxSeal";

const c = colors.light;

export function AccountNotSetUp(props: { onRefresh: () => void; refreshing?: boolean }) {
  return (
    <Card style={styles.card}>
      <WaxSeal size={48} />
      <Text style={styles.title}>Finish setup in your browser</Text>
      <Text style={styles.body}>
        Your envelope key is created in the browser the first time you use the Sealed
        Invoices web app. Sign in there once with this same account, then refresh here.
      </Text>
      <Text style={styles.note}>
        Invoices are created on the web app — this companion app opens, verifies, and pays
        them.
      </Text>
      <Button
        title={props.refreshing ? "Checking…" : "Check again"}
        variant="secondary"
        onPress={props.onRefresh}
        loading={props.refreshing}
        testID="button-check-setup"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 12, paddingVertical: 28 },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: c.foreground,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: c.mutedForeground,
    textAlign: "center",
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: c.mutedForeground,
    textAlign: "center",
    fontStyle: "italic",
  },
});
