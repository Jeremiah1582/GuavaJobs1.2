import type {
  Application,
  ApplicationNote,
  ApplicationProfileSnapshot,
  ApplicationCoverLetter,
  ApplicationRejectionPhase,
} from "@/generated/prisma";
import {
  inferEmploymentTypeFromListing,
  inferJobCategoryFromListing,
} from "./job-taxonomy";
import { nextPipelineStatus } from "./constants";
import {
  buildJobListingSnapshotFromApplication,
  buildJobListingSnapshotFromListing,
  jobSnapshotPersistPayload,
  parseJobListingSnapshot,
  resolveJobDescriptionForApplication,
  resolveJobDescriptionText,
} from "./snapshots";
import { ApiErrorCode } from "../api/errors";
import { prisma } from "@/db";
import {
  applicationNoteSchema,
  applicationNoteUpdateSchema,
  applicationUpdateSchema,
  interviewUpdateSchema,
  manualApplicationCreateSchema,
  type ApplicationNoteInput,
  type ApplicationUpdateInput,
  type InterviewUpdateInput,
  type ManualApplicationCreateInput,
} from "../validators/applications";
import { ApplicationsServiceError } from "./errors";
import { safeRecomputeReport } from "./ats/hooks";
import "server-only";

import { previewCoverLetterContent } from "./cover-letter";
import type { CoverLetterDto } from "./cover-letter/types";
import type { JobListing } from "../jobs/types";

export type {
  ApplicationBundle,
  ApplicationBundleFlags,
  ApplicationDetail,
  ApplicationListItem,
  ApplicationNoteDto,
  ApplicationProfileSnapshotDto,
  JobListingSnapshot,
} from "./types";

import type {
  ApplicationBundle,
  ApplicationBundleFlags,
  ApplicationDetail,
  ApplicationListItem,
  ApplicationNoteDto,
  ApplicationProfileSnapshotDto,
  JobListingSnapshot,
} from "./types";

export async function latestActiveResumeId(userId: string): Promise<string | null> {
  const resume = await prisma.resume.findFirst({
    where: { userId, isActive: 1 },
    orderBy: { uploadedAt: "desc" },
    select: { id: true },
  });
  return resume?.id ?? null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

function buildManualSnapshot(input: ManualApplicationCreateInput): string | null {
  const description = input.description?.trim();
  return description || null;
}

function mapProfileSnapshot(row: ApplicationProfileSnapshot): ApplicationProfileSnapshotDto {
  return {
    applicationId: row.applicationId,
    summary: row.summary,
    experienceJson: row.experienceJson ?? [],
    skills: row.skills,
    educationJson: row.educationJson ?? [],
    snapshotAt: row.snapshotAt,
  };
}

async function writeProfileSnapshotFromUser(
  applicationId: string,
  userId: string,
): Promise<ApplicationProfileSnapshotDto> {
  
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const row = await prisma.applicationProfileSnapshot.upsert({
    where: { applicationId },
    create: {
      applicationId,
      summary: profile?.summary ?? null,
      experienceJson: profile?.experienceJson ?? undefined,
      skills: profile?.skills ?? [],
      educationJson: profile?.educationJson ?? undefined,
      snapshotAt: new Date(),
    },
    update: {
      summary: profile?.summary ?? null,
      experienceJson: profile?.experienceJson ?? undefined,
      skills: profile?.skills ?? [],
      educationJson: profile?.educationJson ?? undefined,
      snapshotAt: new Date(),
    },
  });
  return mapProfileSnapshot(row);
}

async function captureProfileSnapshot(
  applicationId: string,
  userId: string,
): Promise<void> {
  
  const existing = await prisma.applicationProfileSnapshot.findUnique({
    where: { applicationId },
  });
  if (existing) return;
  await writeProfileSnapshotFromUser(applicationId, userId);
}

export async function refreshProfileSnapshot(
  userId: string,
  applicationId: string,
): Promise<ApplicationProfileSnapshotDto> {
  await assertOwned(userId, applicationId);
  return writeProfileSnapshotFromUser(applicationId, userId);
}

async function ensureJobSnapshotsPersisted(application: Application): Promise<Application> {
  const stored = parseJobListingSnapshot(application.jobListingSnapshot);
  const descriptionText = resolveJobDescriptionText(application);
  if (stored && descriptionText) return application;

  const snapshot =
    stored ?? buildJobListingSnapshotFromApplication(application);
  const text = descriptionText ?? application.jobDescriptionSnapshot?.trim() ?? null;
  

  return prisma.application.update({
    where: { id: application.id },
    data: jobSnapshotPersistPayload(snapshot, text),
  });
}

async function ensureProfileSnapshotForApplication(
  applicationId: string,
  userId: string,
): Promise<ApplicationProfileSnapshotDto | null> {
  
  let row = await prisma.applicationProfileSnapshot.findUnique({
    where: { applicationId },
  });
  if (!row) {
    await captureProfileSnapshot(applicationId, userId);
    row = await prisma.applicationProfileSnapshot.findUnique({
      where: { applicationId },
    });
  }
  return row ? mapProfileSnapshot(row) : null;
}

function resolveJobListingSnapshotForRead(
  application: Application,
): JobListingSnapshot | null {
  return (
    parseJobListingSnapshot(application.jobListingSnapshot) ??
    buildJobListingSnapshotFromApplication(application)
  );
}

function buildBundleFlags(
  letter: ApplicationCoverLetter | null,
): ApplicationBundleFlags {
  const hasCoverLetter = Boolean(letter?.content?.trim());
  const hasAiLetter = letter?.source === "AI";
  return {
    hasCoverLetter,
    hasAiLetter,
    isAiAssisted: hasAiLetter,
    aiLettersRemaining: null,
  };
}

function mapNote(note: ApplicationNote): ApplicationNoteDto {
  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function mapDetail(application: Application & { timelineNotes: ApplicationNote[] }): ApplicationDetail {
  return {
    id: application.id,
    title: application.title,
    company: application.company,
    status: application.status,
    rejectionPhase: application.rejectionPhase,
    rejectedAt: application.rejectedAt,
    jobExternalId: application.jobExternalId,
    jobUrl: application.jobUrl,
    source: application.source,
    location: application.location,
    salaryText: application.salaryText,
    nextStep: application.nextStep,
    contactName: application.contactName,
    viaRecruiter: application.viaRecruiter,
    fitScore: application.fitScore,
    industry: application.industry,
    jobCategory: application.jobCategory,
    jobCategoryOther: application.jobCategoryOther,
    employmentType: application.employmentType,
    requirementsNotes: application.requirementsNotes,
    aboutNotes: application.aboutNotes,
    language: application.language,
    roleStartDate: application.roleStartDate,
    interviewRound: application.interviewRound,
    interviewScheduledAt: application.interviewScheduledAt,
    interviewLocation: application.interviewLocation,
    interviewUrl: application.interviewUrl,
    jobDescriptionSnapshot: application.jobDescriptionSnapshot,
    appliedAt: application.appliedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    notes: application.timelineNotes.map(mapNote),
  };
}

async function assertOwned(
  userId: string,
  applicationId: string,
): Promise<Application> {
  
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
  });
  if (!application) {
    throw new ApplicationsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }
  return application;
}

export async function findByUserAndExternalId(
  userId: string,
  jobExternalId: string,
): Promise<Application | null> {
  
  return prisma.application.findFirst({
    where: { userId, jobExternalId },
  });
}

export async function createFromJobListing(
  userId: string,
  job: JobListing,
): Promise<Application> {
  const existing = await findByUserAndExternalId(userId, job.id);
  if (existing) {
    const hydrated = await ensureJobSnapshotsPersisted(existing);
    await captureProfileSnapshot(hydrated.id, userId);
    await safeRecomputeReport(userId, hydrated.id, "application.created");
    return hydrated;
  }

  
  const listingSnapshot = buildJobListingSnapshotFromListing(job);
  const descriptionText = job.description?.trim() || null;
  const snapshotFields = jobSnapshotPersistPayload(listingSnapshot, descriptionText);
  const jobCategory = inferJobCategoryFromListing(listingSnapshot);
  const employmentType = inferEmploymentTypeFromListing(listingSnapshot);
  const resumeId = await latestActiveResumeId(userId);

  try {
    const created = await prisma.application.create({
      data: {
        userId,
        jobExternalId: job.id,
        title: job.title,
        company: job.company,
        location: job.location || null,
        jobUrl: job.redirectUrl || null,
        source: job.source,
        status: "DRAFT",
        jobCategory,
        employmentType,
        jobCategoryOther:
          jobCategory === "OTHER" ? listingSnapshot.category?.trim() || null : null,
        resumeId,
        ...snapshotFields,
      },
    });
    await captureProfileSnapshot(created.id, userId);
    await safeRecomputeReport(userId, created.id, "application.created");
    return created;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const duplicate = await findByUserAndExternalId(userId, job.id);
      if (duplicate) {
        const hydrated = await ensureJobSnapshotsPersisted(duplicate);
        await captureProfileSnapshot(hydrated.id, userId);
        await safeRecomputeReport(userId, hydrated.id, "application.created");
        return hydrated;
      }
    }
    throw error;
  }
}

export async function createManual(
  userId: string,
  input: ManualApplicationCreateInput,
): Promise<Application> {
  const parsed = manualApplicationCreateSchema.parse(input);
  
  const descriptionText = buildManualSnapshot(parsed);
  const listingSnapshot: JobListingSnapshot = {
    title: parsed.title,
    company: parsed.company,
    location: parsed.location?.trim() || null,
    salaryText: null,
    category: null,
    contractType: null,
    externalId: null,
    redirectUrl: parsed.jobUrl?.trim() || null,
    postedAt: null,
    capturedAt: new Date().toISOString(),
  };

  const resumeId = await latestActiveResumeId(userId);

  const created = await prisma.application.create({
    data: {
      userId,
      title: parsed.title,
      company: parsed.company,
      jobUrl: parsed.jobUrl?.trim() || null,
      source: parsed.source?.trim() || null,
      location: parsed.location?.trim() || null,
      appliedAt: parsed.appliedAt ?? null,
      status: parsed.appliedAt ? "APPLIED" : "DRAFT",
      jobCategory: "UNKNOWN",
      employmentType: "UNKNOWN",
      resumeId,
      ...jobSnapshotPersistPayload(listingSnapshot, descriptionText),
    },
  });
  await captureProfileSnapshot(created.id, userId);
  await safeRecomputeReport(userId, created.id, "application.created");
  return created;
}

export async function listByUser(userId: string): Promise<ApplicationListItem[]> {
  
  const rows = await prisma.application.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      rejectionPhase: true,
      location: true,
      source: true,
      jobUrl: true,
      appliedAt: true,
      interviewRound: true,
      viaRecruiter: true,
      updatedAt: true,
      jobExternalId: true,
      jobCategory: true,
      employmentType: true,
      createdAt: true,
      _count: { select: { timelineNotes: true } },
      coverLetter: {
        select: { content: true, source: true },
      },
    },
  });

  return rows.map((row) => {
    const manualContent = row.coverLetter?.content?.trim() ?? "";
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      status: row.status,
      rejectionPhase: row.rejectionPhase,
      location: row.location,
      source: row.source,
      jobUrl: row.jobUrl,
      appliedAt: row.appliedAt,
      interviewRound: row.interviewRound,
      viaRecruiter: row.viaRecruiter,
      updatedAt: row.updatedAt,
      jobExternalId: row.jobExternalId,
      createdAt: row.createdAt,
      noteCount: row._count.timelineNotes,
      coverLetterPreview: manualContent
        ? previewCoverLetterContent(manualContent)
        : null,
      hasCoverLetter: Boolean(manualContent),
      jobCategory: row.jobCategory,
      employmentType: row.employmentType,
    };
  });
}

export async function getByIdForUser(
  userId: string,
  applicationId: string,
): Promise<ApplicationDetail> {
  
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      timelineNotes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) {
    throw new ApplicationsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }

  return mapDetail(application);
}

function mapCoverLetterDto(
  letter: ApplicationCoverLetter,
  applicationId: string,
): CoverLetterDto {
  const citations = Array.isArray(letter.citationsJson)
    ? (letter.citationsJson as { field?: string; excerpt?: string }[])
        .map((item) => {
          const field = typeof item.field === "string" ? item.field.trim() : "";
          const excerpt = typeof item.excerpt === "string" ? item.excerpt.trim() : "";
          if (!field || !excerpt) return null;
          return { field, excerpt };
        })
        .filter((item): item is { field: string; excerpt: string } => item !== null)
    : [];

  return {
    id: letter.id,
    applicationId,
    content: letter.content,
    source: letter.source,
    citations,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
  };
}

export async function getBundleForUser(
  userId: string,
  applicationId: string,
): Promise<ApplicationBundle> {
  
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: {
      timelineNotes: { orderBy: { createdAt: "desc" } },
      coverLetter: true,
      profileSnapshot: true,
    },
  });

  if (!application) {
    throw new ApplicationsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }

  const snapshotted = await ensureJobSnapshotsPersisted(application);
  const { application: hydrated, jdText: jobDescriptionText } =
    await resolveJobDescriptionForApplication(userId, snapshotted);
  const profileSnapshot = application.profileSnapshot
    ? mapProfileSnapshot(application.profileSnapshot)
    : await ensureProfileSnapshotForApplication(applicationId, userId);

  const jobListingSnapshot = resolveJobListingSnapshotForRead(hydrated);
  const letterRow = application.coverLetter ?? null;

  return {
    application: mapDetail({
      ...hydrated,
      timelineNotes: application.timelineNotes,
    }),
    jobListingSnapshot,
    jobDescriptionText,
    profileSnapshot,
    letter: letterRow
      ? mapCoverLetterDto(letterRow, applicationId)
      : null,
    flags: buildBundleFlags(letterRow),
  };
}

export async function update(
  userId: string,
  applicationId: string,
  input: ApplicationUpdateInput,
): Promise<ApplicationDetail> {
  const parsed = applicationUpdateSchema.parse(input);
  const existing = await assertOwned(userId, applicationId);

  
  const data: Record<string, unknown> = {};

  if (parsed.clearRejection) {
    data.rejectionPhase = null;
    data.rejectedAt = null;
  }
  if (parsed.status) {
    data.status = parsed.status;
    if (parsed.status === "APPLIED" && !existing.appliedAt) {
      data.appliedAt = new Date();
    }
    if (parsed.status === "INTERVIEW" && !existing.interviewRound) {
      data.interviewRound = 1;
    }
    if (parsed.status !== "INTERVIEW") {
      // keep interview fields when moving away unless explicitly cleared
    }
  }
  if (parsed.title) data.title = parsed.title;
  if (parsed.company) data.company = parsed.company;
  if (parsed.jobUrl !== undefined) data.jobUrl = parsed.jobUrl?.trim() || null;
  if (parsed.source !== undefined) data.source = parsed.source?.trim() || null;
  if (parsed.location !== undefined) data.location = parsed.location?.trim() || null;
  if (parsed.salaryText !== undefined) data.salaryText = parsed.salaryText?.trim() || null;
  if (parsed.nextStep !== undefined) data.nextStep = parsed.nextStep?.trim() || null;
  if (parsed.contactName !== undefined) data.contactName = parsed.contactName?.trim() || null;
  if (parsed.viaRecruiter !== undefined) data.viaRecruiter = parsed.viaRecruiter;
  if (parsed.fitScore !== undefined) data.fitScore = parsed.fitScore?.trim() || null;
  if (parsed.industry !== undefined) data.industry = parsed.industry?.trim() || null;
  if (parsed.jobCategory !== undefined) {
    data.jobCategory = parsed.jobCategory;
    if (parsed.jobCategory !== "OTHER") {
      data.jobCategoryOther = null;
    }
  }
  if (parsed.jobCategoryOther !== undefined) {
    data.jobCategoryOther = parsed.jobCategoryOther?.trim() || null;
  }
  if (parsed.employmentType !== undefined) data.employmentType = parsed.employmentType;
  if (parsed.requirementsNotes !== undefined) {
    data.requirementsNotes = parsed.requirementsNotes?.trim() || null;
  }
  if (parsed.aboutNotes !== undefined) data.aboutNotes = parsed.aboutNotes?.trim() || null;
  if (parsed.language !== undefined) data.language = parsed.language?.trim() || null;
  if (parsed.roleStartDate !== undefined) data.roleStartDate = parsed.roleStartDate ?? null;
  if (parsed.appliedAt !== undefined) data.appliedAt = parsed.appliedAt ?? null;
  if (parsed.interviewRound !== undefined) data.interviewRound = parsed.interviewRound;
  if (parsed.interviewScheduledAt !== undefined) {
    data.interviewScheduledAt = parsed.interviewScheduledAt ?? null;
  }
  if (parsed.interviewLocation !== undefined) {
    data.interviewLocation = parsed.interviewLocation?.trim() || null;
  }
  if (parsed.interviewUrl !== undefined) data.interviewUrl = parsed.interviewUrl?.trim() || null;
  let descriptionChanged = false;
  if (parsed.description !== undefined) {
    const text = parsed.description?.trim() || null;
    const snapshot =
      parseJobListingSnapshot(existing.jobListingSnapshot) ??
      buildJobListingSnapshotFromApplication(existing);
    Object.assign(data, jobSnapshotPersistPayload(snapshot, text));
    descriptionChanged = text !== resolveJobDescriptionText(existing);
  }

  await prisma.application.update({
    where: { id: applicationId },
    data,
  });

  if (descriptionChanged) {
    await safeRecomputeReport(userId, applicationId, "manual.refresh");
  }

  return getByIdForUser(userId, applicationId);
}

export async function advanceStage(
  userId: string,
  applicationId: string,
): Promise<ApplicationDetail> {
  const existing = await assertOwned(userId, applicationId);
  

  if (existing.rejectionPhase) {
    throw new ApplicationsServiceError(
      ApiErrorCode.VALIDATION_ERROR,
      "Clear rejection before advancing",
      400,
    );
  }

  if (existing.status === "INTERVIEW") {
    await prisma.application.update({
      where: { id: applicationId },
      data: { interviewRound: (existing.interviewRound ?? 0) + 1 },
    });
    return getByIdForUser(userId, applicationId);
  }

  const next = nextPipelineStatus(existing.status);
  if (!next) {
    return getByIdForUser(userId, applicationId);
  }

  const data: Record<string, unknown> = {
    status: next,
    rejectionPhase: null,
    rejectedAt: null,
  };
  if (next === "APPLIED" && !existing.appliedAt) {
    data.appliedAt = new Date();
  }
  if (next === "INTERVIEW") {
    data.interviewRound = existing.interviewRound ?? 1;
  }

  await prisma.application.update({ where: { id: applicationId }, data });
  return getByIdForUser(userId, applicationId);
}

export async function markRejected(
  userId: string,
  applicationId: string,
  phase?: ApplicationRejectionPhase,
): Promise<ApplicationDetail> {
  const existing = await assertOwned(userId, applicationId);
  

  const resolved: ApplicationRejectionPhase =
    phase ??
    (existing.status === "INTERVIEW" || (existing.interviewRound ?? 0) >= 1
      ? "POST_INTERVIEW"
      : "PRE_INTERVIEW");

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      rejectionPhase: resolved,
      rejectedAt: new Date(),
    },
  });

  return getByIdForUser(userId, applicationId);
}

export async function clearRejection(
  userId: string,
  applicationId: string,
): Promise<ApplicationDetail> {
  await assertOwned(userId, applicationId);
  
  await prisma.application.update({
    where: { id: applicationId },
    data: { rejectionPhase: null, rejectedAt: null },
  });
  return getByIdForUser(userId, applicationId);
}

/** @deprecated Use markRejected */
export const rejectApplication = markRejected;

export async function setInterviewDetails(
  userId: string,
  applicationId: string,
  input: InterviewUpdateInput,
): Promise<ApplicationDetail> {
  const parsed = interviewUpdateSchema.parse(input);
  await assertOwned(userId, applicationId);
  

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "INTERVIEW",
      interviewRound: parsed.interviewRound,
      interviewScheduledAt: parsed.interviewScheduledAt ?? null,
      interviewLocation: parsed.interviewLocation?.trim() || null,
      interviewUrl: parsed.interviewUrl?.trim() || null,
      rejectionPhase: null,
      rejectedAt: null,
    },
  });

  return getByIdForUser(userId, applicationId);
}

export async function remove(userId: string, applicationId: string): Promise<void> {
  await assertOwned(userId, applicationId);
  
  await prisma.application.delete({ where: { id: applicationId } });
}

export async function listNotes(
  userId: string,
  applicationId: string,
): Promise<ApplicationNoteDto[]> {
  await assertOwned(userId, applicationId);
  
  const notes = await prisma.applicationNote.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });
  return notes.map(mapNote);
}

export async function createNote(
  userId: string,
  applicationId: string,
  input: ApplicationNoteInput,
): Promise<ApplicationNoteDto> {
  const parsed = applicationNoteSchema.parse(input);
  await assertOwned(userId, applicationId);

  
  const note = await prisma.applicationNote.create({
    data: {
      applicationId,
      body: parsed.body,
    },
  });
  return mapNote(note);
}

export async function updateNote(
  userId: string,
  applicationId: string,
  noteId: string,
  body: string,
): Promise<ApplicationNoteDto> {
  const parsed = applicationNoteUpdateSchema.parse({ body });
  await assertOwned(userId, applicationId);

  
  const note = await prisma.applicationNote.findFirst({
    where: { id: noteId, applicationId },
  });
  if (!note) {
    throw new ApplicationsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Note not found",
      404,
    );
  }

  const updated = await prisma.applicationNote.update({
    where: { id: noteId },
    data: { body: parsed.body },
  });
  return mapNote(updated);
}

export async function deleteNote(
  userId: string,
  applicationId: string,
  noteId: string,
): Promise<void> {
  await assertOwned(userId, applicationId);
  
  const note = await prisma.applicationNote.findFirst({
    where: { id: noteId, applicationId },
  });
  if (!note) {
    throw new ApplicationsServiceError(
      ApiErrorCode.NOT_FOUND,
      "Note not found",
      404,
    );
  }
  await prisma.applicationNote.delete({ where: { id: noteId } });
}

export { ApplicationsServiceError } from "./errors";

export async function setApplicationResume(
  userId: string,
  applicationId: string,
  resumeId: string | null,
): Promise<void> {
  await assertOwned(userId, applicationId);
  await prisma.application.update({
    where: { id: applicationId },
    data: { resumeId },
  });
  await safeRecomputeReport(userId, applicationId, "resume.linked");
}

export const applicationsService = {
  findByUserAndExternalId,
  createFromJobListing,
  createManual,
  listByUser,
  getByIdForUser,
  getBundleForUser,
  refreshProfileSnapshot,
  update,
  advanceStage,
  markRejected,
  clearRejection,
  rejectApplication,
  setInterviewDetails,
  remove,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
};
