import { generateText, Output } from "ai";
import { z } from "zod";
import { mergeAlumniPair } from "@/lib/alumni-claim";
import { isLikelyDuplicate } from "@/lib/alumni-duplicates";
import { ensureDataCleanupTables } from "@/lib/data-cleanup-schema";
import { getSql } from "@/lib/db";
import { displayName } from "@/lib/format";

export type CleanupSuggestionStatus = "pending" | "approved" | "rejected";

export type CleanupPersonSummary = {
  id: string;
  name: string;
  classYear: string | null;
  hometown: string | null;
  current: string | null;
  company: string | null;
  email: string | null;
  linkedin: boolean;
  claimed: boolean;
};

export type CleanupSuggestion = {
  id: string;
  status: CleanupSuggestionStatus;
  origin: "heuristic" | "ai";
  confidence: number | null;
  reason: string | null;
  aiReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  keeper: CleanupPersonSummary;
  source: CleanupPersonSummary;
};

type AlumniScanRow = {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  class_year: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  current_city: string | null;
  current_state: string | null;
  company_name: string | null;
  email_primary: string | null;
  phone_primary: string | null;
  linkedin_url: string | null;
  claimed: boolean;
  field_score: number;
};

async function query<T>(text: string, params: unknown[] = []) {
  const sql = getSql();
  return (await sql.query(text, params)) as unknown as T;
}

function place(city: string | null, state: string | null) {
  return [city?.trim(), state?.trim()].filter(Boolean).join(", ") || null;
}

function toSummary(row: {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  class_year: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  current_city: string | null;
  current_state: string | null;
  company_name: string | null;
  email_primary: string | null;
  linkedin_url: string | null;
  claimed: boolean;
}): CleanupPersonSummary {
  return {
    id: row.id,
    name: displayName(row),
    classYear: row.class_year,
    hometown: place(row.hometown_city, row.hometown_state),
    current: place(row.current_city, row.current_state),
    company: row.company_name,
    email: row.email_primary,
    linkedin: Boolean(row.linkedin_url?.trim()),
    claimed: Boolean(row.claimed),
  };
}

function richnessScore(row: AlumniScanRow) {
  let score = row.field_score + (row.claimed ? 20 : 0);
  if (row.email_primary?.trim()) score += 6;
  if (row.phone_primary?.trim()) score += 4;
  if (row.linkedin_url?.trim()) score += 4;
  if (row.current_city?.trim()) score += 2;
  if (row.class_year?.trim()) score += 2;
  return score;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function chooseKeeper(left: AlumniScanRow, right: AlumniScanRow) {
  const leftScore = richnessScore(left);
  const rightScore = richnessScore(right);
  if (leftScore === rightScore) return left.id < right.id ? left : right;
  return leftScore > rightScore ? left : right;
}

function heuristicReason(keeper: AlumniScanRow, source: AlumniScanRow) {
  const bits = ["Same last name and matching given name / nickname"];
  if (keeper.claimed && !source.claimed) bits.push("keeper already has a claimed login");
  if (keeper.email_primary && !source.email_primary) bits.push("keeper has an email on file");
  if (keeper.class_year && source.class_year && keeper.class_year === source.class_year) {
    bits.push(`shared class year ${keeper.class_year}`);
  }
  return bits.join("; ") + ".";
}

export async function listCleanupSuggestions(status: CleanupSuggestionStatus | "all" = "pending") {
  await ensureDataCleanupTables();
  const rows = await query<
    Array<{
      id: string;
      status: CleanupSuggestionStatus;
      origin: "heuristic" | "ai";
      confidence: number | null;
      reason: string | null;
      ai_reason: string | null;
      created_at: string;
      decided_at: string | null;
      decided_by: string | null;
      keeper_id: string;
      source_id: string;
      k_first_name: string | null;
      k_last_name: string;
      k_preferred_name: string | null;
      k_full_name: string | null;
      k_class_year: string | null;
      k_hometown_city: string | null;
      k_hometown_state: string | null;
      k_current_city: string | null;
      k_current_state: string | null;
      k_company_name: string | null;
      k_email_primary: string | null;
      k_linkedin_url: string | null;
      k_claimed: boolean;
      s_first_name: string | null;
      s_last_name: string;
      s_preferred_name: string | null;
      s_full_name: string | null;
      s_class_year: string | null;
      s_hometown_city: string | null;
      s_hometown_state: string | null;
      s_current_city: string | null;
      s_current_state: string | null;
      s_company_name: string | null;
      s_email_primary: string | null;
      s_linkedin_url: string | null;
      s_claimed: boolean;
    }>
  >(
    `
    SELECT
      s.id, s.status, s.origin, s.confidence, s.reason, s.ai_reason,
      s.created_at, s.decided_at, s.decided_by, s.keeper_id, s.source_id,
      k.first_name AS k_first_name, k.last_name AS k_last_name, k.preferred_name AS k_preferred_name,
      k.full_name AS k_full_name, k.class_year AS k_class_year,
      k.hometown_city AS k_hometown_city, k.hometown_state AS k_hometown_state,
      k.current_city AS k_current_city, k.current_state AS k_current_state,
      k.company_name AS k_company_name, k.email_primary AS k_email_primary, k.linkedin_url AS k_linkedin_url,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = k.id) AS k_claimed,
      src.first_name AS s_first_name, src.last_name AS s_last_name, src.preferred_name AS s_preferred_name,
      src.full_name AS s_full_name, src.class_year AS s_class_year,
      src.hometown_city AS s_hometown_city, src.hometown_state AS s_hometown_state,
      src.current_city AS s_current_city, src.current_state AS s_current_state,
      src.company_name AS s_company_name, src.email_primary AS s_email_primary, src.linkedin_url AS s_linkedin_url,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = src.id) AS s_claimed
    FROM alumni_cleanup_suggestions s
    LEFT JOIN alumni k ON k.id = s.keeper_id
    LEFT JOIN alumni src ON src.id = s.source_id
    WHERE ($1::text = 'all' OR s.status = $1)
      AND ($1::text <> 'pending' OR (k.id IS NOT NULL AND src.id IS NOT NULL))
    ORDER BY
      CASE s.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      COALESCE(s.confidence, 0) DESC,
      s.created_at DESC
    LIMIT 200
    `,
    [status],
  );

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    origin: row.origin,
    confidence: row.confidence,
    reason: row.reason,
    aiReason: row.ai_reason,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
    keeper: toSummary({
      id: row.keeper_id,
      first_name: row.k_first_name,
      last_name: row.k_last_name || "Alumni",
      preferred_name: row.k_preferred_name,
      full_name: row.k_full_name,
      class_year: row.k_class_year,
      hometown_city: row.k_hometown_city,
      hometown_state: row.k_hometown_state,
      current_city: row.k_current_city,
      current_state: row.k_current_state,
      company_name: row.k_company_name,
      email_primary: row.k_email_primary,
      linkedin_url: row.k_linkedin_url,
      claimed: Boolean(row.k_claimed),
    }),
    source: toSummary({
      id: row.source_id,
      first_name: row.s_first_name,
      last_name: row.s_last_name || "Merged record",
      preferred_name: row.s_preferred_name,
      full_name: row.s_full_name,
      class_year: row.s_class_year,
      hometown_city: row.s_hometown_city,
      hometown_state: row.s_hometown_state,
      current_city: row.s_current_city,
      current_state: row.s_current_state,
      company_name: row.s_company_name,
      email_primary: row.s_email_primary,
      linkedin_url: row.s_linkedin_url,
      claimed: Boolean(row.s_claimed),
    }),
  })) satisfies CleanupSuggestion[];
}

async function loadScanRowsForLastName(lastName: string) {
  return query<AlumniScanRow[]>(
    `
    SELECT
      a.id, a.first_name, a.last_name, a.preferred_name, a.full_name, a.class_year,
      a.hometown_city, a.hometown_state, a.current_city, a.current_state,
      a.company_name, a.email_primary, a.phone_primary, a.linkedin_url,
      EXISTS (SELECT 1 FROM alumni_claims c WHERE c.alumni_id = a.id) AS claimed,
      (
        (CASE WHEN NULLIF(btrim(a.first_name), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.preferred_name), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.full_name), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.class_year), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.hometown_city), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.current_city), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.company_name), '') IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NULLIF(btrim(a.job_title), '') IS NOT NULL THEN 1 ELSE 0 END)
      )::int AS field_score
    FROM alumni a
    WHERE lower(btrim(a.last_name)) = lower(btrim($1))
    ORDER BY a.created_at ASC NULLS LAST, a.id
    LIMIT 40
    `,
    [lastName],
  );
}

async function upsertPendingSuggestion(input: {
  keeperId: string;
  sourceId: string;
  reason: string;
  confidence: number;
  origin: "heuristic" | "ai";
  aiReason?: string | null;
}) {
  const existing = await query<Array<{ id: string }>>(
    `
    SELECT id FROM alumni_cleanup_suggestions
    WHERE status = 'pending'
      AND (
        (keeper_id = $1 AND source_id = $2)
        OR (keeper_id = $2 AND source_id = $1)
      )
    LIMIT 1
    `,
    [input.keeperId, input.sourceId],
  );
  if (existing[0]) {
    await query(
      `
      UPDATE alumni_cleanup_suggestions
      SET keeper_id = $2,
          source_id = $3,
          origin = $4,
          confidence = $5,
          reason = $6,
          ai_reason = COALESCE($7, ai_reason),
          updated_at = now()
      WHERE id = $1
      `,
      [
        existing[0].id,
        input.keeperId,
        input.sourceId,
        input.origin,
        input.confidence,
        input.reason,
        input.aiReason ?? null,
      ],
    );
    return;
  }
  await query(
    `
    INSERT INTO alumni_cleanup_suggestions (
      keeper_id, source_id, status, origin, confidence, reason, ai_reason, updated_at
    )
    VALUES ($1, $2, 'pending', $3, $4, $5, $6, now())
    `,
    [
      input.keeperId,
      input.sourceId,
      input.origin,
      input.confidence,
      input.reason,
      input.aiReason ?? null,
    ],
  );
}

const aiBatchSchema = z.object({
  decisions: z.array(
    z.object({
      keeperId: z.string(),
      sourceId: z.string(),
      samePerson: z.boolean(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
});

async function enrichWithAi(pairs: Array<{ keeper: AlumniScanRow; source: AlumniScanRow; reason: string }>) {
  if (pairs.length === 0) return { enriched: 0, skipped: true as const, error: null as string | null };
  const model = (process.env.AI_CLEANUP_MODEL || process.env.AI_MODEL || "openai/gpt-5-mini").trim();
  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: aiBatchSchema }),
      system:
        "You help Georgetown Football alumni CRM admins find true duplicate roster rows. Prefer keeping the richer claimed profile. Reject weak name collisions.",
      prompt: `Review these candidate duplicate pairs. For each, say if they are the same person, which id should be keeper, confidence 0-1, and a short reason.\n\n${JSON.stringify(
        pairs.map(({ keeper, source, reason }) => ({
          heuristicReason: reason,
          a: {
            id: keeper.id,
            name: displayName(keeper),
            classYear: keeper.class_year,
            hometown: place(keeper.hometown_city, keeper.hometown_state),
            current: place(keeper.current_city, keeper.current_state),
            company: keeper.company_name,
            email: keeper.email_primary,
            phone: Boolean(keeper.phone_primary),
            linkedin: Boolean(keeper.linkedin_url),
            claimed: keeper.claimed,
          },
          b: {
            id: source.id,
            name: displayName(source),
            classYear: source.class_year,
            hometown: place(source.hometown_city, source.hometown_state),
            current: place(source.current_city, source.current_state),
            company: source.company_name,
            email: source.email_primary,
            phone: Boolean(source.phone_primary),
            linkedin: Boolean(source.linkedin_url),
            claimed: source.claimed,
          },
        })),
        null,
        2,
      )}`,
    });

    let enriched = 0;
    for (const decision of output?.decisions ?? []) {
      if (!decision.samePerson) continue;
      const ids = new Set([decision.keeperId, decision.sourceId]);
      const match = pairs.find(
        (pair) => ids.has(pair.keeper.id) && ids.has(pair.source.id) && decision.keeperId !== decision.sourceId,
      );
      if (!match) continue;
      const keeper =
        decision.keeperId === match.keeper.id
          ? match.keeper
          : decision.keeperId === match.source.id
            ? match.source
            : null;
      const source =
        decision.sourceId === match.source.id
          ? match.source
          : decision.sourceId === match.keeper.id
            ? match.keeper
            : null;
      if (!keeper || !source) continue;
      await upsertPendingSuggestion({
        keeperId: keeper.id,
        sourceId: source.id,
        reason: match.reason,
        confidence: decision.confidence,
        origin: "ai",
        aiReason: decision.reason,
      });
      enriched += 1;
    }
    return { enriched, skipped: false as const, error: null as string | null };
  } catch (error) {
    return {
      enriched: 0,
      skipped: true as const,
      error: error instanceof Error ? error.message : "AI enrichment unavailable",
    };
  }
}

export async function scanCleanupSuggestions(options?: { useAi?: boolean; maxGroups?: number }) {
  await ensureDataCleanupTables();
  const maxGroups = options?.maxGroups ?? 80;
  const useAi = options?.useAi !== false;

  const lastNames = await query<Array<{ last_name: string; n: number }>>(
    `
    SELECT lower(btrim(last_name)) AS last_name, count(*)::int AS n
    FROM alumni
    WHERE NULLIF(btrim(last_name), '') IS NOT NULL
    GROUP BY 1
    HAVING count(*) > 1
    ORDER BY n DESC, last_name
    LIMIT $1
    `,
    [maxGroups],
  );

  const seen = new Set<string>();
  const heuristicPairs: Array<{ keeper: AlumniScanRow; source: AlumniScanRow; reason: string }> = [];
  let created = 0;

  for (const group of lastNames) {
    const rows = await loadScanRowsForLastName(group.last_name);
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const left = rows[i]!;
        const right = rows[j]!;
        if (!isLikelyDuplicate(left, right)) continue;
        const key = pairKey(left.id, right.id);
        if (seen.has(key)) continue;
        seen.add(key);
        const keeper = chooseKeeper(left, right);
        const source = keeper.id === left.id ? right : left;
        const reason = heuristicReason(keeper, source);
        heuristicPairs.push({ keeper, source, reason });
        await upsertPendingSuggestion({
          keeperId: keeper.id,
          sourceId: source.id,
          reason,
          confidence: 0.72,
          origin: "heuristic",
        });
        created += 1;
      }
    }
  }

  let ai = { enriched: 0, skipped: true as boolean, error: null as string | null };
  if (useAi && heuristicPairs.length > 0) {
    ai = await enrichWithAi(heuristicPairs.slice(0, 24));
  }

  const pending = await query<Array<{ n: number }>>(
    `SELECT count(*)::int AS n FROM alumni_cleanup_suggestions WHERE status = 'pending'`,
  );

  return {
    groupsScanned: lastNames.length,
    pairsFound: created,
    pendingCount: pending[0]?.n ?? 0,
    aiEnriched: ai.enriched,
    aiSkipped: ai.skipped,
    aiError: ai.error,
  };
}

export async function decideCleanupSuggestion(input: {
  id: string;
  action: "approve" | "reject";
  decidedBy: string;
  accountId?: string | null;
}) {
  await ensureDataCleanupTables();
  const rows = await query<Array<{ id: string; keeper_id: string; source_id: string; status: string }>>(
    `SELECT id, keeper_id, source_id, status FROM alumni_cleanup_suggestions WHERE id = $1 LIMIT 1`,
    [input.id],
  );
  const row = rows[0];
  if (!row) throw new Error("Suggestion not found.");
  if (row.status !== "pending") throw new Error("That suggestion was already decided.");

  if (input.action === "approve") {
    await mergeAlumniPair({
      keeperId: row.keeper_id,
      sourceId: row.source_id,
      accountId: input.accountId ?? null,
      asAdmin: true,
    });
  }

  await query(
    `
    UPDATE alumni_cleanup_suggestions
    SET status = $2, decided_by = $3, decided_at = now(), updated_at = now()
    WHERE id = $1
    `,
    [input.id, input.action === "approve" ? "approved" : "rejected", input.decidedBy],
  );

  return { ok: true as const, action: input.action, keeperId: row.keeper_id, sourceId: row.source_id };
}
