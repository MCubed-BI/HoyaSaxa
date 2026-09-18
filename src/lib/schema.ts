import { bigint, boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const alumni = pgTable("alumni", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name"),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  fullName: text("full_name"),
  position: text("position"),
  seasons: text("seasons"),
  classYear: text("class_year"),
  hometownCity: text("hometown_city"),
  hometownState: text("hometown_state"),
  currentCity: text("current_city"),
  currentState: text("current_state"),
  companyName: text("company_name"),
  jobTitle: text("job_title"),
  industry: text("industry"),
  linkedinUrl: text("linkedin_url"),
  headline: text("headline"),
  emailPrimary: text("email_primary"),
  phonePrimary: text("phone_primary"),
  addressPrimary: text("address_primary"),
  sourceFlags: jsonb("source_flags").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alumniEmails = pgTable("alumni_emails", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  alumniId: uuid("alumni_id")
    .notNull()
    .references(() => alumni.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  label: text("label"),
});

export const alumniPhones = pgTable("alumni_phones", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  alumniId: uuid("alumni_id")
    .notNull()
    .references(() => alumni.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  label: text("label"),
});

export const textBlasts = pgTable("text_blasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  provider: text("provider"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  filterSnapshot: jsonb("filter_snapshot").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const textBlastRecipients = pgTable("text_blast_recipients", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  blastId: uuid("blast_id")
    .notNull()
    .references(() => textBlasts.id, { onDelete: "cascade" }),
  alumniId: uuid("alumni_id").references(() => alumni.id, { onDelete: "set null" }),
  name: text("name"),
  phone: text("phone").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailBlasts = pgTable("email_blasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  provider: text("provider"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  filterSnapshot: jsonb("filter_snapshot").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailBlastRecipients = pgTable("email_blast_recipients", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  blastId: uuid("blast_id")
    .notNull()
    .references(() => emailBlasts.id, { onDelete: "cascade" }),
  alumniId: uuid("alumni_id").references(() => alumni.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alumniRosterYears = pgTable("alumni_roster_years", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  alumniId: uuid("alumni_id")
    .notNull()
    .references(() => alumni.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  position: text("position"),
  class: text("class"),
});

export const dataSync = pgTable("data_sync", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  contentType: text("content_type"),
  status: text("status").notNull().default("staged"),
  sheetCounts: jsonb("sheet_counts").notNull().default([]),
  preview: jsonb("preview").notNull().default({}),
  payload: jsonb("payload").notNull().default([]),
  rowCount: integer("row_count").notNull().default(0),
  insertCount: integer("insert_count").notNull().default(0),
  updateCount: integer("update_count").notNull().default(0),
  emailCount: integer("email_count").notNull().default(0),
  phoneCount: integer("phone_count").notNull().default(0),
  rosterCount: integer("roster_count").notNull().default(0),
  applyOffset: integer("apply_offset").notNull().default(0),
  appliedInsertCount: integer("applied_insert_count").notNull().default(0),
  appliedUpdateCount: integer("applied_update_count").notNull().default(0),
  appliedEmailCount: integer("applied_email_count").notNull().default(0),
  appliedPhoneCount: integer("applied_phone_count").notNull().default(0),
  appliedRosterCount: integer("applied_roster_count").notNull().default(0),
  errors: jsonb("errors").notNull().default([]),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
});

export const staffRoles = pgTable("staff_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username"),
  email: text("email"),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coachMessages = pgTable("coach_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  body: text("body").notNull(),
  authorRole: text("author_role"),
  authorLabel: text("author_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsflashPosts = pgTable("newsflash_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true }),
  authorLabel: text("author_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fundraisingCampaigns = pgTable("fundraising_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  goalCents: integer("goal_cents"),
  donateUrl: text("donate_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fundraisingPledges = pgTable("fundraising_pledges", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").references(() => fundraisingCampaigns.id, { onDelete: "set null" }),
  alumniId: uuid("alumni_id"),
  name: text("name"),
  email: text("email"),
  amountCents: integer("amount_cents"),
  note: text("note"),
  source: text("source").notNull().default("intent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageChannels = pgTable("message_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("group"),
  description: text("description"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagePosts = pgTable("message_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => messageChannels.id, { onDelete: "cascade" }),
  title: text("title"),
  body: text("body").notNull(),
  authorRole: text("author_role"),
  authorLabel: text("author_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageReads = pgTable(
  "message_reads",
  {
    viewerKey: text("viewer_key").notNull(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => messageChannels.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("message_reads_viewer_channel").on(table.viewerKey, table.channelId)],
);
