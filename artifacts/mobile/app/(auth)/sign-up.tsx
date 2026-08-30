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
import { useAuth, useSignUp } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";
import { Banner, Button } from "@/components/ui";
import { GoogleSSOButton } from "@/components/GoogleSSOButton";
import { WaxSeal } from "@/components/WaxSeal";
import { clerkErrorMessage } from "@/lib/clerkError";

const c = colors.light;

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    setFormError(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
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
    }
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.container}>
            <WaxSeal size={56} />
            <Text style={styles.title}>Check your email</Text>
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
              onPress={() => signUp.verifications.sendEmailCode()}
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Use the same email your invoices are addressed to — accounts are matched by
            sign-in, not by wallet.
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
            {errors.fields.emailAddress?.message ? (
              <Text style={styles.fieldError}>{errors.fields.emailAddress.message}</Text>
            ) : null}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              placeholder="Pick a strong password"
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
              title="Create account"
              onPress={handleSubmit}
              disabled={!emailAddress || !password}
              loading={fetchStatus === "fetching"}
              testID="button-sign-up"
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSSOButton onError={setFormError} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/sign-in" testID="link-sign-in">
              <Text style={styles.footerLink}>Sign in</Text>
            </Link>
          </View>

          {/* Required for sign-up flows. Clerk's bot sign-up protection is enabled by default. */}
          <View nativeID="clerk-captcha" />
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
    fontSize: 26,
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
});
