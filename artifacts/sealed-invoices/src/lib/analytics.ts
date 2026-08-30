type AnalyticsData = Record<string, string | number | boolean>;
export type ExploreSignupLocation = "hero" | "final";

const EXPLORE_SIGNUP_INTENT_KEY = "envelo:explore-signup-location";

/**
 * Replit's deployment proxy injects Project Analytics as `window.umami` after
 * analytics is enabled in Publishing settings and the app is published. The
 * transport is intentionally absent from application source and development;
 * do not add an analytics script, website ID, script URL, or environment
 * variable here.
 */
declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;

  try {
    window.umami?.track(name, data);
  } catch {
    // Analytics must never interrupt the user's navigation.
  }
}

export function rememberExploreSignupIntent(
  location: ExploreSignupLocation,
): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(EXPLORE_SIGNUP_INTENT_KEY, location);
  } catch {
    // Attribution is optional and must never interrupt signup navigation.
  }
}

export function consumeExploreSignupIntent(): ExploreSignupLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const location = window.sessionStorage.getItem(
      EXPLORE_SIGNUP_INTENT_KEY,
    );
    window.sessionStorage.removeItem(EXPLORE_SIGNUP_INTENT_KEY);
    return location === "hero" || location === "final" ? location : null;
  } catch {
    // Account setup must succeed even when browser storage is unavailable.
    return null;
  }
}