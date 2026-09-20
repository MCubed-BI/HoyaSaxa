const HONORIFIC = /^(mr|mrs|ms|miss|dr|prof|rev|sir|hon)\.?$/i;
const SUFFIX = /^(jr|sr|ii|iii|iv|v|esq)\.?$/i;

const NICKNAME_GROUPS = [
  ["michael", "mike", "mick", "mikey"],
  ["william", "will", "bill", "billy", "liam"],
  ["robert", "rob", "bob", "bobby"],
  ["richard", "rick", "dick", "rich", "richie"],
  ["james", "jim", "jimmy", "jamie"],
  ["john", "jack", "johnny", "jon"],
  ["joseph", "joe", "joey"],
  ["thomas", "tom", "tommy"],
  ["charles", "charlie", "chuck", "chas"],
  ["christopher", "chris"],
  ["daniel", "dan", "danny"],
  ["matthew", "matt"],
  ["anthony", "tony"],
  ["andrew", "andy", "drew"],
  ["benjamin", "ben", "benny"],
  ["edward", "ed", "eddie", "ted"],
  ["steven", "stephen", "steve"],
  ["lawrence", "larry"],
  ["patrick", "pat", "paddy"],
  ["timothy", "tim", "timmy"],
  ["nicholas", "nick", "nicky"],
  ["alexander", "alex", "xander"],
  ["jonathan", "jon", "nathan"],
  ["samuel", "sam", "sammy"],
  ["david", "dave", "davey"],
  ["gregory", "greg"],
  ["jeffrey", "jeff"],
  ["kenneth", "ken", "kenny"],
  ["ronald", "ron", "ronnie"],
  ["donald", "don", "donnie"],
  ["raymond", "ray"],
  ["francis", "frank", "frankie"],
  ["peter", "pete"],
  ["philip", "phil"],
  ["vincent", "vince", "vinny"],
  ["theodore", "ted", "teddy", "theo"],
  ["joshua", "josh"],
  ["jacob", "jake"],
  ["zachary", "zach", "zack"],
  ["nathaniel", "nate", "nathan"],
  ["elizabeth", "liz", "beth", "betty", "eliza", "lisa"],
  ["katherine", "catherine", "kate", "katie", "kathy", "cathy"],
  ["jennifer", "jen", "jenny"],
  ["margaret", "maggie", "meg", "peggy"],
  ["patricia", "pat", "patty", "tricia"],
  ["victoria", "vicky", "tori"],
  ["rebecca", "becky", "becca"],
];

const NICKNAME_TO_ROOT = new Map<string, string>();
for (const group of NICKNAME_GROUPS) {
  const root = group[0]!;
  for (const name of group) {
    NICKNAME_TO_ROOT.set(name, root);
  }
}

export type DuplicateNameFields = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  full_name?: string | null;
};

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function nicknameRoot(value: string) {
  const token = normalizeToken(value);
  if (!token) return "";
  return NICKNAME_TO_ROOT.get(token) ?? token;
}

export function givenNameTokens(person: DuplicateNameFields) {
  const tokens = new Set<string>();
  const last = normalizeToken(person.last_name ?? "");

  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const parts = raw
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (HONORIFIC.test(part) || SUFFIX.test(part)) continue;
      const token = normalizeToken(part);
      if (!token || token === last || token.length < 2) continue;
      tokens.add(token);
    }
  };

  push(person.first_name);
  push(person.preferred_name);
  push(person.full_name);
  return [...tokens];
}

export function givenNamesEquivalent(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return false;
  const leftRoots = new Set(left.map(nicknameRoot));
  const rightRoots = new Set(right.map(nicknameRoot));
  for (const root of leftRoots) {
    if (rightRoots.has(root)) return true;
  }
  for (const a of left) {
    for (const b of right) {
      if (a === b) return true;
      if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return true;
    }
  }
  return false;
}

export function lastNamesMatch(left?: string | null, right?: string | null) {
  const a = normalizeToken(left ?? "");
  const b = normalizeToken(right ?? "");
  return Boolean(a && a === b);
}

export function isLikelyDuplicate(left: DuplicateNameFields, right: DuplicateNameFields) {
  if (left.id && right.id && left.id === right.id) return false;
  if (!lastNamesMatch(left.last_name, right.last_name)) return false;
  return givenNamesEquivalent(givenNameTokens(left), givenNameTokens(right));
}
