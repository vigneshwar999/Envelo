import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRootNavigationState, useRouter } from "expo-router";
import { useRegisterPushToken } from "@workspace/api-client-react";

// Foreground presentation: a new-invoice banner should show even while the
// app is open (banner + notification list; no sound spam, no badge counts to
// maintain). Never runs on web - browsers don't get Expo notifications.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for permission (the OS prompt appears right after sign-in, the moment
 * notifications become relevant) and fetch this device's Expo push token.
 * Returns null when the user declined - we stay quiet and never nag.
 */
async function obtainPushRegistration(): Promise<
  { token: string; platform: "ios" | "android" } | null
> {
  // Android shows nothing without a channel; the server sends on exactly
  // this channel id.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("invoices", {
      name: "New invoices",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted" && current.canAskAgain) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;
  const projectId = resolveEasProjectId();
  if (!projectId) {
    // Expo cannot mint a push token without an EAS project ID, and a fresh
    // Replit app has none until it is published (Expo Launch links an EAS
    // project). Calling getExpoPushTokenAsync anyway would just throw. Say
    // so visibly instead of failing quietly - everything else about the
    // feature is ready and activates the moment an ID exists.
    console.warn(
      "Push notifications are wired up but inactive: no EAS project ID yet. " +
        "Publish the app (Expo Launch) or set EXPO_PUBLIC_EAS_PROJECT_ID, " +
        "and new-invoice alerts will start working.",
    );
    return null;
  }
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return {
    token: tokenResponse.data,
    platform: Platform.OS === "ios" ? "ios" : "android",
  };
}

/**
 * The EAS project ID this app pushes under. Priority: explicit env override
 * -> app config (Expo Launch fills extra.eas.projectId in when it links an
 * EAS project) -> config injected in EAS builds. Returns null when the app
 * has no EAS project yet (normal in development before first publish).
 */
function resolveEasProjectId(): string | null {
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  return typeof projectId === "string" && projectId.length > 0 ? projectId : null;
}

function NativePushNotifications() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const navReady = navState?.key != null;
  const registerMut = useRegisterPushToken();
  // The mutation object changes identity every render - keep the latest
  // mutate in a ref so the one-shot effect below never re-fires.
  const mutateRef = useRef(registerMut.mutate);
  mutateRef.current = registerMut.mutate;

  // Register this device once per signed-in session. The protected tree is
  // keyed by userId, so switching accounts remounts this component and
  // re-ties the device token to the new account (the server upserts by
  // token - a shared phone only buzzes for whoever signed in last).
  useEffect(() => {
    let cancelled = false;
    obtainPushRegistration()
      .then((registration) => {
        if (registration && !cancelled) {
          mutateRef.current({ data: registration });
        }
      })
      .catch((err: unknown) => {
        // Expected in some environments (Expo Go on Android cannot receive
        // remote pushes since SDK 53) - the app works fine without.
        console.log(
          "Push registration unavailable:",
          err instanceof Error ? err.message : err,
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link: tapping "Asha sent you invoice INV-042" opens that invoice.
  // useLastNotificationResponse covers BOTH a cold start (the tap launched
  // the app) and a tap while the app was already running.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse || !navReady) return;
    const data = lastResponse.notification.request.content.data;
    const invoiceId =
      data && typeof data.invoiceId === "string" ? data.invoiceId : null;
    // Only ever navigate to an invoice id-shaped target - a malformed or
    // hostile payload must not steer the app anywhere else.
    if (!invoiceId || !/^[0-9a-f][0-9a-f-]{8,63}$/i.test(invoiceId)) return;
    const marker = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}`;
    if (handledRef.current === marker) return; // this tap was already handled
    handledRef.current = marker;
    router.push({ pathname: "/invoice/[id]", params: { id: invoiceId } });
  }, [lastResponse, navReady, router]);

  return null;
}

/**
 * Invisible companion mounted inside the signed-in area: prompts for
 * notification permission right after sign-in, registers this device's Expo
 * push token with the server (so new invoices can reach this phone), and
 * turns notification taps into navigation to the invoice.
 */
export function PushNotifications() {
  if (Platform.OS === "web") return null;
  return <NativePushNotifications />;
}
