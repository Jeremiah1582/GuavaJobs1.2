import type {
  ApplicationRejectionPhase,
  ApplicationStatus as PrismaApplicationStatus,
  EmploymentType,
  JobCategory,
} from "@/generated/prisma";

import type { CoverLetterDto } from "./cover-letter/types";
import type {
  ApplicationProfileSnapshotDto,
  JobListingSnapshot,
} from "./snapshots";

export type { JobListingSnapshot, ApplicationProfileSnapshotDto } from "./snapshots";

export type ApplicationListItem = {
  id: string;
  title: string;
  company: string;
  status: PrismaApplicationStatus;
  rejectionPhase: ApplicationRejectionPhase | null;
  location: string | null;
  source: string | null;
  jobUrl: string | null;
  appliedAt: Date | null;
  updatedAt: Date;
  jobExternalId: string | null;
  createdAt: Date;
  noteCount: number;
  interviewRound: number | null;
  viaRecruiter: boolean;
  coverLetterPreview: string | null;
  hasCoverLetter: boolean;
  jobCategory: JobCategory;
  employmentType: EmploymentType;
};

export type ApplicationNoteDto = {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ApplicationBundleFlags = {
  hasCoverLetter: boolean;
  hasAiLetter: boolean;
  isAiAssisted: boolean;
  aiLettersRemaining: number | null;
};

export type ApplicationDetail = {
  id: string;
  title: string;
  company: string;
  status: PrismaApplicationStatus;
  rejectionPhase: ApplicationRejectionPhase | null;
  rejectedAt: Date | null;
  jobExternalId: string | null;
  jobUrl: string | null;
  source: string | null;
  location: string | null;
  salaryText: string | null;
  nextStep: string | null;
  contactName: string | null;
  viaRecruiter: boolean;
  fitScore: string | null;
  industry: string | null;
  jobCategory: JobCategory;
  jobCategoryOther: string | null;
  employmentType: EmploymentType;
  requirementsNotes: string | null;
  aboutNotes: string | null;
  language: string | null;
  roleStartDate: Date | null;
  interviewRound: number | null;
  interviewScheduledAt: Date | null;
  interviewLocation: string | null;
  interviewUrl: string | null;
  jobDescriptionSnapshot: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  notes: ApplicationNoteDto[];
};

export type ApplicationBundle = {
  application: ApplicationDetail;
  jobListingSnapshot: JobListingSnapshot | null;
  jobDescriptionText: string | null;
  profileSnapshot: ApplicationProfileSnapshotDto | null;
  letter: CoverLetterDto | null;
  flags: ApplicationBundleFlags;
};
