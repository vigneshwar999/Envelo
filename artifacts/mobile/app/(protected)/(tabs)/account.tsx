import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useGetChainStatus, useGetMe } from "@workspace/api-client-react";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { AccountNotSetUp } from "@/components/AccountNotSetUp";
import { keyStatusMessage } from "@/components/KeyStatusBanner";
import {
  Banner,
  Button,
  Card,
  KeyValueRow,
  LinkText,
  MonoText,
  SectionTitle,
} from "@/components/ui";
import { deriveKeyStatus, useEnvelopeKey } from "@/context/KeyContext";
import { apiErrorMessage, apiErrorStatus } from "@/lib/apiError";
import { formatUsdc, shortHex } from "@/lib/format";

const c = colors.light;

export default function AccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const meQ = useGetMe();
  const chainQ = useGetChainStatus();
  const key = useEnvelopeKey();

  const me = meQ.data;
  const chain = chainQ.data;
  const notSetUp = apiErrorStatus(meQ.error) === 404;
  const keyStatus = deriveKeyStatus(
    key.loading,
    key.publicKeyJwk,
    key.privateKeyJwk,
    me?.publicKeyJwk ?? null,
  );

  const [confirmForget, setConfirmForget] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
    } finally {
      setSigningOut(false);
    }
  };

  const handleForgetKey = async () => {
    await key.removeKey();
    setConfirmForget(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        {notSetUp ? (
          <AccountNotSetUp onRefresh={() => meQ.refetch()} refreshing={meQ.isRefetching} />
        ) : meQ.error ? (
          <Banner tone="error">
            {apiErrorMessage(meQ.error, "Your account couldn't be loaded right now.")}
          </Banner>
        ) : me ? (
          <Card>
            <Text style={styles.name} testID="text-display-name">
              {me.displayName}
            </Text>
            {me.email ? <Text style={styles.email}>{me.email}</Text> : null}
          </Card>
        ) : null}

        <SectionTitle>Envelope key</SectionTitle>
        <Card style={{ gap: 10 }}>
          {keyStatus === "ready" ? (
            <>
              <Banner tone="success" testID="banner-key-ready">
                This device can open envelopes sealed for your account.
              </Banner>
              {confirmForget ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.bodyText}>
                    Forget the key on this device? Envelopes will stop opening here until
                    you restore a backup again. Your account, backups, and the web app are
                    not affected.
                  </Text>
                  <View style={styles.buttonRow}>
                    <Button
                      title="Forget key"
                      variant="destructive"
                      onPress={handleForgetKey}
                      testID="button-confirm-forget"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Cancel"
                      variant="secondary"
                      onPress={() => setConfirmForget(false)}
                      testID="button-cancel-forget"
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              ) : (
                <Button
                  title="Forget key on this device"
                  variant="secondary"
                  onPress={() => setConfirmForget(true)}
                  testID="button-forget-key"
                />
              )}
            </>
          ) : keyStatus === "loading" ? (
            <Text style={styles.bodyText}>Checking this device's key…</Text>
          ) : (
            <>
              <Text style={styles.bodyText}>
                {keyStatusMessage(keyStatus) ??
                  "This device doesn't hold your envelope key yet."}
              </Text>
              <Button
                title="Restore from backup"
                onPress={() => router.push("/restore-key")}
                testID="button-restore-key"
              />
            </>
          )}
        </Card>

        <SectionTitle>Network status</SectionTitle>
        <Card style={{ gap: 4 }}>
          {chainQ.isLoading ? (
            <Text style={styles.bodyText}>Checking the Arc testnet…</Text>
          ) : chainQ.error ? (
            <Banner tone="error">
              {apiErrorMessage(chainQ.error, "Network status is unavailable right now.")}
            </Banner>
          ) : chain ? (
            <>
              <KeyValueRow label="Network">
                <Text style={styles.valueText}>
                  {chain.network}
                  {chain.chainId ? ` · chain ${chain.chainId}` : ""}
                </Text>
              </KeyValueRow>
              <KeyValueRow label="App-managed wallet">
                <MonoText testID="text-wallet-address">
                  {shortHex(chain.myWalletAddress)}
                </MonoText>
              </KeyValueRow>
              <KeyValueRow label="Balance">
                <Text style={styles.valueText} testID="text-balance">
                  {chain.myBalanceUsdc !== null && chain.myBalanceUsdc !== undefined
                    ? `${formatUsdc(chain.myBalanceUsdc)} test USDC`
                    : "—"}
                </Text>
              </KeyValueRow>
              <Text style={styles.statusMessage}>{chain.statusMessage}</Text>
              <View style={styles.linkColumn}>
                <LinkText
                  label="Get test USDC from the faucet"
                  onPress={() => Linking.openURL(chain.faucetUrl)}
                  testID="link-faucet"
                />
                {chain.explorerBaseUrl && chain.myWalletAddress ? (
                  <LinkText
                    label="View wallet on ArcScan"
                    onPress={() =>
                      Linking.openURL(`${chain.explorerBaseUrl}/address/${chain.myWalletAddress}`)
                    }
                    testID="link-wallet-explorer"
                  />
                ) : null}
              </View>
            </>
          ) : null}
        </Card>

        <SectionTitle>About</SectionTitle>
        <Card>
          <Text style={styles.bodyText}>
            Sealed Invoices runs on Arc's test network. Every amount is test USDC — practice
            money from a faucet, not real dollars. Invoice contents are encrypted on your
            devices; the chain records only the fingerprint stamp and the test-USDC payment.
          </Text>
        </Card>

        <Button
          title="Sign out"
          variant="secondary"
          onPress={handleSignOut}
          loading={signingOut}
          testID="button-sign-out"
          style={{ marginTop: 4 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 96, gap: 12 },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    color: c.foreground,
    marginBottom: 4,
  },
  name: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    color: c.foreground,
  },
  email: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: c.mutedForeground,
    marginTop: 2,
  },
  bodyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: c.foreground,
  },
  valueText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: c.foreground,
  },
  statusMessage: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: c.mutedForeground,
    marginTop: 6,
  },
  linkColumn: { gap: 8, marginTop: 10 },
  buttonRow: { flexDirection: "row", gap: 8 },
});
