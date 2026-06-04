-- Millisecond epoch values exceed INTEGER max (~2.1e9); use BIGINT for legacy InternHunt timestamps.

ALTER TABLE "resumes" ALTER COLUMN "uploaded_at" SET DATA TYPE BIGINT USING "uploaded_at"::bigint;

ALTER TABLE "jobs" ALTER COLUMN "posted_at" SET DATA TYPE BIGINT USING "posted_at"::bigint;
ALTER TABLE "jobs" ALTER COLUMN "scraped_at" SET DATA TYPE BIGINT USING "scraped_at"::bigint;

ALTER TABLE "job_matches" ALTER COLUMN "computed_at" SET DATA TYPE BIGINT USING "computed_at"::bigint;

ALTER TABLE "saved_jobs" ALTER COLUMN "saved_at" SET DATA TYPE BIGINT USING "saved_at"::bigint;

ALTER TABLE "applied_jobs" ALTER COLUMN "applied_at" SET DATA TYPE BIGINT USING "applied_at"::bigint;

ALTER TABLE "legacy_cover_letters" ALTER COLUMN "generated_at" SET DATA TYPE BIGINT USING "generated_at"::bigint;

ALTER TABLE "chat_messages" ALTER COLUMN "created_at" SET DATA TYPE BIGINT USING "created_at"::bigint;

ALTER TABLE "scrape_runs" ALTER COLUMN "started_at" SET DATA TYPE BIGINT USING "started_at"::bigint;
ALTER TABLE "scrape_runs" ALTER COLUMN "finished_at" SET DATA TYPE BIGINT USING "finished_at"::bigint;
