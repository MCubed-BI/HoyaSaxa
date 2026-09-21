import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell only. The Next.js website on Vercel stays the source of truth.
 * Do not point `webDir` at `.next`, `out`, or `public` — that would mix
 * Capacitor copy output with the web app Vercel deploys.
 */

/** App Store / Play application id. Register this exact string on Mike's accounts. */
export const CAP_APP_ID = "com.nipseytech.georgetownfootballalum";

/** Home-screen / store display name (may truncate on small icons). */
export const CAP_APP_NAME = "Georgetown Football Alum Network";

/** Production WebView URL. Override at sync time with CAP_SERVER_URL. */
export const DEFAULT_CAP_SERVER_URL = "https://georgetown-alum.vercel.app";

/** Day-1 custom URL scheme stub. Universal Links are not configured yet. */
export const CAP_URL_SCHEME = "hoyasaxa";

/** Georgetown blue — splash, icon mat, and WebView background. */
export const GEORGETOWN_BLUE = "#041E42";

export function resolveCapServerUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.CAP_SERVER_URL?.trim();
  return raw || DEFAULT_CAP_SERVER_URL;
}

function allowNavigationHosts(serverUrl: string): string[] {
  const hosts = new Set<string>(["georgetown-alum.vercel.app", "*.vercel.app"]);
  try {
    const { hostname } = new URL(serverUrl);
    if (hostname) hosts.add(hostname);
  } catch {
    // Keep the production allow-list if CAP_SERVER_URL is not a full URL.
  }
  return [...hosts];
}

const serverUrl = resolveCapServerUrl();

const config: CapacitorConfig = {
  appId: CAP_APP_ID,
  appName: CAP_APP_NAME,
  webDir: "native/www",
  backgroundColor: GEORGETOWN_BLUE,
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "offline.html",
    allowNavigation: allowNavigationHosts(serverUrl),
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: GEORGETOWN_BLUE,
  },
  android: {
    backgroundColor: GEORGETOWN_BLUE,
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: GEORGETOWN_BLUE,
      showSpinner: false,
    },
    Camera: {
      presentationStyle: "popover",
    },
    // Leave both off. The WebView origin is the live site, so cookies and
    // fetch stay first-party. Enabling these overrides can break httpOnly
    // ga_session / hoya_alum_session cookies.
    CapacitorCookies: {
      enabled: false,
    },
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
