import { createHash } from "crypto";

import { prisma } from "@/db";
import { epochMsNow } from "@/lib/epoch-ms";
import { classifyJobTitle } from "@/lib/jobs/taxonomy/classify-title";
import type { ScrapedJob } from "@/lib/scraper";
import type { ScrapeOverrides } from "@/lib/validators/saved-job-searches";

export function hashScrapeOverrides(overrides?: ScrapeOverrides): string {
  const payload = JSON.stringify(overrides ?? {});
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export async function countGlobalActiveJobs(): Promise<number> {
  return prisma.job.count({
    where: { userId: null, isActive: 1 },
  });
}

export async function findGlobalJobIdsByQueryHash(
  queryHash: string,
): Promise<string[]> {
  const marker = `[serp-sync] hash=${queryHash}`;
  const run = await prisma.scrapeRun.findFirst({
    where: { status: "done", error: { contains: marker } },
    orderBy: { finishedAt: "desc" },
  });
  if (!run) return [];

  const jobs = await prisma.job.findMany({
    where: {
      userId: null,
      isActive: 1,
      id: { startsWith: "serpapi_" },
      scrapedAt: { gte: run.startedAt },
    },
    select: { id: true },
    take: 200,
  });
  return jobs.map((j) => j.id);
}

export async function mergeSerpApiIntoGlobalCache(
  queryHash: string,
  scraped: ScrapedJob[],
): Promise<{ count: number; jobIds: string[] }> {
  const scrapedAt = epochMsNow();
  const jobIds: string[] = [];

  for (const job of scraped) {
    const { jobCategory, roleFamily } = classifyJobTitle(job.title, job.description);
    const postedAt = job.postedAt
      ? BigInt(new Date(job.postedAt).getTime())
      : null;

    const data = {
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

    await prisma.job.upsert({
      where: { id: job.id },
      create: { id: job.id, ...data },
      update: data,
    });
    jobIds.push(job.id);
  }

  return { count: jobIds.length, jobIds };
}
