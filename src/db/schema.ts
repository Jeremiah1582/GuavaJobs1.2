// src/db/schema.ts
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ─────────────────────────────────────────────
// Better Auth tables (unchanged)
// ─────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date()).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_userId_idx").on(t.userId)]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$onUpdate(() => new Date()).notNull(),
}, (t) => [index("account_userId_idx").on(t.userId)]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()).notNull(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// ─────────────────────────────────────────────
// Resumes — PDF stored on disk, analysis stored here
// ─────────────────────────────────────────────

export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  rawText: text("raw_text").notNull(),
  skills: text("skills").notNull().default("[]"),       // JSON string[] — technical skills
  keywords: text("keywords").notNull().default("[]"),   // JSON string[] — ATS keywords found
  strengths: text("strengths").notNull().default("[]"), // JSON array
  feedback: text("feedback").notNull().default("[]"),   // JSON Improvement[] — full objects
  experience: text("experience").notNull().default("[]"),
  education: text("education").notNull().default("[]"),
  atsScore: integer("ats_score"),
  summary: text("summary"),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  // FIX: stores grade, passesATS, sectionScores, stats, softSkills, missingKeywords
  // so the GET route can reconstruct the full result without recalculating
  metadata: text("metadata").notNull().default("{}"),
}, (t) => [index("resumes_userId_idx").on(t.userId)]);

// ─────────────────────────────────────────────
// Jobs — scraped internship listings
// ─────────────────────────────────────────────

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull().default(""),
  locationType: text("location_type").notNull().default("Unknown"),
  description: text("description").notNull().default(""),
  url: text("url").notNull().unique(),
  source: text("source").notNull(),
  requiredSkills: text("required_skills").notNull().default("[]"),
  postedAt: integer("posted_at", { mode: "timestamp_ms" }),
  scrapedAt: integer("scraped_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
}, (t) => [
  index("jobs_source_idx").on(t.source),
  index("jobs_company_idx").on(t.company),
]);

// ─────────────────────────────────────────────
// Job match scores
// ─────────────────────────────────────────────

export const jobMatches = sqliteTable("job_matches", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  resumeId: text("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  matchScore: integer("match_score").notNull(),
  matchReason: text("match_reason").notNull().default(""),
  computedAt: integer("computed_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
}, (t) => [
  index("job_matches_userId_idx").on(t.userId),
  index("job_matches_jobId_idx").on(t.jobId),
]);

// ─────────────────────────────────────────────
// Saved jobs (bookmarks)
// ─────────────────────────────────────────────

export const savedJobs = sqliteTable("saved_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  savedAt: integer("saved_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
}, (t) => [index("saved_jobs_userId_idx").on(t.userId)]);

// ─────────────────────────────────────────────
// Cover letters
// ─────────────────────────────────────────────

export const coverLetters = sqliteTable("cover_letters", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  resumeId: text("resume_id").notNull().references(() => resumes.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  tone: text("tone").notNull().default("professional"),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
}, (t) => [index("cover_letters_userId_idx").on(t.userId)]);

// ─────────────────────────────────────────────
// Chat messages
// ─────────────────────────────────────────────

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
}, (t) => [index("chat_messages_userId_idx").on(t.userId)]);

// ─────────────────────────────────────────────
// Scrape run log
// ─────────────────────────────────────────────

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: text("id").primaryKey(),
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  jobsFound: integer("jobs_found").default(0),
  status: text("status").notNull().default("running"),
  error: text("error"),
});

// ─────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  resumes: many(resumes),
  jobMatches: many(jobMatches),
  savedJobs: many(savedJobs),
  coverLetters: many(coverLetters),
  chatMessages: many(chatMessages),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(user, { fields: [resumes.userId], references: [user.id] }),
  jobMatches: many(jobMatches),
  coverLetters: many(coverLetters),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  jobMatches: many(jobMatches),
  savedJobs: many(savedJobs),
  coverLetters: many(coverLetters),
}));

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  user: one(user, { fields: [jobMatches.userId], references: [user.id] }),
  job: one(jobs, { fields: [jobMatches.jobId], references: [jobs.id] }),
  resume: one(resumes, { fields: [jobMatches.resumeId], references: [resumes.id] }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(user, { fields: [savedJobs.userId], references: [user.id] }),
  job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] }),
}));

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  user: one(user, { fields: [coverLetters.userId], references: [user.id] }),
  job: one(jobs, { fields: [coverLetters.jobId], references: [jobs.id] }),
  resume: one(resumes, { fields: [coverLetters.resumeId], references: [resumes.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(user, { fields: [chatMessages.userId], references: [user.id] }),
}));