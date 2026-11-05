import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOverviewSport,
  overviewFormValues,
  overviewInputToAlumniPatch,
  overviewPatchFromForm,
  parseOverviewEmails,
  parseOverviewSport,
} from "./alumni-overview";
import { parseLocationInput } from "./format";

describe("Update Me Overview mapping", () => {
  it("maps About / Sport / Location / Emails / LinkedIn onto alumni columns", () => {
    const { columns, emails } = overviewInputToAlumniPatch({
      about: "Growth Strategy @ Charlie Health | LBS MBA | Published Author",
      sport: "Football · WR",
      location: "New York, NY",
      emails:
        "patrickwfinnegan@gmail.com, patrick.finnegan@charliehealth.com, pwf8@georgetown.edu",
      linkedin_url: "linkedin.com/in/patrick-finnegan-mba",
    });
    assert.equal(columns.headline, "Growth Strategy @ Charlie Health | LBS MBA | Published Author");
    assert.equal(columns.position, "WR");
    assert.equal(columns.current_city, "New York");
    assert.equal(columns.current_state, "NY");
    assert.equal(columns.email_primary, "patrickwfinnegan@gmail.com");
    assert.equal(columns.linkedin_url, "https://linkedin.com/in/patrick-finnegan-mba");
    assert.deepEqual(emails, [
      "patrickwfinnegan@gmail.com",
      "patrick.finnegan@charliehealth.com",
      "pwf8@georgetown.edu",
    ]);
  });

  it("parses sport prefixes and location without a comma", () => {
    assert.deepEqual(parseOverviewSport("Football · WR"), { position: "WR" });
    assert.deepEqual(parseOverviewSport("Football"), { position: null });
    assert.deepEqual(parseOverviewSport("QB"), { position: "QB" });
    assert.equal(formatOverviewSport("wr"), "Football · WR");
    assert.deepEqual(parseLocationInput("New York NY"), { city: "New York", state: "NY" });
    assert.deepEqual(parseLocationInput(""), { city: null, state: null });
  });

  it("treats a blank email list as a clear, and leaves emails untouched when omitted", () => {
    assert.deepEqual(parseOverviewEmails(""), []);
    assert.equal(parseOverviewEmails(undefined), undefined);
    const cleared = overviewInputToAlumniPatch({ emails: "" });
    assert.equal(cleared.columns.email_primary, null);
    assert.deepEqual(cleared.emails, []);
    const untouched = overviewInputToAlumniPatch({ about: "New headline" });
    assert.equal(untouched.columns.headline, "New headline");
    assert.equal(untouched.emails, undefined);
    assert.equal("email_primary" in untouched.columns, false);
  });

  it("prefills the editor from stored headline, not the generated About fallback", () => {
    const values = overviewFormValues({
      headline: "Growth Strategy @ Charlie Health",
      position: "WR",
      current_city: "New York",
      current_state: "NY",
      email_primary: "pwf8@georgetown.edu",
      emails: [{ email: "patrickwfinnegan@gmail.com" }, { email: "pwf8@georgetown.edu" }],
      linkedin_url: "https://www.linkedin.com/in/patrick-finnegan-mba",
    });
    assert.equal(values.about, "Growth Strategy @ Charlie Health");
    assert.equal(values.sport, "Football · WR");
    assert.equal(values.location, "New York, NY");
    assert.equal(values.emails, "pwf8@georgetown.edu\npatrickwfinnegan@gmail.com");
    assert.match(values.linkedin_url, /linkedin\.com\/in\/patrick-finnegan-mba/);
  });

  it("maps contact + job fields from the overview form", () => {
    const form = new Map<string, string>([
      ["about", ""],
      ["sport", "Football · QB"],
      ["location", "Washington, DC"],
      ["emails", "qb@example.com"],
      ["linkedin_url", ""],
      ["first_name", "Pat"],
      ["preferred_name", "PJ"],
      ["phone_primary", "202-555-0100"],
      ["company_name", "Georgetown"],
      ["job_title", "Director"],
      ["industry", "Education"],
      ["address_primary", "37th & O St"],
    ]);
    const patch = overviewPatchFromForm({ get: (name) => form.get(name) ?? null });
    const { columns, emails } = overviewInputToAlumniPatch(patch);
    assert.equal(columns.first_name, "Pat");
    assert.equal(columns.preferred_name, "PJ");
    assert.equal(columns.phone_primary, "202-555-0100");
    assert.equal(columns.company_name, "Georgetown");
    assert.equal(columns.job_title, "Director");
    assert.equal(columns.industry, "Education");
    assert.equal(columns.address_primary, "37th & O St");
    assert.equal(columns.email_primary, "qb@example.com");
    assert.deepEqual(emails, ["qb@example.com"]);
    assert.equal("last_name" in columns, false);
  });

  it("maps admin roster fields only when includeAdminRoster is set", () => {
    const patch = {
      last_name: "Finnegan",
      full_name: "Patrick Finnegan",
      class_year: "'15",
      seasons: "2011-2014",
      hometown: "Chicago, IL",
    };
    const denied = overviewInputToAlumniPatch(patch);
    assert.equal("last_name" in denied.columns, false);
    assert.equal("class_year" in denied.columns, false);

    const allowed = overviewInputToAlumniPatch(patch, { includeAdminRoster: true });
    assert.equal(allowed.columns.last_name, "Finnegan");
    assert.equal(allowed.columns.full_name, "Patrick Finnegan");
    assert.equal(allowed.columns.class_year, "2015");
    assert.equal(allowed.columns.seasons, "2011-2014");
    assert.equal(allowed.columns.hometown_city, "Chicago");
    assert.equal(allowed.columns.hometown_state, "IL");
  });
});
