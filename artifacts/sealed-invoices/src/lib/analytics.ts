type AnalyticsData = Record<string, string | number | boolean>;

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