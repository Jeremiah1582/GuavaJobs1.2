import { randomUUID } from "crypto";

import type { JobCategory, PrismaClient, RoleFamily } from "@/generated/prisma";
import { epochMsNow } from "@/lib/epoch-ms";
import { ingestCuratedAtsBoards } from "@/lib/jobs/ats/ingest";
import { classifyJobTitle } from "@/lib/jobs/taxonomy/classify-title";
import type { ScrapedJob } from "@/lib/scraper";

type Db = Pick<PrismaClient, "$transaction" | "job" | "scrapeRun">;

const ATS_SYNC_TAG = "[ats-sync]";
const SYNC_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MIN_GLOBAL_JOBS = 500;

type TaxonomyFields = {
  jobCategory: JobCategory;
  roleFamily: RoleFamily;
};

function taxonomyFor(job: ScrapedJob): TaxonomyFields {
  return classifyJobTitle(job.title, job.description);
}

function jobRowFromScraped(job: ScrapedJob, scrapedAt: bigint) {
  const { jobCategory, roleFamily } = taxonomyFor(job);
  const postedAt = job.postedAt
    ? BigInt(new Date(job.postedAt).getTime())
    : null;

  return {
    userId: null as string | null,
    title: job.title,
    company: job.company,
    companyLogoUrl: null as string | null,
    location: job.location,
    locationType: job.locationType,
    description: job.description,
    url: job.url,
    source: job.source,
    requiredSkills: JSON.stringify(job.requiredSkills),
    postedAt,
    isActive: 1,
    scrapedAt,
    jobCategory,
    roleFamily,
  };
}

const UPSERT_BATCH = 50;

export async function upsertGlobalJobCache(
  db: Db,
  jobs: ScrapedJob[],
): Promise<number> {
  if (jobs.length === 0) return 0;

  const scrapedAt = epochMsNow();
  for (let i = 0; i < jobs.length; i += UPSERT_BATCH) {
    const batch = jobs.slice(i, i + UPSERT_BATCH);
    await db.$transaction(
      async (tx) => {
        for (const job of batch) {
          const data = jobRowFromScraped(job, scrapedAt);
          await tx.job.upsert({
            where: { id: job.id },
            create: { id: job.id, ...data },
            update: data,
          });
        }
      },
      { timeout: 30_000 },
    );
  }

  return jobs.length;
}

export async function staleGlobalAtsJobs(
  db: Db,
  activeIds: string[],
): Promise<number> {
  const active = new Set(activeIds);
  const candidates = await db.job.findMany({
    where: {
      userId: null,
      isActive: 1,
      OR: [{ id: { startsWith: "gh_" } }, { id: { startsWith: "lever_" } }],
    },
    select: { id: true },
  });

  const staleIds = candidates.map((j) => j.id).filter((id) => !active.has(id));
  if (staleIds.length === 0) return 0;

  const result = await db.job.updateMany({
    where: { id: { in: staleIds } },
    data: { isActive: 0 },
  });
  return result.count;
}

export type GlobalAtsSyncResult = {
  jobsFound: number;
  durationMs: number;
  staled: number;
};

export async function syncGlobalAtsJobs(db: Db): Promise<GlobalAtsSyncResult> {
  const started = Date.now();
  const jobs = await ingestCuratedAtsBoards();
  const upserted = await upsertGlobalJobCache(db, jobs);
  const staled = await staleGlobalAtsJobs(db, jobs.map((j) => j.id));

  return {
    jobsFound: upserted,
    durationMs: Date.now() - started,
    staled,
  };
}

let syncInFlight: Promise<GlobalAtsSyncResult> | null = null;

/** Fire-and-forget ATS sync when index is stale or thin. */
export async function maybeSyncGlobalAtsJobs(db: Db): Promise<void> {
  const running = await db.scrapeRun.findFirst({
    where: { status: "running", error: { startsWith: ATS_SYNC_TAG } },
  });
  if (running) return;

  const globalCount = await db.job.count({
    where: { userId: null, isActive: 1 },
  });

  const latest = await db.scrapeRun.findFirst({
    where: { error: { startsWith: ATS_SYNC_TAG } },
    orderBy: { startedAt: "desc" },
  });

  const lastMs = latest?.finishedAt ? Number(latest.finishedAt) : 0;
  const stale = Date.now() - lastMs > SYNC_MAX_AGE_MS;
  if (!stale && globalCount >= MIN_GLOBAL_JOBS) return;

  if (syncInFlight) {
    await syncInFlight.catch(() => {});
    return;
  }

  const runId = randomUUID();
  await db.scrapeRun.create({
    data: {
      id: runId,
      status: "running",
      error: `${ATS_SYNC_TAG} auto`,
    },
  });

  syncInFlight = (async () => {
    try {
      const result = await syncGlobalAtsJobs(db);
      await db.scrapeRun.update({
        where: { id: runId },
        data: {
          status: "done",
          finishedAt: epochMsNow(),
          jobsFound: result.jobsFound,
          error: ATS_SYNC_TAG,
        },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.scrapeRun.update({
        where: { id: runId },
        data: {
          status: "error",
          finishedAt: epochMsNow(),
          error: `${ATS_SYNC_TAG} ${message}`,
        },
      });
      throw err;
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight.catch((err) => console.error("[ats-sync]", err));
}
