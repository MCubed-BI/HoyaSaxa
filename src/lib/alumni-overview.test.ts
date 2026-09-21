import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatOverviewSport,
  overviewFormValues,
  overviewInputToAlumniPatch,
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
});
