import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSignIn } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { Banner, Button } from "@/components/ui";
import { GoogleSSOButton } from "@/components/GoogleSSOButton";
import { WaxSeal } from "@/components/WaxSeal";
import { clerkErrorMessage } from "@/lib/clerkError";

const c = colors.light;

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const finalize = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          return;
        }
        const url = decorateUrl("/");
        if (Platform.OS === "web" && url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url as Href);
        }
      },
    });
  };

  const handleSubmit = async () => {
    setFormError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }
    if (signIn.status === "complete") {
      await finalize();
    } else if (signIn.status === "needs_second_factor") {
      setFormError(
        "This account uses two-factor authentication. Please sign in on the web app instead.",
      );
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    }
  };

  const handleVerify = async () => {
    setFormError(null);
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await finalize();
    }
  };

  if (signIn.status === "needs_client_trust") {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.container}>
            <WaxSeal size={56} />
            <Text style={styles.title}>Confirm it's you</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to {emailAddress || "your email"}.
            </Text>
            <TextInput
              style={styles.input}
              value={code}
              placeholder="Verification code"
              placeholderTextColor={c.mutedForeground}
              onChangeText={setCode}
              keyboardType="number-pad"
              testID="input-code"
            />
            {errors.fields.code?.message ? (
              <Text style={styles.fieldError}>{errors.fields.code.message}</Text>
            ) : null}
            {formError ? <Banner tone="error">{formError}</Banner> : null}
            <Button
              title="Verify"
              onPress={handleVerify}
              loading={fetchStatus === "fetching"}
              disabled={!code}
              testID="button-verify-code"
            />
            <Button
              title="Send a new code"
              variant="secondary"
              onPress={() => signIn.mfa.sendEmailCode()}
              testID="button-resend-code"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <WaxSeal size={64} />
          <Text style={styles.title}>Sealed Invoices</Text>
          <Text style={styles.subtitle}>
            Private invoices, sealed on your device and stamped on Arc's test network.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              value={emailAddress}
              placeholder="you@example.com"
              placeholderTextColor={c.mutedForeground}
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              testID="input-email"
            />
            {errors.fields.identifier?.message ? (
              <Text style={styles.fieldError}>{errors.fields.identifier.message}</Text>
            ) : null}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              placeholder="Your password"
              placeholderTextColor={c.mutedForeground}
              secureTextEntry
              onChangeText={setPassword}
              testID="input-password"
            />
            {errors.fields.password?.message ? (
              <Text style={styles.fieldError}>{errors.fields.password.message}</Text>
            ) : null}

            {formError ? <Banner tone="error">{formError}</Banner> : null}

            <Button
              title="Sign in"
              onPress={handleSubmit}
              disabled={!emailAddress || !password}
              loading={fetchStatus === "fetching"}
              testID="button-sign-in"
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSSOButton onError={setFormError} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New here? </Text>
            <Link href="/sign-up" testID="link-sign-up">
              <Text style={styles.footerLink}>Create an account</Text>
            </Link>
          </View>

          <Text style={styles.honesty}>
            Runs on Arc's test network — every amount you'll see is test USDC, not real
            money.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  container: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: c.foreground,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: c.mutedForeground,
    textAlign: "center",
    marginBottom: 10,
  },
  form: { width: "100%", gap: 8, marginTop: 6 },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: c.foreground,
    marginTop: 6,
  },
  input: {
    width: "100%",
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
  fieldError: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: "#B91C1C",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: c.mutedForeground,
  },
  footerRow: { flexDirection: "row", marginTop: 16 },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: c.mutedForeground,
  },
  footerLink: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: c.seal,
  },
  honesty: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: c.mutedForeground,
    textAlign: "center",
    marginTop: 18,
  },
});
