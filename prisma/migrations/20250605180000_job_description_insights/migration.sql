-- CreateTable
CREATE TABLE "job_description_insights" (
    "id" UUID NOT NULL,
    "jobExternalId" TEXT,
    "jobSource" TEXT,
    "descriptionFingerprint" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "icpJson" JSONB NOT NULL,
    "keywordsJson" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'icp-v1',
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_description_insights_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "applications" ADD COLUMN "jobInsightId" UUID;

-- AlterTable
ALTER TABLE "application_ats_reports" ADD COLUMN "icpMatchJson" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "job_description_insights_descriptionFingerprint_key" ON "job_description_insights"("descriptionFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "job_description_insights_jobExternalId_jobSource_key" ON "job_description_insights"("jobExternalId", "jobSource");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobInsightId_fkey" FOREIGN KEY ("jobInsightId") REFERENCES "job_description_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;
