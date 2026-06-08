-- Bidirectional job match scores on job_matches
ALTER TABLE "job_matches" ADD COLUMN "user_fits_role_score" INTEGER;
ALTER TABLE "job_matches" ADD COLUMN "role_fits_user_score" INTEGER;
ALTER TABLE "job_matches" ADD COLUMN "overall_fit_score" INTEGER;
ALTER TABLE "job_matches" ADD COLUMN "match_breakdown_json" JSONB NOT NULL DEFAULT '{}';

UPDATE "job_matches"
SET
  "user_fits_role_score" = "match_score",
  "overall_fit_score" = "match_score"
WHERE "user_fits_role_score" IS NULL;

ALTER TABLE "job_matches" ALTER COLUMN "user_fits_role_score" SET NOT NULL;
ALTER TABLE "job_matches" ALTER COLUMN "overall_fit_score" SET NOT NULL;
