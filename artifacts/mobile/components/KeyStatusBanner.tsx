/** Inline banner shown wherever the envelope key is missing or mismatched. */
import React from "react";
import { Banner } from "@/components/ui";

export type DeviceKeyStatus = "loading" | "ready" | "none" | "mismatch";

export function keyStatusMessage(status: DeviceKeyStatus): string | null {
  switch (status) {
    case "none":
      return "This device doesn't hold your envelope key yet. Restore it from the backup you made in the web app to open invoices here.";
    case "mismatch":
      return "The key on this device doesn't match your account's current envelope key — it may have been rotated or reset in the web app. Restore your latest backup.";
    default:
      return null;
  }
}

export function KeyStatusBanner(props: {
  status: DeviceKeyStatus;
  onRestore: () => void;
}) {
  const message = keyStatusMessage(props.status);
  if (!message) return null;
  return (
    <Banner
      tone="warning"
      testID="banner-key-status"
      action={{ label: "Restore key", onPress: props.onRestore, testID: "button-restore-key-banner" }}
    >
      {message}
    </Banner>
  );
}
