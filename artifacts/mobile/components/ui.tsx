/** Small shared UI primitives, styled with the brand tokens. */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";

const c = colors.light;

// ---------------------------------------------------------------- Button

type ButtonVariant = "primary" | "secondary" | "seal" | "destructive";

export function Button(props: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { title, onPress, variant = "primary", disabled, loading, testID, style } = props;
  const isDisabled = disabled || loading;
  const background =
    variant === "primary"
      ? c.primary
      : variant === "seal"
        ? c.seal
        : variant === "destructive"
          ? c.destructive
          : c.card;
  const textColor = variant === "secondary" ? c.foreground : "#FFFFFF";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        variant === "secondary" && styles.buttonSecondary,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Card

export function Card(props: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={props.testID} style={[styles.card, props.style]}>
      {props.children}
    </View>
  );
}

export function SectionTitle(props: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{props.children}</Text>;
}

// ---------------------------------------------------------------- Badge

export type BadgeTone = "amber" | "green" | "neutral" | "red";

export function Badge(props: { label: string; tone?: BadgeTone; testID?: string }) {
  const tone = props.tone ?? "neutral";
  const palette: Record<BadgeTone, { bg: string; fg: string }> = {
    amber: { bg: c.warningSoft, fg: c.warningForeground },
    green: { bg: c.successSoft, fg: c.success },
    neutral: { bg: c.muted, fg: c.mutedForeground },
    red: { bg: c.destructiveSoft, fg: "#B91C1C" },
  };
  return (
    <View testID={props.testID} style={[styles.badge, { backgroundColor: palette[tone].bg }]}>
      <Text style={[styles.badgeText, { color: palette[tone].fg }]}>{props.label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Banner

export type BannerTone = "info" | "warning" | "error" | "success";

export function Banner(props: {
  tone?: BannerTone;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  const tone = props.tone ?? "info";
  const palette: Record<BannerTone, { bg: string; border: string; fg: string }> = {
    info: { bg: c.secondary, border: c.border, fg: c.foreground },
    warning: { bg: c.warningSoft, border: "#FDE68A", fg: c.warningForeground },
    error: { bg: c.destructiveSoft, border: "#FECACA", fg: "#B91C1C" },
    success: { bg: c.successSoft, border: "#BBF7D0", fg: c.success },
  };
  const p = palette[tone];
  return (
    <View testID={props.testID} style={[styles.banner, { backgroundColor: p.bg, borderColor: p.border }]}>
      <Text style={[styles.bannerText, { color: p.fg }]}>{props.children}</Text>
      {props.action ? (
        <Pressable
          testID={props.action.testID}
          onPress={props.action.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [styles.bannerAction, pressed && styles.buttonPressed]}
        >
          <Text style={styles.bannerActionText}>{props.action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- misc

export function MonoText(props: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  return (
    <Text testID={props.testID} style={[styles.mono, props.style]}>
      {props.children}
    </Text>
  );
}

export function KeyValueRow(props: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{props.label}</Text>
      <View style={styles.kvValue}>{props.children}</View>
    </View>
  );
}

export function LoadingView(props: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={c.primary} />
      {props.label ? <Text style={styles.loadingLabel}>{props.label}</Text> : null}
    </View>
  );
}

export function LinkText(props: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable onPress={props.onPress} testID={props.testID} accessibilityRole="link">
      <Text style={styles.link}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: colors.radius + 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: c.border,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: colors.radius + 4,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: c.mutedForeground,
    marginBottom: 8,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
  },
  banner: {
    borderRadius: colors.radius + 2,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  bannerText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerAction: {
    alignSelf: "flex-start",
    backgroundColor: c.primary,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerActionText: {
    color: "#FFFFFF",
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: c.foreground,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
  },
  kvLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: c.mutedForeground,
    flexShrink: 0,
  },
  kvValue: { flexShrink: 1, alignItems: "flex-end" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  loadingLabel: {
    fontFamily: fonts.sans,
    color: c.mutedForeground,
    fontSize: 14,
  },
  link: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: c.seal,
    textDecorationLine: "underline",
  },
});
