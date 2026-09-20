export type AlumniListItem = {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  position: string | null;
  seasons: string | null;
  class_year: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  current_city: string | null;
  current_state: string | null;
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  linkedin_url: string | null;
  headline: string | null;
  email_primary: string | null;
  phone_primary: string | null;
  address_primary: string | null;
  football_photo_url?: string | null;
  linkedin_photo_url?: string | null;
};

export type AlumniEmail = {
  id: number;
  alumni_id: string;
  email: string;
  label: string | null;
};

export type AlumniPhone = {
  id: number;
  alumni_id: string;
  phone: string;
  label: string | null;
};

export type AlumniRosterYear = {
  id: number;
  alumni_id: string;
  year: number;
  position: string | null;
  class: string | null;
};

export type AlumniDetail = AlumniListItem & {
  source_flags: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  emails: AlumniEmail[];
  phones: AlumniPhone[];
  roster_years: AlumniRosterYear[];
};

export type AlumniFacets = {
  states: string[];
  cities: string[];
  positions: string[];
  classYears: string[];
  seasonYears: string[];
};

export type DirectoryResult = {
  rows: AlumniListItem[];
  total: number;
  page: number;
  pageSize: number;
  facets: AlumniFacets;
};

export type BlastRecipient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type ContactExportRow = {
  id: string;
  name: string;
  position: string | null;
  class_year: string | null;
  current_city: string | null;
  current_state: string | null;
  company_name: string | null;
  job_title: string | null;
  emails: string[];
  phones: string[];
  linkedin_url: string | null;
};

export type AlumniMapPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  locationLabel: string;
  locationSource: "current" | "hometown" | "address";
  geocodeMethod: "city" | "state" | "nominatim";
  classYear: string | null;
  position: string | null;
};
