// src/lib/jobs-api.ts — job cache (SerpAPI) + user saved/applied refs

import { prisma } from "@/db";
import type { AppliedJob, Job, JobMatch, SavedJob } from "@/generated/prisma";
import type { ScrapedJob } from "@/lib/scraper";

export const STALE_SCRAPE_MS = 15 * 60 * 1000;

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

export type JobListItem = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  matchScore: number | null;
  matchReason: string | null;
  tags: string[];
  saved: boolean;
  applied: boolean;
  url: string;
  source: string;
  fromCache: boolean;
};

/** Mark abandoned scrape runs so "Scan Jobs" is not blocked forever. */
export async function clearStaleScrapeRuns(): Promise<number> {
  const cutoff = Date.now() - STALE_SCRAPE_MS;
  const stale = await prisma.scrapeRun.findMany({
    where: { status: "running", startedAt: { lt: cutoff } },
  });

  for (const run of stale) {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        status: "error",
        finishedAt: Date.now(),
        error: "Scrape timed out or was interrupted. Try scanning again.",
      },
    });
  }

  return stale.length;
}

/** Remove all cached listings (keeps user saved/applied refs). */
export async function purgeAllJobCache(): Promise<void> {
  await prisma.jobMatch.deleteMany();
  await prisma.job.deleteMany();
}

/** Replace this user's SerpAPI cache with a fresh scrape (upsert + prune stale). */
export async function replaceUserJobCache(
  userId: string,
  scraped: ScrapedJob[],
): Promise<number> {
  const existing = await prisma.job.findMany({
    where: { userId },
    select: { id: true },
  });
  const newIds = new Set(scraped.map((j) => j.id));
  const removeIds = existing.map((j) => j.id).filter((id) => !newIds.has(id));

  if (removeIds.length > 0) {
    await prisma.job.deleteMany({
      where: { userId, id: { in: removeIds } },
    });
  }

  if (scraped.length === 0) return 0;

  const scrapedAt = Date.now();
  for (const job of scraped) {
    const postedAt = job.postedAt ? new Date(job.postedAt).getTime() : null;
    const data = {
      userId,
      title: job.title,
      company: job.company,
      location: job.location,
      locationType: job.locationType,
      description: job.description,
      url: job.url,
      source: job.source,
      requiredSkills: JSON.stringify(job.requiredSkills),
      postedAt,
      isActive: 1,
      scrapedAt,
    };
    await prisma.job.upsert({
      where: { id: job.id },
      create: { id: job.id, ...data },
      update: data,
    });
  }

  return scraped.length;
}

export function scrapedToSnapshot(job: ScrapedJob): JobSnapshot {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    locationType: job.locationType,
    description: job.description,
    url: job.url,
    source: job.source,
    requiredSkills: job.requiredSkills,
    postedAt: job.postedAt ?? null,
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
    postedAt: row.postedAt != null ? new Date(row.postedAt).toISOString() : null,
  };
}

export function snapshotFromSavedRow(snapshotRaw: string, jobExternalId: string): JobSnapshot | null {
  try {
    const parsed = JSON.parse(snapshotRaw) as Partial<JobSnapshot>;
    if (!parsed.title || !parsed.company) return null;
    return {
      id: parsed.id ?? jobExternalId,
      title: parsed.title,
      company: parsed.company,
      location: parsed.location ?? "",
      locationType: parsed.locationType ?? "Unknown",
      description: parsed.description ?? "",
      url: parsed.url ?? "",
      source: parsed.source ?? "Unknown",
      requiredSkills: Array.isArray(parsed.requiredSkills)
        ? parsed.requiredSkills.map(String)
        : [],
      postedAt: parsed.postedAt ?? null,
    };
  } catch {
    return null;
  }
}

export function safeJsonArray(raw: string | null | undefined): string[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

export function postedLabel(
  postedAt: Date | string | number | null | undefined,
): string {
  if (postedAt == null) return "Recently";
  const d =
    postedAt instanceof Date
      ? postedAt
      : typeof postedAt === "number"
        ? new Date(postedAt)
        : new Date(postedAt);
  if (Number.isNaN(d.getTime())) return String(postedAt);
  return relativeTime(d);
}

/** Cached SerpAPI listings + saved snapshots not in current cache. */
export async function listJobsForUser(
  userId: string,
  resumeId: string | null,
): Promise<{
  cached: Job[];
  matches: JobMatch[];
  saved: SavedJob[];
  applied: AppliedJob[];
}> {
  const [cached, matches, saved, applied] = await Promise.all([
    prisma.job.findMany({
      where: { userId, isActive: 1 },
      orderBy: { scrapedAt: "desc" },
    }),
    resumeId
      ? prisma.jobMatch.findMany({
          where: { userId, resumeId },
        })
      : Promise.resolve([] as JobMatch[]),
    prisma.savedJob.findMany({ where: { userId } }),
    prisma.appliedJob.findMany({ where: { userId } }),
  ]);

  return { cached, matches, saved, applied };
}

export function buildJobListItems(
  cached: Job[],
  matches: JobMatch[],
  saved: SavedJob[],
  applied: AppliedJob[],
): JobListItem[] {
  const savedSet = new Set(saved.map((s) => s.jobExternalId));
  const appliedSet = new Set(applied.map((a) => a.jobExternalId));
  const matchMap = new Map(matches.map((m) => [m.jobId, m]));
  const byId = new Map<string, JobListItem>();

  for (const job of cached) {
    const match = matchMap.get(job.id);
    byId.set(job.id, {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.locationType,
      posted: postedLabel(job.postedAt),
      matchScore: match?.matchScore ?? null,
      matchReason: match?.matchReason ?? null,
      tags: safeJsonArray(job.requiredSkills),
      saved: savedSet.has(job.id),
      applied: appliedSet.has(job.id),
      url: job.url,
      source: job.source,
      fromCache: true,
    });
  }

  for (const s of saved) {
    if (byId.has(s.jobExternalId)) continue;
    const snap = snapshotFromSavedRow(s.snapshot, s.jobExternalId);
    if (!snap) continue;
    const match = matchMap.get(s.jobExternalId);
    byId.set(s.jobExternalId, {
      id: snap.id,
      title: snap.title,
      company: snap.company,
      location: snap.location,
      type: snap.locationType,
      posted: postedLabel(snap.postedAt),
      matchScore: match?.matchScore ?? null,
      matchReason: match?.matchReason ?? null,
      tags: snap.requiredSkills,
      saved: true,
      applied: appliedSet.has(s.jobExternalId),
      url: snap.url,
      source: snap.source || s.source,
      fromCache: false,
    });
  }

  return [...byId.values()];
}

export async function getCachedJobForUser(
  userId: string,
  jobId: string,
): Promise<Job | null> {
  return prisma.job.findFirst({
    where: { id: jobId, userId },
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
  if (saved) return snapshotFromSavedRow(saved.snapshot, jobId);

  return null;
}

export async function countUserCachedJobs(userId: string): Promise<number> {
  return prisma.job.count({
    where: { userId, isActive: 1 },
  });
}

/** Delete match rows for jobs no longer in this user's cache (after re-scrape). */
export async function pruneOrphanMatches(userId: string, validJobIds: string[]): Promise<void> {
  if (validJobIds.length === 0) {
    await prisma.jobMatch.deleteMany({ where: { userId } });
    return;
  }
  const all = await prisma.jobMatch.findMany({
    where: { userId },
    select: { id: true, jobId: true },
  });
  const valid = new Set(validJobIds);
  const orphanIds = all.filter((m) => !valid.has(m.jobId)).map((m) => m.id);
  if (orphanIds.length > 0) {
    await prisma.jobMatch.deleteMany({ where: { id: { in: orphanIds } } });
  }
}
