/** Alum cookie owned by Register/Claim. Present on main only after that lane lands. */
export const HOYA_ALUM_SESSION_COOKIE = "hoya_alum_session";

/** Compatibility alias used by the in-flight claim branch. Do not invent staff unlock. */
export const ALUM_SESSION_COOKIE_ALIASES = [HOYA_ALUM_SESSION_COOKIE, "ga_alumni_session"] as const;

export function hasAlumSessionCookie(
  readCookie: (name: string) => string | undefined | null,
) {
  return ALUM_SESSION_COOKIE_ALIASES.some((name) => Boolean(readCookie(name)?.trim()));
}
