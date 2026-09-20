export const DIRECTORY_PILLS = [
  { id: "all", label: "All" },
  { id: "athletes", label: "Athletes" },
  { id: "alumni", label: "Alumni" },
  { id: "coaches", label: "Coaches" },
  { id: "staff", label: "Staff" },
] as const;

export type DirectoryPill = (typeof DIRECTORY_PILLS)[number]["id"];
export type LockerKind = "athlete" | "alumni" | "coach" | "staff";
export type LockerSource = "roster" | "sample";
export type AthleteTab = "overview" | "stats" | "photos" | "career" | "qa";

export const ATHLETE_TABS: Array<{ id: AthleteTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Years Active" },
  { id: "photos", label: "Photos" },
  { id: "career", label: "Career" },
  { id: "qa", label: "Q&A" },
];

export type LockerRosterYear = {
  year: number;
  position: string | null;
  class: string | null;
};

export type LockerQaItem = {
  id: string;
  question: string;
  answer: string | null;
};

export type LockerPhotoSlot = {
  id: string;
  caption: string;
  url: string | null;
};

export type LockerPerson = {
  id: string;
  kind: LockerKind;
  firstName: string | null;
  lastName: string;
  preferredName: string | null;
  fullName: string | null;
  position: string | null;
  classYear: string | null;
  classLabel: string | null;
  sport: string;
  city: string | null;
  state: string | null;
  hometownCity: string | null;
  hometownState: string | null;
  linkedinUrl: string | null;
  headline: string | null;
  companyName: string | null;
  jobTitle: string | null;
  industry: string | null;
  seasons: string | null;
  latestRosterYear: number | null;
  photoUrl: string | null;
  footballPhotoUrl: string | null;
  linkedinPhotoUrl: string | null;
  about: string | null;
  source: LockerSource;
};

export type LockerPersonDetail = LockerPerson & {
  rosterYears: LockerRosterYear[];
  photos: LockerPhotoSlot[];
  qa: LockerQaItem[];
  /** Signed-in athlete profile only. Never attach to directory list cards. */
  emails: string[];
};

export type LockerDirectoryResult = {
  rows: LockerPerson[];
  total: number;
  page: number;
  pageSize: number;
  usingSample: boolean;
};
