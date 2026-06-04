-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREEMIUM', 'STARTER', 'PRO');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'APPLIED', 'WAITING', 'INTERVIEW', 'OFFER', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ApplicationRejectionPhase" AS ENUM ('PRE_INTERVIEW', 'POST_INTERVIEW');

-- CreateEnum
CREATE TYPE "CoverLetterSource" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM ('ENGINEERING', 'PRODUCT', 'DESIGN', 'DATA', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'FLUENT', 'NATIVE');

-- CreateEnum
CREATE TYPE "RightToWorkStatus" AS ENUM ('UK_CITIZEN', 'SETTLED_STATUS', 'PRE_SETTLED', 'SKILLED_WORKER', 'STUDENT_VISA', 'NEEDS_SPONSORSHIP', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "SeniorityLevel" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "RelocationWillingness" AS ENUM ('NONE', 'LOCAL', 'NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('ANNUAL', 'MONTHLY', 'HOURLY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "tier" "UserTier" NOT NULL DEFAULT 'FREEMIUM',
    "aiLettersUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "aiUsagePeriodStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "userId" UUID NOT NULL,
    "summary" TEXT,
    "headline" TEXT,
    "location" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "websiteUrl" TEXT,
    "linkedInUrl" TEXT,
    "githubUrl" TEXT,
    "aspiringRole" TEXT,
    "personalityType" TEXT,
    "languagesJson" JSONB,
    "salaryCurrency" TEXT DEFAULT 'GBP',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryPeriod" "SalaryPeriod" DEFAULT 'ANNUAL',
    "salaryNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "rightToWork" "RightToWorkStatus",
    "rightToWorkNote" TEXT,
    "noticePeriodWeeks" INTEGER,
    "availableFrom" TIMESTAMP(3),
    "targetSeniority" "SeniorityLevel",
    "employmentTypePreference" "EmploymentType",
    "relocationWillingness" "RelocationWillingness",
    "experienceJson" JSONB,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "educationJson" JSONB,
    "cvFileUrl" TEXT,
    "quizJson" JSONB,
    "lastImportedAt" TIMESTAMP(3),
    "lastImportSourceUrl" TEXT,
    "importMetaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionPhase" "ApplicationRejectionPhase",
    "rejectedAt" TIMESTAMP(3),
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jobExternalId" TEXT,
    "jobUrl" TEXT,
    "source" TEXT,
    "location" TEXT,
    "salaryText" TEXT,
    "nextStep" TEXT,
    "contactName" TEXT,
    "viaRecruiter" BOOLEAN NOT NULL DEFAULT false,
    "fitScore" TEXT,
    "industry" TEXT,
    "jobCategory" "JobCategory" NOT NULL DEFAULT 'UNKNOWN',
    "jobCategoryOther" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'UNKNOWN',
    "requirementsNotes" TEXT,
    "aboutNotes" TEXT,
    "language" TEXT,
    "roleStartDate" TIMESTAMP(3),
    "interviewRound" INTEGER,
    "interviewScheduledAt" TIMESTAMP(3),
    "interviewLocation" TEXT,
    "interviewUrl" TEXT,
    "jobDescriptionSnapshot" TEXT,
    "jobListingSnapshot" JSONB,
    "jobDescriptionText" TEXT,
    "appliedAt" TIMESTAMP(3),
    "resumeId" TEXT,
    "coverLetterId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_cover_letters" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "source" "CoverLetterSource" NOT NULL DEFAULT 'MANUAL',
    "citations_json" JSONB,
    "isUserEdited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_profile_snapshots" (
    "applicationId" UUID NOT NULL,
    "summary" TEXT,
    "experienceJson" JSONB,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "educationJson" JSONB,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_profile_snapshots_pkey" PRIMARY KEY ("applicationId")
);

-- CreateTable
CREATE TABLE "application_notes" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_job_searches" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "q" TEXT,
    "where" TEXT,
    "country" TEXT NOT NULL DEFAULT 'gb',
    "distanceKm" INTEGER,
    "maxDaysOld" INTEGER,
    "sortBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_job_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "feedback" TEXT NOT NULL DEFAULT '[]',
    "experience" TEXT NOT NULL DEFAULT '[]',
    "education" TEXT NOT NULL DEFAULT '[]',
    "ats_score" INTEGER,
    "summary" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "uploaded_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    "metadata" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "location_type" TEXT NOT NULL DEFAULT 'Unknown',
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "required_skills" TEXT NOT NULL DEFAULT '[]',
    "posted_at" INTEGER,
    "scraped_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    "is_active" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_matches" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "job_id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "match_reason" TEXT NOT NULL DEFAULT '',
    "computed_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,

    CONSTRAINT "job_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_jobs" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "job_external_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "saved_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applied_jobs" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "job_external_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "applied_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,

    CONSTRAINT "applied_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_cover_letters" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "job_id" TEXT NOT NULL,
    "resume_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "generated_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,

    CONSTRAINT "legacy_cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL,
    "started_at" INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
    "finished_at" INTEGER,
    "jobs_found" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "applications_coverLetterId_key" ON "applications"("coverLetterId");

-- CreateIndex
CREATE INDEX "applications_userId_idx" ON "applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_userId_jobExternalId_key" ON "applications"("userId", "jobExternalId");

-- CreateIndex
CREATE INDEX "application_notes_applicationId_idx" ON "application_notes"("applicationId");

-- CreateIndex
CREATE INDEX "saved_job_searches_userId_idx" ON "saved_job_searches"("userId");

-- CreateIndex
CREATE INDEX "resumes_userId_idx" ON "resumes"("user_id");

-- CreateIndex
CREATE INDEX "jobs_userId_idx" ON "jobs"("user_id");

-- CreateIndex
CREATE INDEX "jobs_source_idx" ON "jobs"("source");

-- CreateIndex
CREATE INDEX "jobs_company_idx" ON "jobs"("company");

-- CreateIndex
CREATE INDEX "job_matches_userId_idx" ON "job_matches"("user_id");

-- CreateIndex
CREATE INDEX "job_matches_jobId_idx" ON "job_matches"("job_id");

-- CreateIndex
CREATE INDEX "saved_jobs_userId_idx" ON "saved_jobs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_user_job_idx" ON "saved_jobs"("user_id", "job_external_id");

-- CreateIndex
CREATE INDEX "applied_jobs_userId_idx" ON "applied_jobs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "applied_jobs_user_job_idx" ON "applied_jobs"("user_id", "job_external_id");

-- CreateIndex
CREATE INDEX "legacy_cover_letters_userId_idx" ON "legacy_cover_letters"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("user_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_coverLetterId_fkey" FOREIGN KEY ("coverLetterId") REFERENCES "application_cover_letters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_profile_snapshots" ADD CONSTRAINT "application_profile_snapshots_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_job_searches" ADD CONSTRAINT "saved_job_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_jobs" ADD CONSTRAINT "applied_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_cover_letters" ADD CONSTRAINT "legacy_cover_letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_cover_letters" ADD CONSTRAINT "legacy_cover_letters_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_cover_letters" ADD CONSTRAINT "legacy_cover_letters_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
