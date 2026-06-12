// Backward-compatible re-exports — prefer @/lib/jobs/* for new code.

import { prisma } from "@/db";
import type { Job } from "@/generated/prisma";
import { epochMsNow, epochMsToDate } from "@/lib/epoch-ms";
import { buildJobListItems, type JobListItem } from "@/lib/jobs/list-items";
import { listJobsForUser as listJobsForUserNew } from "@/lib/jobs/queries";
import { clearStaleScrapeRuns, STALE_SCRAPE_MS } from "@/lib/jobs/scrape-runs";

export { clearStaleScrapeRuns, STALE_SCRAPE_MS };
export { buildJobListItems, type JobListItem };

export type JobSnapshot = {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  description: string;
  url: string;
  source: string;
  requiredSkills: string[];
  postedAt?: string | null;
};

function safeJsonArray(raw: string | null | undefined): string[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** @deprecated use listJobsForUser from @/lib/jobs/queries */
export async function listJobsForUser(userId: string, resumeId: string | null) {
  const result = await listJobsForUserNew(userId, resumeId);
  const applied = result.appliedExternalIds.map((jobExternalId) => ({
    jobExternalId,
    userId,
    id: jobExternalId,
    source: "",
    appliedAt: epochMsNow(),
  }));
  return {
    cached: result.cached,
    matches: result.matches,
    saved: result.saved,
    applied,
  };
}

export function cacheRowToSnapshot(row: Job): JobSnapshot {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    locationType: row.locationType,
    description: row.description,
    url: row.url,
    source: row.source,
    requiredSkills: safeJsonArray(row.requiredSkills),
    postedAt:
      row.postedAt != null
        ? (epochMsToDate(row.postedAt)?.toISOString() ?? null)
        : null,
  };
}

export async function getCachedJobForUser(
  userId: string,
  jobId: string,
): Promise<Job | null> {
  const owned = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });
  if (owned) return owned;
  return prisma.job.findFirst({
    where: { id: jobId, userId: null, isActive: 1 },
  });
}

export async function resolveJobForUser(
  userId: string,
  jobId: string,
): Promise<JobSnapshot | null> {
  const cached = await getCachedJobForUser(userId, jobId);
  if (cached) return cacheRowToSnapshot(cached);

  const saved = await prisma.savedJob.findFirst({
    where: { userId, jobExternalId: jobId },
  });
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved.snapshot) as Partial<JobSnapshot>;
    if (!parsed.title || !parsed.company) return null;
    return {
      id: parsed.id ?? jobId,
      title: parsed.title,
      company: parsed.company,
      location: parsed.location ?? "",
      locationType: parsed.locationType ?? "Unknown",
      description: parsed.description ?? "",
      url: parsed.url ?? "",
      source: parsed.source ?? saved.source,
      requiredSkills: Array.isArray(parsed.requiredSkills)
        ? parsed.requiredSkills.map(String)
        : [],
      postedAt: parsed.postedAt ?? null,
    };
  } catch {
    return null;
  }
}
