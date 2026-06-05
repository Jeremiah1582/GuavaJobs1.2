-- CreateTable
CREATE TABLE "application_ats_reports" (
    "applicationId" UUID NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "letterScore" INTEGER,
    "cvScore" INTEGER,
    "requirementsJson" JSONB NOT NULL,
    "keywordsJson" JSONB NOT NULL,
    "letterMatchJson" JSONB NOT NULL,
    "cvMatchJson" JSONB NOT NULL,
    "tipsJson" JSONB NOT NULL,
    "inputFingerprint" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_ats_reports_pkey" PRIMARY KEY ("applicationId")
);

-- AddForeignKey
ALTER TABLE "application_ats_reports" ADD CONSTRAINT "application_ats_reports_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
