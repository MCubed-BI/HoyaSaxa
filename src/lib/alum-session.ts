/**
 * Shared alum / board session contract (claim PR + GTown portal).
 *
 * Import this module. Do not reuse the coach `ga_session` cookie.
 *
 * Cookie: hoya_alum_session (httpOnly, Secure in production, SameSite=Lax, path=/)
 * Token:  base64url(JSON).hmacSha256
 * JSON:   { v: 1, role: "alum" | "board", alumniId, email, name, exp }
 *
 * How portal checks “is alum logged in”:
 *   import { isAlumLoggedIn, parseAlumSessionToken, ALUM_SESSION_COOKIE } from "@/lib/alum-session";
 *   const alum = isAlumLoggedIn(await cookies());
 *   // or: parseAlumSessionToken(jar.get(ALUM_SESSION_COOKIE)?.value)?.role === "alum"
 *
 * Register myself / alumni login always set role `"alum"` (never `"board"`).
 * Claim / login also grants the Verified Hoya badge. Platform admin is resolved
 * separately (`src/lib/platform-roles.ts`) from ADMIN_EMAILS, staff_roles, coach
 * `ga_session`, or seeded identities — this cookie payload does not gain a new field.
 * `board` writes the Board feed section (legacy Newsflash). Coach/owner / admin
 * post Sgarlata notes via ga_session or platform admin.
 * This cookie never unlocks Data Sync, owner /blast, Twilio, or other staff gates.
 * Selected-directory email lives at /portal/blast and is scoped in /api/blast/*.
 * Locker-preview tokens ({ role, label, iat }) are a separate signer — see hoya-alum-session.ts.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCoachCredentials } from "@/lib/auth";

export const ALUM_SESSION_COOKIE = "hoya_alum_session";
export const alumSessionCookieName = ALUM_SESSION_COOKIE;
/** Claim import alias — same cookie as `ALUM_SESSION_COOKIE`, not `ga_session`. */
export const ALUMNI_SESSION_COOKIE = ALUM_SESSION_COOKIE;
export const LEGACY_ALUMNI_SESSION_COOKIE = "ga_alumni_session";
export const ALUM_ROLE = "alum" as const;
export const BOARD_ROLE = "board" as const;

export type AlumRole = "alum" | "board";

export type AlumSession = {
  v: 1;
  role: AlumRole;
  alumniId: string;
  email: string;
  name: string;
  exp: number;
};

export type AlumSessionPayload = AlumSession;

export type CookieJar = {
  get(name: string): { value: string } | undefined;
};

/** Sentinel used when preview `Alum` login has no claimed roster row. */
export const PREVIEW_ALUMNI_ID = "00000000-0000-0000-0000-000000000000";

export function isPreviewAlumniId(alumniId: string | null | undefined) {
  return Boolean(alumniId && alumniId.trim() === PREVIEW_ALUMNI_ID);
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("hoya-alum-cmp", a);
  const right = hmac("hoya-alum-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function alumSessionSecret() {
  if (process.env.ALUM_SESSION_SECRET?.trim()) {
    return process.env.ALUM_SESSION_SECRET.trim();
  }
  if (process.env.ALUMNI_SESSION_SECRET?.trim()) {
    return process.env.ALUMNI_SESSION_SECRET.trim();
  }
  const { username, password } = getCoachCredentials();
  return hmac("hoya-alum-session", `${username}:${password}:hoya-alum`);
}

export function alumSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

type CookieSetter = {
  cookies: {
    set: (name: string, value: string, options?: Record<string, unknown>) => unknown;
  };
};

/** Claim login should call this after authenticate — not the coach session helpers. */
export function writeAlumSessionCookie(
  response: CookieSetter,
  session: {
    role: AlumRole;
    alumniId: string;
    email: string;
    name: string;
  },
) {
  response.cookies.set(ALUM_SESSION_COOKIE, createAlumSessionToken(session), alumSessionCookieOptions());
}

export function setAlumSessionCookies(
  response: CookieSetter,
  session: {
    role: AlumRole;
    alumniId: string;
    email: string;
    name: string;
  },
) {
  writeAlumSessionCookie(response, session);
}

export function clearAlumSessionCookie(response: CookieSetter) {
  response.cookies.set(ALUM_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export function clearAlumSessionCookies(response: CookieSetter) {
  clearAlumSessionCookie(response);
}

export function createAlumSessionToken(input: {
  role: AlumRole;
  alumniId?: string;
  email?: string;
  name?: string;
  exp?: number;
}) {
  const session: AlumSession = {
    v: 1,
    role: input.role,
    alumniId: input.alumniId?.trim() || PREVIEW_ALUMNI_ID,
    email: input.email?.trim() || "",
    name: input.name?.trim() || (input.role === "board" ? "Lars" : "Alumnus"),
    exp: input.exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${hmac(alumSessionSecret(), payload)}`;
}

export function parseAlumSessionToken(token: string | undefined | null): AlumSession | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!payload || !signature) return null;
  const expected = hmac(alumSessionSecret(), payload);
  if (!safeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AlumSession>;
    if (parsed.v !== 1) return null;
    if (parsed.role !== "alum" && parsed.role !== "board") return null;
    if (typeof parsed.alumniId !== "string" || typeof parsed.email !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    if (typeof parsed.exp !== "number" || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return {
      v: 1,
      role: parsed.role,
      alumniId: parsed.alumniId,
      email: parsed.email,
      name: parsed.name,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

type CookieReader = {
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
};

function tokenFromRequest(req: Request | CookieReader | string | null | undefined) {
  if (!req) return null;
  if (typeof req === "string") return req;
  if ("cookies" in req && typeof req.cookies.get === "function") {
    return req.cookies.get(ALUM_SESSION_COOKIE)?.value ?? null;
  }
  const cookie = (req as Request).headers?.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ALUM_SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(ALUM_SESSION_COOKIE.length + 1)) : null;
}

export function readAlumSession(req: Request | CookieReader | string | null | undefined) {
  return parseAlumSessionToken(tokenFromRequest(req));
}

export async function readAlumSessionFromCookies() {
  const jar = await cookies();
  return parseAlumSessionToken(jar.get(ALUM_SESSION_COOKIE)?.value);
}

export async function requireAlumRole(...roles: AlumRole[]) {
  const session = await readAlumSessionFromCookies();
  if (!session || (roles.length > 0 && !roles.includes(session.role))) {
    redirect("/alumni-login");
  }
  return session;
}

export function isPreviewAlumSession(session: AlumSession) {
  return isPreviewAlumniId(session.alumniId);
}

/** Portal/auth-boundary: true only when `hoya_alum_session` verifies as role `alum`. */
export function isAlumLoggedIn(cookies: CookieJar) {
  return parseAlumSessionToken(cookies.get(ALUM_SESSION_COOKIE)?.value)?.role === ALUM_ROLE;
}

export function getAlumSession(cookies: CookieJar) {
  return parseAlumSessionToken(cookies.get(ALUM_SESSION_COOKIE)?.value);
}
