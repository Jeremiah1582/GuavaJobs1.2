-- Remove Drizzle-era artifacts (no-ops on fresh installs).
DROP INDEX IF EXISTS "jobs_url_unique";
DROP TABLE IF EXISTS "__migrations";
