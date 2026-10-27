import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filtersToSearchParams } from "@/lib/filters";
import { HOYA_AI_NAME } from "@/lib/hoya-ai-brand";
import {
  createHoyaAiTools,
  filtersFromTool,
  hoyaAiModel,
  hoyaAiSystemPrompt,
  roleAllowsHoyaAi,
} from "@/lib/hoya-ai";
import type { Viewer } from "@/lib/viewer";

const staffViewer: Viewer = {
  role: "owner",
  platformRole: "admin",
  label: "Hoyas",
  username: "Hoyas",
  email: null,
  accountId: null,
  alumniId: null,
  source: "staff",
  homePath: "/home",
  verifiedHoya: false,
};

const alumViewer: Viewer = {
  role: "alum",
  platformRole: "alum",
  label: "Pat Hoya",
  username: null,
  email: "pat@example.com",
  accountId: "acct",
  alumniId: "11111111-1111-4111-8111-111111111111",
  source: "alumni",
  homePath: "/home",
  verifiedHoya: true,
};

describe("Hoya AI", () => {
  it("is branded Hoya AI", () => {
    assert.equal(HOYA_AI_NAME, "Hoya AI");
  });

  it("allows signed-in roles and defaults the gateway model", () => {
    assert.equal(roleAllowsHoyaAi("owner"), true);
    assert.equal(roleAllowsHoyaAi("alum"), true);
    assert.match(hoyaAiModel(), /./);
  });

  it("mentions the viewer role and never-send blast rule in the system prompt", () => {
    const prompt = hoyaAiSystemPrompt(staffViewer);
    assert.match(prompt, /Hoya AI/);
    assert.match(prompt, /role: owner/);
    assert.match(prompt, /Never claim you sent a blast/i);
    assert.match(prompt, /Find My Alum/);
    assert.match(prompt, /Registered Hoyas/);
  });

  it("maps Registered Hoyas tool input onto the directory registered filter", () => {
    const filters = filtersFromTool({ registered: true });
    assert.equal(filters.registered, true);
    assert.equal(filters.unverified, false);
    assert.equal(filters.hasEmail, false);
    assert.deepEqual(filters.states, []);
    assert.equal(filtersToSearchParams(filters).get("registered"), "1");
  });

  it("maps unverified and contact flags from tool input", () => {
    const filters = filtersFromTool({
      unverified: true,
      hasEmail: true,
      hasLinkedin: true,
      state: "nj",
    });
    assert.equal(filters.unverified, true);
    assert.equal(filters.hasEmail, true);
    assert.equal(filters.hasLinkedin, true);
    assert.deepEqual(filters.states, ["NJ"]);
  });

  it("exposes search, events, help, and draft tools for staff and alum", () => {
    const staffTools = createHoyaAiTools(staffViewer);
    const alumTools = createHoyaAiTools(alumViewer);
    for (const tools of [staffTools, alumTools]) {
      assert.equal(typeof tools.searchPeople.execute, "function");
      assert.equal(typeof tools.listUpcomingEvents.execute, "function");
      assert.equal(typeof tools.explainFeature.execute, "function");
      assert.equal(typeof tools.openLink.execute, "function");
      assert.equal(typeof tools.countPeople.execute, "function");
      assert.equal(typeof tools.listPeople.execute, "function");
      assert.equal(typeof tools.draftBlast.execute, "function");
    }
  });

  it("keeps alum system prompt without claiming staff tools", () => {
    const prompt = hoyaAiSystemPrompt(alumViewer);
    assert.match(prompt, /staff tools: no/);
    assert.match(prompt, /blast tools: no/);
  });
});
