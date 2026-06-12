-- Job search overhaul: taxonomy columns on global job index

CREATE TYPE "RoleFamily" AS ENUM (
  'FULLSTACK',
  'FRONTEND',
  'BACKEND',
  'SOFTWARE_ENGINEER',
  'MOBILE',
  'DEVOPS',
  'DATA_SCIENCE',
  'DATA_ANALYTICS',
  'ML_AI',
  'PRODUCT_MANAGER',
  'UX_DESIGN',
  'QA',
  'OTHER',
  'UNKNOWN'
);

ALTER TYPE "JobCategory" ADD VALUE IF NOT EXISTS 'SOFTWARE';
ALTER TYPE "JobCategory" ADD VALUE IF NOT EXISTS 'DATA_SCIENCE';
ALTER TYPE "JobCategory" ADD VALUE IF NOT EXISTS 'SALES';
ALTER TYPE "JobCategory" ADD VALUE IF NOT EXISTS 'MARKETING';
ALTER TYPE "JobCategory" ADD VALUE IF NOT EXISTS 'BUSINESS_DEVELOPMENT';

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "company_logo_url" TEXT;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "role_family" "RoleFamily" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "job_category" "JobCategory" NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX IF NOT EXISTS "jobs_role_family_idx" ON "jobs"("role_family");
CREATE INDEX IF NOT EXISTS "jobs_job_category_idx" ON "jobs"("job_category");
