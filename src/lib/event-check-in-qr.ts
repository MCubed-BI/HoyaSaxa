/**
 * Signed QR payloads for event check-in.
 * Alums present the token; admins scan it to write `event_checkins`.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { getCoachCredentials } from "@/lib/auth";
import type { AttendancePerson } from "@/lib/event-attendance";
import { isEventRecordId } from "@/lib/event-attendance";

export const CHECK_IN_QR_TTL_SECONDS = 60 * 60 * 12; // event-day window

export type CheckInQrPayload = {
  v: 1;
  eventId: string;
  personKey: string;
  alumId: string | null;
  userId: string;
  displayName: string;
  exp: number;
};

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = hmac("hoya-checkin-qr-cmp", a);
  const right = hmac("hoya-checkin-qr-cmp", b);
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function checkInQrSecret() {
  if (process.env.EVENT_CHECKIN_QR_SECRET?.trim()) {
    return process.env.EVENT_CHECKIN_QR_SECRET.trim();
  }
  if (process.env.ALUM_SESSION_SECRET?.trim()) {
    return process.env.ALUM_SESSION_SECRET.trim();
  }
  if (process.env.ALUMNI_SESSION_SECRET?.trim()) {
    return process.env.ALUMNI_SESSION_SECRET.trim();
  }
  const { username, password } = getCoachCredentials();
  return hmac("hoya-event-checkin-qr", `${username}:${password}:checkin-qr`);
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createCheckInQrToken(
  input: {
    eventId: string;
    person: AttendancePerson;
    nowMs?: number;
    ttlSeconds?: number;
  },
): string {
  const nowMs = input.nowMs ?? Date.now();
  const ttl = input.ttlSeconds ?? CHECK_IN_QR_TTL_SECONDS;
  const payload: CheckInQrPayload = {
    v: 1,
    eventId: input.eventId,
    personKey: input.person.personKey,
    alumId: input.person.alumId,
    userId: input.person.userId,
    displayName: input.person.displayName,
    exp: Math.floor(nowMs / 1000) + ttl,
  };
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}.${hmac(checkInQrSecret(), body)}`;
}

export function parseCheckInQrToken(
  token: string | null | undefined,
  opts?: { eventId?: string | null; nowMs?: number },
): CheckInQrPayload | null {
  if (!token || typeof token !== "string") return null;
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = trimmed.slice(0, dot);
  const signature = trimmed.slice(dot + 1);
  if (!body || !signature) return null;
  const expected = hmac(checkInQrSecret(), body);
  if (!safeEqual(signature, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(body));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const row = parsed as Record<string, unknown>;
  if (row.v !== 1) return null;
  const eventId = typeof row.eventId === "string" ? row.eventId : "";
  const personKey = typeof row.personKey === "string" ? row.personKey : "";
  const userId = typeof row.userId === "string" ? row.userId : "";
  const displayName = typeof row.displayName === "string" ? row.displayName : "";
  const exp = typeof row.exp === "number" ? row.exp : Number(row.exp);
  const alumId =
    typeof row.alumId === "string" && isEventRecordId(row.alumId) ? row.alumId : null;
  if (!isEventRecordId(eventId) || !personKey || !userId || !displayName || !Number.isFinite(exp)) {
    return null;
  }
  const nowSec = Math.floor((opts?.nowMs ?? Date.now()) / 1000);
  if (exp < nowSec) return null;
  if (opts?.eventId && opts.eventId !== eventId) return null;

  return {
    v: 1,
    eventId,
    personKey,
    alumId,
    userId,
    displayName,
    exp,
  };
}

export function attendancePersonFromCheckInQr(payload: CheckInQrPayload): AttendancePerson {
  return {
    personKey: payload.personKey,
    alumId: payload.alumId,
    userId: payload.userId,
    displayName: payload.displayName,
  };
}
