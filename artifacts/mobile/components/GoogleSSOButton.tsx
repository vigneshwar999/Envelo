/** "Continue with Google" via Clerk SSO, per the Expo custom-flow guide. */
import React, { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { Button } from "@/components/ui";
import { clerkErrorMessage } from "@/lib/clerkError";

// Preloads the browser on Android to reduce authentication load time.
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

// Handle any pending authentication sessions.
WebBrowser.maybeCompleteAuthSession();

export function GoogleSSOButton(props: { onError: (message: string) => void }) {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const { onError } = props;

  const onPress = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({
          session: createdSessionId,
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              return;
            }
            const url = decorateUrl("/");
            if (Platform.OS === "web" && typeof url === "string" && url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url as Href);
            }
          },
        });
      }
      // Without a createdSessionId there are missing requirements (e.g. MFA);
      // those accounts can finish sign-in with email + password instead.
    } catch (err) {
      onError(clerkErrorMessage(err));
    }
  }, [startSSOFlow, router, onError]);

  return (
    <Button
      title="Continue with Google"
      variant="secondary"
      onPress={onPress}
      testID="button-google"
    />
  );
}
