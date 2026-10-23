import { tool } from "ai";
import { z } from "zod";
import { displayName } from "@/lib/format";
import { emptyFilters, type AlumniFilters } from "@/lib/filters";
import { HOYA_AI_NAME } from "@/lib/hoya-ai-brand";
import { canUseBlast, canUseOwnerTools, type Role } from "@/lib/roles";
import {
  getAlumniById,
  getAlumniCount,
  searchAlumni,
  searchAlumniByName,
} from "@/lib/queries";
import { listEvents } from "@/lib/event-queries";
import type { EventActor } from "@/lib/event-auth";
import { directoryHrefForRole, navItemsForRole } from "@/lib/nav";
import { PRODUCT_DISPLAY_NAME } from "@/lib/product";
import type { Viewer } from "@/lib/viewer";

export { HOYA_AI_NAME };

export function hoyaAiModel() {
  return (process.env.AI_HOYA_MODEL || process.env.AI_MODEL || "openai/gpt-5-mini").trim();
}

function personSummary(
  row: Awaited<ReturnType<typeof searchAlumniByName>>[number],
  opts: { includeContact: boolean },
) {
  const place = [row.current_city, row.current_state].filter(Boolean).join(", ") || null;
  const hometown = [row.hometown_city, row.hometown_state].filter(Boolean).join(", ") || null;
  return {
    id: row.id,
    name: displayName(row),
    classYear: row.class_year,
    position: row.position,
    current: place,
    hometown,
    company: row.company_name,
    jobTitle: row.job_title,
    personKind: row.person_kind ?? "alum",
    profilePath: `/alumni/${row.id}`,
    athletePath: `/athletes/${row.id}`,
    ...(opts.includeContact
      ? {
          email: row.email_primary,
          phone: row.phone_primary,
          linkedin: row.linkedin_url,
        }
      : {
          hasEmail: Boolean(row.email_primary),
          hasPhone: Boolean(row.phone_primary),
          hasLinkedin: Boolean(row.linkedin_url),
        }),
  };
}

function filtersFromTool(input: {
  q?: string;
  state?: string;
  city?: string;
  classYear?: string;
  position?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
}): AlumniFilters {
  const base = emptyFilters();
  return {
    ...base,
    q: input.q?.trim() ?? "",
    states: input.state ? [input.state.trim().toUpperCase()] : [],
    cities: input.city ? [input.city.trim()] : [],
    classYears: input.classYear ? [input.classYear.trim()] : [],
    positions: input.position ? [input.position.trim()] : [],
    hasEmail: Boolean(input.hasEmail),
    hasPhone: Boolean(input.hasPhone),
  };
}

function eventActorFromViewer(viewer: Viewer): EventActor {
  const role: EventActor["role"] =
    viewer.role === "owner" || viewer.role === "coach"
      ? "coach"
      : viewer.role === "board"
        ? "board"
        : "alum";
  return {
    username: viewer.username || viewer.label || viewer.email || "viewer",
    role,
    platformRole: viewer.platformRole,
    alumId: viewer.alumniId,
    userId: viewer.accountId || viewer.alumniId || viewer.username || viewer.label,
  };
}

export function hoyaAiSystemPrompt(viewer: Viewer) {
  const nav = navItemsForRole(viewer.role)
    .map((item) => `- ${item.label}: ${item.href}`)
    .join("\n");
  const staff = canUseOwnerTools(viewer.role);
  return `You are ${HOYA_AI_NAME}, the in-app assistant for ${PRODUCT_DISPLAY_NAME} (HoyaSaxa).

You help signed-in Hoyas and staff with:
- How to use the site (Directory, Find My Alum map, Events, Giving, Messages, Blast, Groups, People, Data Cleanup)
- Finding people and answering roster questions via tools
- Drafting text/email blast copy (never send without the user confirming in the Blast UI)
- Pointing users to the right page with openLink

Viewer:
- label: ${viewer.label}
- role: ${viewer.role}
- platformRole: ${viewer.platformRole}
- staff tools: ${staff ? "yes" : "no"}
- blast tools: ${canUseBlast(viewer.role) ? "yes" : "no"}
- directory home: ${directoryHrefForRole(viewer.role)}

Primary destinations:
${nav}

Rules:
- Be concise, warm, and Georgetown Football-aware (Hoyas). Prefer navy/gold product language without overdoing it.
- Use tools for live data; do not invent people, counts, or events.
- For alums, do not reveal another person's email/phone/LinkedIn unless a tool returns them (tools redact contact for non-staff).
- Never claim you sent a blast, email, or SMS. Draft only; tell them to open Blast to send.
- When suggesting navigation, call openLink so the UI can show a button.
- If a request needs Admin/People/Data Cleanup and the viewer is not staff, explain and point them to an Admin.
- Prefer short answers with concrete next steps.`;
}

export function createHoyaAiTools(viewer: Viewer) {
  const includeContact = canUseOwnerTools(viewer.role);
  const actor = eventActorFromViewer(viewer);

  const base = {
    searchPeople: tool({
      description: "Search alumni/supporters by name. Use for “find X” or fuzzy name lookup.",
      inputSchema: z.object({
        query: z.string().min(1).max(80).describe("Name fragment to search"),
        limit: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ query, limit }) => {
        const rows = await searchAlumniByName(query, limit ?? 8);
        return {
          count: rows.length,
          people: rows.map((row) => personSummary(row, { includeContact })),
        };
      },
    }),

    lookupPerson: tool({
      description: "Load one person by alumni UUID for profile details.",
      inputSchema: z.object({
        alumniId: z.string().uuid(),
      }),
      execute: async ({ alumniId }) => {
        const detail = await getAlumniById(alumniId);
        if (!detail) return { found: false as const };
        return {
          found: true as const,
          person: {
            ...personSummary(detail, { includeContact }),
            seasons: detail.seasons,
            industry: detail.industry,
            headline: detail.headline,
            adminVerified: detail.admin_verified ?? null,
          },
        };
      },
    }),

    countPeople: tool({
      description: "Count people matching optional filters (state, city, class year, position, contact flags).",
      inputSchema: z.object({
        q: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        classYear: z.string().optional(),
        position: z.string().optional(),
        hasEmail: z.boolean().optional(),
        hasPhone: z.boolean().optional(),
      }),
      execute: async (input) => {
        const filters = filtersFromTool(input);
        const total = await getAlumniCount(filters);
        return { total, filters };
      },
    }),

    listPeople: tool({
      description: "List a page of people for filters (name/state/city/class). Max one page.",
      inputSchema: z.object({
        q: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        classYear: z.string().optional(),
        position: z.string().optional(),
        page: z.number().int().min(1).max(5).optional(),
      }),
      execute: async (input) => {
        const filters = filtersFromTool(input);
        const result = await searchAlumni(filters, input.page ?? 1);
        return {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          people: result.rows.slice(0, 15).map((row) => personSummary(row, { includeContact })),
        };
      },
    }),

    listUpcomingEvents: tool({
      description: "List upcoming events the viewer can see.",
      inputSchema: z.object({
        q: z.string().optional().describe("Optional title/location search"),
        limit: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ q, limit }) => {
        const result = await listEvents("upcoming", actor, { q: q ?? "", categories: [] });
        const events = result.rows.slice(0, limit ?? 8).map((event) => ({
          id: event.id,
          title: event.title,
          category: event.category,
          startsAt: event.starts_at,
          location: event.location,
          href: `/events/${event.id}`,
          rsvped: event.rsvped,
        }));
        return { upcomingCount: result.upcomingCount, events };
      },
    }),

    explainFeature: tool({
      description: "Explain a site feature and where to open it.",
      inputSchema: z.object({
        feature: z
          .enum([
            "directory",
            "find-my-alum",
            "events",
            "giving",
            "messages",
            "blast",
            "groups",
            "people",
            "data-cleanup",
            "feed",
            "me",
            "admin",
          ])
          .describe("Feature key"),
      }),
      execute: async ({ feature }) => {
        const catalog: Record<
          string,
          { title: string; href: string; blurb: string; staffOnly?: boolean }
        > = {
          directory: {
            title: "Directory",
            href: directoryHrefForRole(viewer.role),
            blurb: "Search and filter alumni and supporters. Open a row for the full profile.",
          },
          "find-my-alum": {
            title: "Find My Alum",
            href: "/find-my-alum",
            blurb: "Map and heat view of where Hoyas live / are from. City+state placement is cached for accuracy.",
          },
          events: {
            title: "Events",
            href: "/events",
            blurb: "Upcoming and past events, RSVP, and check-in.",
          },
          giving: {
            title: "Giving",
            href: "/giving",
            blurb: "Fundraising and giving destinations for the program.",
          },
          messages: {
            title: "Messages",
            href: "/messages",
            blurb: "Channels and DMs for the network.",
          },
          blast: {
            title: "Blast",
            href: canUseBlast(viewer.role) ? "/blast" : "/portal/blast",
            blurb: "Compose SMS/email to selected people or groups. Hoya AI can draft copy; you send from Blast.",
          },
          groups: {
            title: "Groups",
            href: "/groups",
            blurb: "Manage alumni groups used for filters and blasts.",
            staffOnly: true,
          },
          people: {
            title: "People",
            href: "/people",
            blurb: "Admin people tools: add/verify Player (Alum) vs Supporter.",
            staffOnly: true,
          },
          "data-cleanup": {
            title: "Data Cleanup",
            href: "/data-cleanup",
            blurb: "Find and merge likely duplicate roster rows.",
            staffOnly: true,
          },
          feed: {
            title: "For You",
            href: "/feed",
            blurb: "Home feed for the network.",
          },
          me: {
            title: "My record",
            href: "/me",
            blurb: "Update your own alumni record and claim details.",
          },
          admin: {
            title: "Admin",
            href: "/admin",
            blurb: "Staff admin home for operational tools.",
            staffOnly: true,
          },
        };
        const item = catalog[feature]!;
        if (item.staffOnly && !canUseOwnerTools(viewer.role)) {
          return {
            ...item,
            label: item.title,
            allowed: false,
            note: "This is an Admin tool. Ask a staff Admin if you need access.",
          };
        }
        return { ...item, label: `Open ${item.title}`, allowed: true };
      },
    }),

    openLink: tool({
      description: "Return a deep link the UI should show as a button for the user.",
      inputSchema: z.object({
        href: z
          .string()
          .min(1)
          .max(200)
          .describe("In-app path starting with /"),
        label: z.string().min(1).max(60).describe("Button label"),
      }),
      execute: async ({ href, label }) => {
        const path = href.startsWith("/") ? href : `/${href}`;
        return { href: path, label };
      },
    }),

    draftBlast: tool({
      description:
        "Draft SMS/email blast copy. Does NOT send. Return subject/body the user can paste into Blast.",
      inputSchema: z.object({
        channel: z.enum(["sms", "email"]),
        audience: z.string().max(120).describe("Who this is for, e.g. NJ Hoyas or selected directory"),
        goal: z.string().max(240).describe("What the message should accomplish"),
        tone: z.enum(["warm", "urgent", "formal", "casual"]).optional(),
      }),
      execute: async ({ channel, audience, goal, tone }) => {
        const voice = tone ?? "warm";
        if (channel === "sms") {
          const body = `Hoyas — ${goal.replace(/\.$/, "")}. Reply if you're in. — Georgetown Football (${audience})`;
          return {
            channel,
            audience,
            tone: voice,
            smsBody: body.slice(0, 320),
            nextStep: "Open Blast, paste the SMS, review recipients, then send yourself.",
            blastHref: canUseBlast(viewer.role) ? "/blast" : "/portal/blast",
          };
        }
        return {
          channel,
          audience,
          tone: voice,
          subject: `Hoyas: ${goal.slice(0, 60)}`,
          emailBody: `Team,\n\n${goal}\n\nWe're reaching out to ${audience}. Details and next steps are below — reply if you can help.\n\nHoya Saxa,\nGeorgetown Football`,
          nextStep: "Open Blast / Email classmates, paste the draft, then send yourself.",
          blastHref: canUseBlast(viewer.role) ? "/blast" : "/portal/blast",
        };
      },
    }),
  };

  return base;
}

export type HoyaAiTools = ReturnType<typeof createHoyaAiTools>;

export function roleAllowsHoyaAi(role: Role) {
  return Boolean(role);
}
