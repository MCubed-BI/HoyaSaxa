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

  const canEdit = canEditAlumniRecord(viewer.platformRole, viewer.alumniId, alumniId) || isClaimedSelf;
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

export function actorCanEditAthlete(actor: Pick<AthleteActor, "isAdmin" | "isClaimedSelf">) {
  return actor.isAdmin || actor.isClaimedSelf;
}

export function actorCanMergeAthlete(actor: Pick<AthleteActor, "isAdmin" | "isClaimedSelf">) {
  return actor.isAdmin || actor.isClaimedSelf;
}
