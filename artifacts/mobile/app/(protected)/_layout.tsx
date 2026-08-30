import React, { useEffect, useState } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { KeyProvider } from "@/context/KeyContext";
import { PushNotifications } from "@/components/PushNotifications";
import colors from "@/constants/colors";
import { fonts } from "@/constants/theme";

const c = colors.light;

/**
 * Every signed-in user gets their OWN React Query cache, created
 * synchronously when this component mounts. The component is keyed by userId
 * below, so switching accounts destroys the old tree (and its cache) and
 * mounts a fresh, empty one — no render can ever read another account's
 * cached invoices or profile, even for a single frame.
 */
function UserScope(props: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>;
}

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const [tokenReady, setTokenReady] = useState(false);

  // Mobile has no browser cookie jar, so every API request carries a Clerk
  // bearer token fetched at request time.
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setTokenReady(true);
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (!tokenReady) return null;
  // key={userId}: account switches remount the whole subtree — fresh query
  // cache (UserScope) and fresh key context, both created before first render.
  return (
    <UserScope key={userId ?? "none"}>
      <KeyProvider>
      {/* Permission prompt + device registration + notification-tap deep
          links. Inside UserScope on purpose: registration uses the generated
          API hooks, and remounting per account re-ties the device token. */}
      <PushNotifications />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.background },
          headerShadowVisible: false,
          headerTintColor: c.foreground,
          headerTitleStyle: { fontFamily: fonts.sansSemiBold, color: c.foreground },
          headerBackTitle: "Back",
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="invoice/[id]" options={{ title: "Invoice" }} />
        <Stack.Screen
          name="restore-key"
          options={{ title: "Restore envelope key", presentation: "modal" }}
        />
      </Stack>
      </KeyProvider>
    </UserScope>
  );
}
