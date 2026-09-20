import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateRosterPlayers,
  canonicalizeGuhoyasPhotoUrl,
  guhoyasMatchKey,
  isGuhoyasPhotoUrl,
  mergeFootballPhotosIntoAlumni,
  parseRosterHtml,
  parseRosterPhotoMap,
  photoUrlSortKey,
  shouldReplaceFootballPhoto,
  type GuhoyasYearRoster,
  type SqlClient,
} from "./guhoyas-roster";

const CARD_HTML = `
<table class="sidearm-table">
  <tr><th>No</th><th>Full Name</th><th>Pos</th><th>Academic Year</th></tr>
  <tr><td>0</td><td>Matthew Plunkett</td><td>DL</td><td>Jr.</td><td>6'4"</td><td>218</td><td>Chattanooga, Tenn. / McCallie</td><td></td></tr>
  <tr><td>1</td><td>Kolubah Pewee Jr.</td><td>CB</td><td>Sr.</td><td>5'11"</td><td>170</td><td>Staten Island, N.Y. / Tottenville</td><td></td></tr>
</table>
<script type="application/ld+json">{"@type":"ListItem","item":[
  {"@type":"Person","name":"Matthew Plunkett","image":{"@type":"ImageObject","url":"http://guhoyas.com/images/2024/8/23/20240726FB138.jpg"}},
  {"@type":"Person","name":"Kolubah Pewee Jr.","image":{"@type":"ImageObject","url":"http://guhoyas.com/images/2024/9/3/20240813FB944__1_.jpg"}}
]}</script>
<ul>
  <li class="sidearm-roster-player">
    <div class="sidearm-roster-player-image column">
      <img class="lazyload" data-src="/images/2024/8/23/20240726FB138.jpg?width=80&quality=90" alt="Matthew Plunkett - View Profile">
    </div>
    <a aria-label="Matthew Plunkett - View Profile">Matthew Plunkett</a>
  </li>
</ul>
`;

describe("guhoyas football photo URLs", () => {
  it("canonicalizes https guhoyas /images paths and drops resize queries", () => {
    assert.equal(
      canonicalizeGuhoyasPhotoUrl("/images/2024/8/23/20240726FB138.jpg?width=80&quality=90"),
      "https://guhoyas.com/images/2024/8/23/20240726FB138.jpg",
    );
    assert.equal(
      canonicalizeGuhoyasPhotoUrl("http://guhoyas.com/images/2024/9/3/20240813FB944__1_.jpg"),
      "https://guhoyas.com/images/2024/9/3/20240813FB944__1_.jpg",
    );
    assert.equal(canonicalizeGuhoyasPhotoUrl("https://ad.doubleclick.net/foo.jpg"), null);
    assert.equal(canonicalizeGuhoyasPhotoUrl("/images/responsive_2022/logo_main.svg"), null);
  });

  it("sorts by path date and prefers a newer source URL", () => {
    const older = "https://guhoyas.com/images/2018/5/15/12036538.jpeg";
    const newer = "https://guhoyas.com/images/2024/8/23/20240726FB138.jpg";
    assert.ok(photoUrlSortKey(newer) > photoUrlSortKey(older));
    assert.equal(shouldReplaceFootballPhoto(null, newer, 2024), true);
    assert.equal(shouldReplaceFootballPhoto(older, newer, 2024), true);
    assert.equal(shouldReplaceFootballPhoto(newer, older, 2005), false);
    assert.equal(shouldReplaceFootballPhoto("https://cdn.example.com/custom.jpg", newer, 2024), false);
    assert.equal(isGuhoyasPhotoUrl(newer), true);
    assert.equal(isGuhoyasPhotoUrl("https://cdn.example.com/custom.jpg"), false);
  });
});

describe("guhoyas roster photo parse", () => {
  it("pairs JSON-LD and card images to the fuzzy name key", () => {
    const photos = parseRosterPhotoMap(CARD_HTML);
    assert.equal(photos.get(guhoyasMatchKey("Plunkett", "Matthew"))?.photoUrl, "https://guhoyas.com/images/2024/8/23/20240726FB138.jpg");
    assert.equal(photos.get(guhoyasMatchKey("Pewee Jr.", "Kolubah"))?.photoUrl, "https://guhoyas.com/images/2024/9/3/20240813FB944__1_.jpg");

    const players = parseRosterHtml(CARD_HTML, 2024);
    const plunkett = players.find((p) => p.fullName.includes("Plunkett"));
    assert.ok(plunkett);
    assert.equal(plunkett!.photoUrl, "https://guhoyas.com/images/2024/8/23/20240726FB138.jpg");
  });

  it("keeps the newest photo when aggregating years", () => {
    const years: GuhoyasYearRoster[] = [
      {
        year: 2015,
        url: "https://guhoyas.com/sports/football/roster/2015",
        playerCount: 1,
        players: parseRosterHtml(
          `<table class="sidearm-table"><tr><th>Full Name</th><th>Pos</th><th>Academic Year</th></tr>
           <tr><td>0</td><td>Matthew Plunkett</td><td>DL</td><td>Fr.</td></tr></table>
           <script type="application/ld+json">{"@type":"Person","name":"Matthew Plunkett","image":{"url":"http://guhoyas.com/images/2018/5/15/old.jpeg"}}</script>`,
          2015,
        ),
      },
      {
        year: 2024,
        url: "https://guhoyas.com/sports/football/roster/2024",
        playerCount: 1,
        players: parseRosterHtml(CARD_HTML, 2024),
      },
    ];
    const agg = aggregateRosterPlayers(years);
    const row = agg.get(guhoyasMatchKey("Plunkett", "Matthew"));
    assert.equal(row?.photoUrl, "https://guhoyas.com/images/2024/8/23/20240726FB138.jpg");
    assert.equal(row?.photoYear, 2024);
  });
});

describe("mergeFootballPhotosIntoAlumni", () => {
  it("fills empty football_photo_url, updates a newer GUHoyas URL, and never writes linkedin_photo_url", async () => {
    const updates: Array<{ text: string; params?: unknown[] }> = [];
    const sql: SqlClient = {
      query: async (text, params) => {
        updates.push({ text, params });
        if (/ALTER TABLE/i.test(text)) return [];
        if (/SELECT id, first_name/i.test(text)) {
          return [
            {
              id: "a1",
              first_name: "Matthew",
              last_name: "Plunkett",
              football_photo_url: null,
              source_flags: {},
            },
            {
              id: "a2",
              first_name: "Kolubah",
              last_name: "Pewee Jr.",
              football_photo_url: "https://guhoyas.com/images/2018/5/15/old.jpeg",
              source_flags: { guhoyas_photo_year: 2015 },
            },
            {
              id: "a3",
              first_name: "Custom",
              last_name: "Player",
              football_photo_url: "https://cdn.example.com/mine.jpg",
              source_flags: {},
            },
          ];
        }
        return [];
      },
    };

    const years: GuhoyasYearRoster[] = [
      {
        year: 2024,
        url: "https://guhoyas.com/sports/football/roster/2024",
        playerCount: 3,
        players: [
          ...parseRosterHtml(CARD_HTML, 2024),
          {
            jersey: "99",
            fullName: "Custom Player",
            position: "WR",
            academicYear: "Sr.",
            height: null,
            weight: null,
            hometownHighSchool: null,
            previousSchool: null,
            year: 2024,
            photoUrl: "https://guhoyas.com/images/2024/8/23/new.jpg",
          },
        ],
      },
    ];

    const result = await mergeFootballPhotosIntoAlumni(sql, years);
    assert.equal(result.filled, 1);
    assert.equal(result.updated, 1);
    assert.equal(result.unchanged, 1);
    assert.equal(result.matched, 3);

    const writeSql = updates.filter((row) => /UPDATE alumni SET/.test(row.text));
    assert.equal(writeSql.length, 2);
    assert.ok(writeSql.every((row) => !String(row.text).includes("linkedin_photo_url")));
    assert.ok(writeSql.every((row) => row.params?.[0] && isGuhoyasPhotoUrl(String(row.params[0]))));
  });
});
