import { cookies } from "next/headers";
import { readAlumniSessionFromCookies } from "@/lib/alumni-auth";
import { readAlumSession } from "@/lib/alum-session";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";
import { ALUM_EMAIL_SEND_LIMIT } from "@/lib/email";
import { HOYA_ALUM_SESSION_COOKIE, readHoyaAlumSession } from "@/lib/hoya-alum-session";
import { viewerLabelFromAccountId } from "@/lib/messages-auth";
import { canUseAlumEmailBlast, canUseBlast, type Role } from "@/lib/roles";

export type BlastActor =
  | { kind: "staff"; label: string; role: "owner" | "coach" }
  | { kind: "alum"; label: string; role: "alum" | "board" };

export type BlastRequestInput = {
  channel?: string;
  includeFilters?: boolean;
  includeIds?: boolean;
  ids?: unknown;
};

export function normalizeBlastIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return [
    ...new Set(
      ids
        .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
        .map((id) => id.trim()),
    ),
  ];
}

export function alumEmailBlastRejection(input: BlastRequestInput, options?: { preview?: boolean }) {
  if (input.channel === "sms") {
    return "Alumni can send email only. Text blast and Twilio stay with staff.";
  }
  if (input.includeFilters) {
    return "Alumni can email selected directory picks only — not a filtered directory blast.";
  }
  const ids = normalizeBlastIds(input.ids);
  if (ids.length > ALUM_EMAIL_SEND_LIMIT) {
    return `Select at most ${ALUM_EMAIL_SEND_LIMIT} classmates.`;
  }
  if (!options?.preview && (!input.includeIds || ids.length === 0)) {
    return "Select classmates in the directory before sending.";
  }
  return null;
}

export function blastActorFromRole(role: Role, label: string): BlastActor | null {
  if (canUseBlast(role)) return { kind: "staff", label, role: role === "owner" ? "owner" : "coach" };
  if (canUseAlumEmailBlast(role)) return { kind: "alum", label, role };
  return null;
}

export async function getBlastActor(): Promise<BlastActor | null> {
  const jar = await cookies();
  if (isValidSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    return { kind: "staff", label: "Staff", role: "coach" };
  }

  const token = jar.get(HOYA_ALUM_SESSION_COOKIE)?.value;
  const contract = readAlumSession(token);
  if (contract) {
    return { kind: "alum", label: contract.name || contract.email || "Alumnus", role: contract.role };
  }

  const locker = readHoyaAlumSession(token);
  if (locker) {
    return { kind: "alum", label: locker.label, role: locker.role };
  }

  const claim = readAlumniSessionFromCookies((name) => jar.get(name)?.value);
  if (claim) {
    return { kind: "alum", label: viewerLabelFromAccountId(claim.accountId), role: "alum" };
  }

  return null;
}
