import type { Application, Prisma } from "@/generated/prisma";

import type { JobListing, JobSalary } from "../jobs/types";

/** Structured job listing captured at track time (FA.1). */
export type JobListingSnapshot = {
  title: string;
  company: string;
  location: string | null;
  salaryText: string | null;
  category: string | null;
  contractType: string | null;
  externalId: string | null;
  redirectUrl: string | null;
  postedAt: string | null;
  country?: string;
  capturedAt: string;
};

export type ApplicationProfileSnapshotDto = {
  applicationId: string;
  summary: string | null;
  experienceJson: unknown;
  skills: string[];
  educationJson: unknown;
  snapshotAt: Date;
};

function formatSalary(salary?: JobSalary): string | null {
  if (!salary) return null;
  const { min, max, currency } = salary;
  const symbol =
    currency === "GBP"
      ? "£"
      : currency === "EUR"
        ? "€"
        : currency
          ? `${currency} `
          : "";
  if (min != null && max != null) {
    return `${symbol}${min.toLocaleString("en-GB")} – ${symbol}${max.toLocaleString("en-GB")}`;
  }
  if (min != null) return `from ${symbol}${min.toLocaleString("en-GB")}`;
  if (max != null) return `up to ${symbol}${max.toLocaleString("en-GB")}`;
  return null;
}

export function buildJobListingSnapshotFromListing(
  job: JobListing,
): JobListingSnapshot {
  return {
    title: job.title,
    company: job.company,
    location: job.location?.trim() || null,
    salaryText: formatSalary(job.salary),
    category: job.category ?? null,
    contractType: job.contractType ?? null,
    externalId: job.id,
    redirectUrl: job.redirectUrl || null,
    postedAt: job.createdAt ?? null,
    country: job.country,
    capturedAt: new Date().toISOString(),
  };
}

export function buildJobListingSnapshotFromApplication(
  application: Application,
): JobListingSnapshot {
  return {
    title: application.title,
    company: application.company,
    location: application.location,
    salaryText: application.salaryText,
    category: null,
    contractType: null,
    externalId: application.jobExternalId,
    redirectUrl: application.jobUrl,
    postedAt: null,
    capturedAt: application.createdAt.toISOString(),
  };
}

export function parseJobListingSnapshot(value: unknown): JobListingSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.title !== "string" || typeof row.company !== "string") return null;
  return {
    title: row.title,
    company: row.company,
    location: typeof row.location === "string" ? row.location : null,
    salaryText: typeof row.salaryText === "string" ? row.salaryText : null,
    category: typeof row.category === "string" ? row.category : null,
    contractType: typeof row.contractType === "string" ? row.contractType : null,
    externalId: typeof row.externalId === "string" ? row.externalId : null,
    redirectUrl: typeof row.redirectUrl === "string" ? row.redirectUrl : null,
    postedAt: typeof row.postedAt === "string" ? row.postedAt : null,
    country: typeof row.country === "string" ? row.country : undefined,
    capturedAt:
      typeof row.capturedAt === "string" ? row.capturedAt : new Date().toISOString(),
  };
}

export function resolveJobDescriptionText(application: Application): string | null {
  const canonical = application.jobDescriptionText?.trim();
  if (canonical) return canonical;
  const legacy = application.jobDescriptionSnapshot?.trim();
  return legacy || null;
}

export type JobSnapshotPersistFields = {
  jobListingSnapshot: Prisma.InputJsonValue;
  jobDescriptionText: string | null;
  jobDescriptionSnapshot: string | null;
};

export function jobSnapshotPersistPayload(
  snapshot: JobListingSnapshot,
  descriptionText: string | null,
): JobSnapshotPersistFields {
  const text = descriptionText?.trim() || null;
  return {
    jobListingSnapshot: snapshot as Prisma.InputJsonValue,
    jobDescriptionText: text,
    jobDescriptionSnapshot: text,
  };
}
