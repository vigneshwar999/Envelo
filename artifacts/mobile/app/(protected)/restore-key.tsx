import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useGetMe } from "@workspace/api-client-react";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { apiErrorStatus } from "@/lib/apiError";
import { Banner, Button } from "@/components/ui";
import { useEnvelopeKey } from "@/context/KeyContext";

const c = colors.light;

export default function RestoreKeyScreen() {
  const router = useRouter();
  const meQ = useGetMe();
  const key = useEnvelopeKey();

  const [backupText, setBackupText] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);

  // A backup can only be checked against the key registered on the account,
  // so restoring stays locked until that key has actually loaded.
  const registeredKey = meQ.data?.publicKeyJwk ?? null;
  const accountState: "loading" | "not-set-up" | "no-key" | "error" | "ready" = meQ.isLoading
    ? "loading"
    : meQ.error
      ? apiErrorStatus(meQ.error) === 404
        ? "not-set-up"
        : "error"
      : registeredKey
        ? "ready"
        : "no-key";

  const handleRestore = async () => {
    if (!registeredKey) return;
    setError(null);
    setWorking(true);
    try {
      await key.restore(backupText, passphrase, registeredKey);
      setDone(true);
      setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "That backup could not be restored.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>
          Your envelope key was created in your browser and never leaves your devices
          unencrypted. In the web app, open Dashboard → Envelope Key → Back up, then paste
          the whole backup file below along with its passphrase.
        </Text>

        <Text style={styles.label}>Backup file contents</Text>
        <TextInput
          style={styles.jsonInput}
          multiline
          value={backupText}
          onChangeText={setBackupText}
          placeholder='{"app":"sealed-invoices","kind":"envelope-key-backup",…}'
          placeholderTextColor={c.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          testID="input-backup-json"
        />

        <Text style={styles.label}>Backup passphrase</Text>
        <TextInput
          style={styles.input}
          value={passphrase}
          onChangeText={setPassphrase}
          placeholder="The passphrase you chose when backing up"
          placeholderTextColor={c.mutedForeground}
          secureTextEntry
          testID="input-passphrase"
        />

        <Text style={styles.note}>
          Unlocking runs 310,000 key-derivation rounds on this device, so it can take a few
          seconds. The key and passphrase are never sent anywhere.
        </Text>

        {accountState === "loading" ? (
          <Banner tone="info" testID="banner-account-loading">
            Checking which key your account uses…
          </Banner>
        ) : null}
        {accountState === "not-set-up" ? (
          <Banner tone="warning" testID="banner-account-not-set-up">
            This account hasn't finished setup in the web app yet, so there's no registered
            key to restore against. Sign in on the web first.
          </Banner>
        ) : null}
        {accountState === "no-key" ? (
          <Banner tone="warning" testID="banner-account-no-key">
            Your account doesn't have an envelope key registered yet. Open the web app once
            so it can set your key up, then back it up and restore it here.
          </Banner>
        ) : null}
        {accountState === "error" ? (
          <Banner
            tone="error"
            testID="banner-account-error"
            action={{ label: "Try again", onPress: () => meQ.refetch() }}
          >
            Couldn't load your account's registered key, so a backup can't be checked yet.
          </Banner>
        ) : null}

        {error ? <Banner tone="error" testID="banner-restore-error">{error}</Banner> : null}
        {done ? (
          <Banner tone="success" testID="banner-restore-success">
            Key restored — envelopes will now open on this device.
          </Banner>
        ) : null}

        <Button
          title={working ? "Unlocking…" : "Restore key"}
          onPress={handleRestore}
          disabled={accountState !== "ready" || !backupText.trim() || !passphrase || done}
          loading={working}
          testID="button-restore"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 48, gap: 10 },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: c.foreground,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: c.foreground,
    marginTop: 8,
  },
  jsonInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: c.input,
    backgroundColor: c.card,
    borderRadius: colors.radius + 2,
    padding: 12,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: c.foreground,
    textAlignVertical: "top",
  },
  input: {
    borderWidth: 1,
    borderColor: c.input,
    backgroundColor: c.card,
    borderRadius: colors.radius + 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: c.foreground,
  },
  note: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: c.mutedForeground,
  },
});
