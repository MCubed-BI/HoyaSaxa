export type DataSyncStatus = "staged" | "applying" | "applied" | "failed";

export type DataSyncSheetCount = {
  name: string;
  kind: "all_time" | "football" | "linkedin" | "contacts" | "roster" | "generic";
  rows: number;
};

export type DataSyncSample = {
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  action: "update" | "insert";
  matchBy: "linkedin" | "email" | "name" | null;
};

export type DataSyncPreview = {
  samples: DataSyncSample[];
  warnings: string[];
};

export type DataSyncBatch = {
  id: string;
  filename: string;
  content_type: string | null;
  status: DataSyncStatus;
  sheet_counts: DataSyncSheetCount[];
  preview: DataSyncPreview;
  row_count: number;
  insert_count: number;
  update_count: number;
  email_count: number;
  phone_count: number;
  roster_count: number;
  apply_offset: number;
  applied_insert_count: number;
  applied_update_count: number;
  applied_email_count: number;
  applied_phone_count: number;
  applied_roster_count: number;
  errors: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
};
