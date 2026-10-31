import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

export const GMAIL_OAUTH_SCOPES = [
  "https://mail.google.com/",
  "openid",
  "email",
].join(" ");

export const GMAIL_OAUTH_STATE_COOKIE = "gmail_oauth_state";

export function gmailClientId() {
  return process.env.GMAIL_CLIENT_ID?.trim() || "";
}

export function gmailClientSecret() {
  return process.env.GMAIL_CLIENT_SECRET?.trim() || "";
}

export function gmailRefreshTokenFromEnv() {
  return process.env.GMAIL_REFRESH_TOKEN?.trim() || "";
}

/** OAuth client is ready for Connect Gmail (does not mean a mailbox is linked yet). */
export function gmailOAuthClientConfigured() {
  return Boolean(gmailClientId() && gmailClientSecret());
}

function oauthStateSecret() {
  return (
    process.env.GMAIL_OAUTH_STATE_SECRET?.trim() ||
    process.env.ALUM_SESSION_SECRET?.trim() ||
    process.env.COACH_PASSWORD?.trim() ||
    "gmail-oauth-state"
  );
}

export function createGmailOAuthState() {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", oauthStateSecret()).update(nonce).digest("hex");
  return `${nonce}.${sig}`;
}

export function verifyGmailOAuthState(state: string | null | undefined) {
  if (!state || !state.includes(".")) return false;
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return false;
  const expected = createHmac("sha256", oauthStateSecret()).update(nonce).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function gmailOAuthRedirectUri(origin: string) {
  const configured = process.env.GMAIL_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${origin.replace(/\/$/, "")}/api/gmail/oauth/callback`;
}

export function buildGmailOAuthAuthUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: gmailClientId(),
    redirect_uri: gmailOAuthRedirectUri(origin),
    response_type: "code",
    scope: GMAIL_OAUTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeGmailOAuthCode(origin: string, code: string): Promise<GmailTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: gmailClientId(),
    client_secret: gmailClientSecret(),
    redirect_uri: gmailOAuthRedirectUri(origin),
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await response.json().catch(() => ({}))) as GmailTokenResponse;
}

export async function refreshGmailAccessToken(refreshToken: string): Promise<GmailTokenResponse> {
  const body = new URLSearchParams({
    client_id: gmailClientId(),
    client_secret: gmailClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return (await response.json().catch(() => ({}))) as GmailTokenResponse;
}

export async function fetchGmailOAuthEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json().catch(() => ({}))) as { email?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google userinfo ${response.status}`);
  }
  const email = payload.email?.trim().toLowerCase() || "";
  if (!email) throw new Error("Google did not return an email for this account.");
  return email;
}

export async function ensureGmailOAuthTable() {
  const sql = getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS gmail_oauth_tokens (
      id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      email text NOT NULL,
      refresh_token text NOT NULL,
      access_token text,
      expiry_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export type StoredGmailOAuth = {
  email: string;
  refreshToken: string;
  accessToken: string | null;
  expiryAt: Date | null;
};

export async function readStoredGmailOAuth(): Promise<StoredGmailOAuth | null> {
  await ensureGmailOAuthTable();
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT email, refresh_token, access_token, expiry_at
     FROM gmail_oauth_tokens
     WHERE id = 1
     LIMIT 1`,
  )) as Array<{
    email: string;
    refresh_token: string;
    access_token: string | null;
    expiry_at: string | Date | null;
  }>;
  const row = rows[0];
  if (!row?.refresh_token) return null;
  return {
    email: row.email.trim().toLowerCase(),
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    expiryAt: row.expiry_at ? new Date(row.expiry_at) : null,
  };
}

export async function saveGmailOAuthTokens(input: {
  email: string;
  refreshToken: string;
  accessToken?: string | null;
  expiresIn?: number | null;
}) {
  await ensureGmailOAuthTable();
  const sql = getSql();
  const expiryAt =
    input.expiresIn && input.expiresIn > 0
      ? new Date(Date.now() + input.expiresIn * 1000).toISOString()
      : null;
  await sql.query(
    `INSERT INTO gmail_oauth_tokens (id, email, refresh_token, access_token, expiry_at, updated_at)
     VALUES (1, $1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       refresh_token = EXCLUDED.refresh_token,
       access_token = EXCLUDED.access_token,
       expiry_at = EXCLUDED.expiry_at,
       updated_at = now()`,
    [input.email.trim().toLowerCase(), input.refreshToken, input.accessToken ?? null, expiryAt],
  );
}

export async function clearStoredGmailOAuth() {
  await ensureGmailOAuthTable();
  const sql = getSql();
  await sql.query(`DELETE FROM gmail_oauth_tokens WHERE id = 1`);
}

/** Refresh token from Vercel env or the singleton Neon row. */
export async function resolveGmailRefreshToken() {
  const fromEnv = gmailRefreshTokenFromEnv();
  if (fromEnv) {
    return { refreshToken: fromEnv, email: null as string | null, source: "env" as const };
  }
  try {
    const stored = await readStoredGmailOAuth();
    if (stored?.refreshToken) {
      return { refreshToken: stored.refreshToken, email: stored.email, source: "db" as const };
    }
  } catch {
    // DATABASE_URL may be missing in unit tests.
  }
  return null;
}

export async function gmailOAuthLinked() {
  if (!gmailOAuthClientConfigured()) return false;
  const token = await resolveGmailRefreshToken();
  return Boolean(token?.refreshToken);
}

/**
 * Return a usable access token for Gmail API calls. Refreshes when missing/expired
 * and persists the new access token when the refresh token lives in Neon.
 */
export async function getValidGmailAccessToken(): Promise<
  { ok: true; accessToken: string; email: string } | { ok: false; error: string }
> {
  if (!gmailOAuthClientConfigured()) {
    return { ok: false, error: "Gmail OAuth client is not configured" };
  }

  let stored: StoredGmailOAuth | null = null;
  try {
    stored = await readStoredGmailOAuth();
  } catch {
    stored = null;
  }

  const refreshToken = stored?.refreshToken || gmailRefreshTokenFromEnv();
  if (!refreshToken) {
    return { ok: false, error: "Gmail is not linked. Click Connect Gmail on /blast." };
  }

  const email = (stored?.email || process.env.GMAIL_USER?.trim().toLowerCase() || "").trim();
  const freshEnough =
    stored?.accessToken &&
    stored.expiryAt &&
    stored.expiryAt.getTime() - Date.now() > 60_000;

  if (freshEnough && stored?.accessToken) {
    return { ok: true, accessToken: stored.accessToken, email };
  }

  const refreshed = await refreshGmailAccessToken(refreshToken);
  if (!refreshed.access_token) {
    return {
      ok: false,
      error: refreshed.error_description || refreshed.error || "Could not refresh Gmail access token",
    };
  }

  if (stored?.refreshToken && email) {
    try {
      await saveGmailOAuthTokens({
        email,
        refreshToken: stored.refreshToken,
        accessToken: refreshed.access_token,
        expiresIn: refreshed.expires_in,
      });
    } catch {
      // Sending can still proceed with the in-memory access token.
    }
  }

  return { ok: true, accessToken: refreshed.access_token, email };
}
