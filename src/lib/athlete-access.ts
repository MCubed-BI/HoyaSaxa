import { getAccountByEmail } from "@/lib/alumni-claim";
import { getSql } from "@/lib/db";
import { canEditAlumniRecord, type PlatformRole } from "@/lib/platform-roles";
import { getCurrentViewer } from "@/lib/viewer";

export type AthleteActor = {
  isAdmin: boolean;
  isClaimedSelf: boolean;
  canEdit: boolean;
  canMerge: boolean;
  accountId: string | null;
  sessionAlumniId: string | null;
  label: string | null;
  platformRole: PlatformRole | null;
};

async function claimedAlumniIds(accountId: string) {
  const sql = getSql();
  const rows = (await sql.query(`SELECT alumni_id FROM alumni_claims WHERE account_id = $1`, [accountId])) as Array<{
    alumni_id: string;
  }>;
  return rows.map((row) => row.alumni_id);
}

export async function getAthleteActor(alumniId: string): Promise<AthleteActor> {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return {
      isAdmin: false,
      isClaimedSelf: false,
      canEdit: false,
      canMerge: false,
      accountId: null,
      sessionAlumniId: null,
      label: null,
      platformRole: null,
    };
  }

  const isAdmin = viewer.platformRole === "admin";
  let accountId = viewer.accountId;
  let isClaimedSelf = Boolean(viewer.alumniId && viewer.alumniId === alumniId);
  if (!isClaimedSelf && !accountId && viewer.email) {
    try {
      accountId = (await getAccountByEmail(viewer.email))?.id ?? null;
    } catch {
      accountId = null;
    }
  }
  if (!isClaimedSelf && accountId) {
    try {
      const ids = await claimedAlumniIds(accountId);
      isClaimedSelf = ids.includes(alumniId);
    } catch {
      isClaimedSelf = false;
    }
  }

  const canEdit = canEditAthletePhotos({
    role: viewer.platformRole,
    actorAlumniId: viewer.alumniId,
    targetAlumniId: alumniId,
    claimedSelf: isClaimedSelf,
  });
  return {
    isAdmin,
    isClaimedSelf,
    canEdit,
    canMerge: isAdmin || isClaimedSelf,
    accountId,
    sessionAlumniId: viewer.alumniId,
    label: viewer.label,
    platformRole: viewer.platformRole,
  };
}

/** Shared photo/profile gate: canEditAlumniRecord (claimed self or admin). No ga_session required. */
export function canEditAthletePhotos(input: {
  role: PlatformRole | null;
  actorAlumniId?: string | null;
  targetAlumniId: string;
  claimedSelf?: boolean;
}) {
  if (input.claimedSelf) return true;
  if (!input.role) return false;
  return canEditAlumniRecord(input.role, input.actorAlumniId, input.targetAlumniId);
}

export function actorCanEditAthlete(actor: Pick<AthleteActor, "isAdmin" | "isClaimedSelf">) {
  return actor.isAdmin || actor.isClaimedSelf;
}

export function actorCanMergeAthlete(actor: Pick<AthleteActor, "isAdmin" | "isClaimedSelf">) {
  return actor.isAdmin || actor.isClaimedSelf;
}
