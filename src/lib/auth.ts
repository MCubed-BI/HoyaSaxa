import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "ga_session";
export const DEFAULT_COACH_USERNAME = "Hoyas";
export const DEFAULT_COACH_PASSWORD = "Sgarlata35";

export function getCoachCredentials() {
  return {
    username: process.env.COACH_USERNAME?.trim() || DEFAULT_COACH_USERNAME,
    password: process.env.COACH_PASSWORD || DEFAULT_COACH_PASSWORD,
  };
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("georgetown-alum-cmp", a);
  const right = hmac("georgetown-alum-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function sessionSecret() {
  const { username, password } = getCoachCredentials();
  return hmac("georgetown-alum-session", `${username}:${password}`);
}

export function createSessionToken() {
  const { username } = getCoachCredentials();
  const issuedAt = Date.now().toString();
  const payload = `${username}.${issuedAt}`;
  return `${payload}.${hmac(sessionSecret(), payload)}`;
}

export function isValidSessionToken(token: string | undefined | null) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [username, issuedAt, signature] = parts;
  if (!username || !issuedAt || !signature) return false;
  const { username: expectedUser } = getCoachCredentials();
  if (!safeEqual(username, expectedUser)) return false;
  const expected = hmac(sessionSecret(), `${username}.${issuedAt}`);
  return safeEqual(signature, expected);
}

export function verifyCredentials(username: string, password: string) {
  const creds = getCoachCredentials();
  return safeEqual(username.trim(), creds.username) && safeEqual(password, creds.password);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}
