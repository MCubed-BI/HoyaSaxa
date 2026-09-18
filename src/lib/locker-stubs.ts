import { classLabel, classifyLockerKind, composeAbout } from "@/lib/locker-classify";
import type { LockerKind, LockerPerson, LockerPersonDetail, LockerPhotoSlot, LockerQaItem } from "@/lib/locker-types";

const SPORT = "Football";

const EMPTY_PHOTOS: LockerPhotoSlot[] = [
  { id: "slot-1", caption: "Game day", url: null },
  { id: "slot-2", caption: "Locker room", url: null },
  { id: "slot-3", caption: "Practice", url: null },
  { id: "slot-4", caption: "Senior day", url: null },
];

const EMPTY_QA: LockerQaItem[] = [
  { id: "why-gu", question: "Why Georgetown?", answer: null },
  { id: "memory", question: "Favorite Hoya memory?", answer: null },
  { id: "now", question: "What are you working on now?", answer: null },
];

function person(input: {
  id: string;
  kind: LockerKind;
  firstName: string;
  lastName: string;
  preferredName?: string;
  position: string;
  classYear?: string;
  latestRosterYear?: number;
  latestRosterClass?: string;
  city?: string;
  state?: string;
  hometownCity?: string;
  hometownState?: string;
  linkedinUrl?: string;
  headline?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  seasons?: string;
  about?: string;
}): LockerPerson {
  const kind = classifyLockerKind(input);
  const label = classLabel(input);
  return {
    id: input.id,
    kind,
    firstName: input.firstName,
    lastName: input.lastName,
    preferredName: input.preferredName ?? null,
    fullName: `${input.firstName} ${input.lastName}`,
    position: input.position,
    classYear: input.classYear ?? null,
    classLabel: label,
    sport: SPORT,
    city: input.city ?? null,
    state: input.state ?? null,
    hometownCity: input.hometownCity ?? null,
    hometownState: input.hometownState ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
    headline: input.headline ?? null,
    companyName: input.companyName ?? null,
    jobTitle: input.jobTitle ?? null,
    industry: input.industry ?? null,
    seasons: input.seasons ?? null,
    latestRosterYear: input.latestRosterYear ?? null,
    photoUrl: null,
    about: composeAbout({
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: input.preferredName ?? null,
      fullName: `${input.firstName} ${input.lastName}`,
      kind,
      position: input.position,
      sport: SPORT,
      headline: input.headline ?? null,
      about: input.about ?? null,
    }),
    source: "sample",
  };
}

const SAMPLE_PEOPLE: LockerPerson[] = [
  person({
    id: "locker-coach-sgarlata",
    kind: "coach",
    firstName: "Rob",
    lastName: "Sgarlata",
    position: "Head Coach",
    city: "Washington",
    state: "DC",
    about: "Head Coach of Georgetown Football. Legacy Locker is the public nameplate for the program.",
  }),
  person({
    id: "locker-coach-sample-assistant",
    kind: "coach",
    firstName: "Sample",
    lastName: "Assistant",
    position: "Assistant Coach",
    city: "Washington",
    state: "DC",
    about: "Sample coach card so the Coaches pill has a locker plate before a staff table lands.",
  }),
  person({
    id: "locker-staff-sample-trainer",
    kind: "staff",
    firstName: "Sample",
    lastName: "Trainer",
    position: "Athletic Trainer",
    city: "Washington",
    state: "DC",
  }),
  person({
    id: "locker-staff-sample-equipment",
    kind: "staff",
    firstName: "Sample",
    lastName: "Equipment",
    position: "Equipment Manager",
    city: "Washington",
    state: "DC",
  }),
  person({
    id: "locker-athlete-sample-qb",
    kind: "athlete",
    firstName: "Sample",
    lastName: "Quarterback",
    position: "QB",
    classYear: "Jr.",
    latestRosterYear: currentSampleRosterYear(),
    latestRosterClass: "Jr.",
    hometownCity: "Arlington",
    hometownState: "VA",
  }),
  person({
    id: "locker-athlete-sample-lb",
    kind: "athlete",
    firstName: "Sample",
    lastName: "Linebacker",
    position: "LB",
    classYear: "Sr.",
    latestRosterYear: currentSampleRosterYear(),
    latestRosterClass: "Sr.",
    hometownCity: "Philadelphia",
    hometownState: "PA",
  }),
  person({
    id: "locker-alumni-sample-ol",
    kind: "alumni",
    firstName: "Sample",
    lastName: "Guard",
    position: "OL",
    classYear: "2015",
    latestRosterYear: 2014,
    city: "New York",
    state: "NY",
    hometownCity: "Garden City",
    hometownState: "NY",
    linkedinUrl: "https://www.linkedin.com",
    companyName: "Sample Firm",
    jobTitle: "Associate",
    industry: "Finance",
    headline: "Georgetown Football alumnus working in New York.",
    seasons: "2011-2014",
    about: "Sample alumnus card with LinkedIn and a current city — used when the roster database is offline.",
  }),
  person({
    id: "locker-alumni-sample-wr",
    kind: "alumni",
    firstName: "Sample",
    lastName: "Receiver",
    position: "WR",
    classYear: "2008",
    latestRosterYear: 2007,
    city: "Boston",
    state: "MA",
    linkedinUrl: "https://www.linkedin.com",
    companyName: "Sample Hospital",
    jobTitle: "Physician",
    industry: "Healthcare",
  }),
];

function currentSampleRosterYear() {
  return new Date().getFullYear();
}

const SAMPLE_DETAILS: Record<string, Pick<LockerPersonDetail, "rosterYears" | "photos" | "qa">> = {
  "locker-alumni-sample-ol": {
    rosterYears: [
      { year: 2011, position: "OL", class: "Fr." },
      { year: 2012, position: "OL", class: "So." },
      { year: 2013, position: "OL", class: "Jr." },
      { year: 2014, position: "OL", class: "Sr." },
    ],
    photos: EMPTY_PHOTOS,
    qa: [
      { id: "why-gu", question: "Why Georgetown?", answer: "The Hilltop and the brotherhood." },
      { id: "memory", question: "Favorite Hoya memory?", answer: "Senior day on the Cooper Field sideline." },
      { id: "now", question: "What are you working on now?", answer: "Sample career note for the Q&A shell." },
    ],
  },
};

export function lockerStubPeople() {
  return SAMPLE_PEOPLE;
}

export function lockerStubById(id: string): LockerPersonDetail | null {
  const base = SAMPLE_PEOPLE.find((row) => row.id === id);
  if (!base) return null;
  const extra = SAMPLE_DETAILS[id];
  return {
    ...base,
    rosterYears: extra?.rosterYears ?? (base.latestRosterYear
      ? [{ year: base.latestRosterYear, position: base.position, class: base.classYear }]
      : []),
    photos: extra?.photos ?? EMPTY_PHOTOS,
    qa: extra?.qa ?? EMPTY_QA,
  };
}

export function emptyLockerPhotos() {
  return EMPTY_PHOTOS;
}

export function emptyLockerQa() {
  return EMPTY_QA;
}

export function isLockerStubId(id: string) {
  return id.startsWith("locker-");
}
