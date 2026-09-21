import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayName } from "./format";
import {
  classLabel,
  classifyLockerKind,
  composeAbout,
  matchesDirectoryPill,
  matchesLockerSearch,
  paginateItems,
  toNameFields,
} from "./locker-classify";
import { athleteHref, directoryHref, isLockerPublicPath, parseAthleteTab, parseDirectoryPill } from "./locker-paths";
import { ATHLETE_TABS, athleteTabLabel, YEARS_ACTIVE_LABEL } from "./locker-types";
import { ALUM_SESSION_COOKIE_ALIASES, HOYA_ALUM_SESSION_COOKIE, hasAlumSessionCookie } from "./locker-session";
import { emptyLockerPhotos, lockerStubPeople } from "./locker-stubs";

describe("classifyLockerKind", () => {
  const now = new Date("2026-09-18T00:00:00Z");

  it("keeps coaches and staff", () => {
    assert.equal(classifyLockerKind({ kind: "coach" }), "coach");
    assert.equal(classifyLockerKind({ kind: "staff" }), "staff");
  });

  it("treats the current roster year as athletes", () => {
    assert.equal(classifyLockerKind({ latestRosterYear: 2026, now }), "athlete");
  });

  it("treats last season plus an academic class as athletes", () => {
    assert.equal(
      classifyLockerKind({ latestRosterYear: 2025, latestRosterClass: "Sr.", now }),
      "athlete",
    );
  });

  it("treats graduated class years as alumni", () => {
    assert.equal(classifyLockerKind({ classYear: "2015", latestRosterYear: 2014, now }), "alumni");
  });

  it("uses a saved headline as Overview About", () => {
    assert.equal(
      composeAbout({
        firstName: "Patrick",
        lastName: "Finnegan",
        preferredName: null,
        fullName: null,
        kind: "alumni",
        position: "WR",
        sport: "Football",
        headline: "Growth Strategy @ Charlie Health | LBS MBA | Published Author",
        about: null,
      }),
      "Growth Strategy @ Charlie Health | LBS MBA | Published Author",
    );
  });
});

describe("directory pills and search", () => {
  it("parses pills and ignores unknown values", () => {
    assert.equal(parseDirectoryPill("Athletes"), "athletes");
    assert.equal(parseDirectoryPill("nope"), "all");
  });

  it("filters stub cards by pill and name", () => {
    const people = lockerStubPeople();
    assert.ok(people.some((person) => person.kind === "coach"));
    assert.ok(people.every((person) => matchesDirectoryPill(person.kind, "all")));
    const coaches = people.filter((person) => matchesDirectoryPill(person.kind, "coaches"));
    assert.ok(coaches.every((person) => person.kind === "coach"));
    const sgarlata = people.find((person) => person.lastName === "Sgarlata");
    assert.equal(displayName(toNameFields(sgarlata!)), "Rob Sgarlata");
    assert.ok(people.some((person) => matchesLockerSearch(person, "sgarlata")));
    assert.equal(
      people.filter((person) => matchesLockerSearch(person, "zzzz-missing")).length,
      0,
    );
  });

  it("builds shareable directory and athlete hrefs", () => {
    assert.equal(directoryHref({}), "/directory");
    assert.equal(directoryHref({ q: "Kasten", role: "alumni", page: 2 }), "/directory?q=Kasten&role=alumni&page=2");
    assert.equal(athleteHref("abc"), "/athletes/abc");
    assert.equal(athleteHref("abc", "Q&A"), "/athletes/abc?tab=qa");
    assert.equal(parseAthleteTab("photos"), "photos");
    assert.equal(parseAthleteTab("stats"), "stats");
    assert.equal(athleteTabLabel("stats"), YEARS_ACTIVE_LABEL);
    assert.equal(ATHLETE_TABS.find((tab) => tab.id === "stats")?.label, YEARS_ACTIVE_LABEL);
    assert.equal(
      ATHLETE_TABS.every((tab) => !/\bStats\b/i.test(tab.label)),
      true,
    );
  });

  it("keeps Years Active on every athlete/alum profile surface", () => {
    const files = [
      "src/lib/locker-types.ts",
      "src/app/(hoya)/athletes/[id]/page.tsx",
      "src/app/(coach)/alumni/[id]/page.tsx",
      "src/components/hoya-directory.tsx",
      "src/components/alum-directory.tsx",
      "src/components/alumni-directory.tsx",
    ];
    for (const rel of files) {
      const text = readFileSync(join(process.cwd(), rel), "utf8");
      assert.doesNotMatch(text, /<(CardTitle|title)>\s*Stats\s*</);
      assert.doesNotMatch(text, /label:\s*"Stats"/);
      assert.doesNotMatch(text, />Stats</);
    }
    const athletePage = readFileSync(join(process.cwd(), "src/app/(hoya)/athletes/[id]/page.tsx"), "utf8");
    assert.match(athletePage, /athleteTabLabel\("stats"\)/);
    assert.match(athletePage, /item\.label/);
    assert.match(athletePage, /AthleteOverviewEditor/);
    const mePanel = readFileSync(join(process.cwd(), "src/components/alumni-me-panel.tsx"), "utf8");
    assert.match(mePanel, /AthleteOverviewFields/);
    assert.match(mePanel, /overviewPatchFromForm/);
  });

  it("exposes football roster and current photo slots", () => {
    const slots = emptyLockerPhotos();
    assert.deepEqual(
      slots.map((slot) => slot.id),
      ["roster", "headshot"],
    );
    assert.equal(slots[0]?.caption, "Football roster photo");
    assert.equal(slots[1]?.caption, "Current LinkedIn / headshot");
  });
});

describe("class labels and pagination", () => {
  it("formats class of year and academic labels", () => {
    assert.equal(classLabel({ classYear: "2015" }), "Class of 2015");
    assert.equal(classLabel({ latestRosterClass: "Jr." }), "Jr.");
    assert.equal(classLabel({ classYear: null, latestRosterYear: 2014 }), null);
  });

  it("pages merged lists", () => {
    const result = paginateItems(["a", "b", "c", "d"], 2, 2);
    assert.deepEqual(result.rows, ["c", "d"]);
    assert.equal(result.total, 4);
  });
});

describe("locker session cookie", () => {
  it("respects hoya_alum_session and the claim alias, not staff cookies", () => {
    assert.equal(HOYA_ALUM_SESSION_COOKIE, "hoya_alum_session");
    assert.ok(ALUM_SESSION_COOKIE_ALIASES.includes("ga_alumni_session"));
    assert.equal(
      hasAlumSessionCookie((name) => (name === "hoya_alum_session" ? "present" : null)),
      true,
    );
    assert.equal(
      hasAlumSessionCookie((name) => (name === "ga_alumni_session" ? "present" : null)),
      true,
    );
    assert.equal(
      hasAlumSessionCookie((name) => (name === "ga_session" ? "staff" : null)),
      false,
    );
  });
});

describe("locker public paths", () => {
  it("keeps directory and athlete profiles behind a session", () => {
    assert.equal(isLockerPublicPath("/directory"), false);
    assert.equal(isLockerPublicPath("/athletes/abc"), false);
    assert.equal(isLockerPublicPath("/locker"), true);
    assert.equal(isLockerPublicPath("/"), false);
    assert.equal(isLockerPublicPath("/api/export"), false);
  });
});
