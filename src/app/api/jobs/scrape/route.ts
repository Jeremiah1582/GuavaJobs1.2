// src/app/api/jobs/scrape/route.ts — SerpAPI wider scan (global merge)
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import { epochMsNow, epochMsToIso } from "@/lib/epoch-ms";
import { rescoreJobIds } from "@/lib/jobs/rescore-matches";
import { appendLevelSuffix, buildScrapeQueries } from "@/lib/jobs/scrape-queries";
import { clearStaleScrapeRuns } from "@/lib/jobs/scrape-runs";
import {
  countGlobalActiveJobs,
  findGlobalJobIdsByQueryHash,
  hashScrapeOverrides,
  mergeSerpApiIntoGlobalCache,
} from "@/lib/jobs/serp-cache";
import { scrapeSerpApiOnly } from "@/lib/scraper";
import { getSerpApiKey } from "@/lib/serpapi-jobs";
import { COUNTRY_SERPAPI, type ExperienceLevel } from "@/lib/validators/jobs";
import {
  scrapeOverridesSchema,
  type ScrapeOverrides,
} from "@/lib/validators/saved-job-searches";
import type { ProfileImportMeta } from "@/lib/validators/profile";

const SERP_SYNC_TAG = "[serp-sync]";

export async function GET() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();
    const latest = await prisma.scrapeRun.findFirst({
      where: { error: { startsWith: SERP_SYNC_TAG } },
      orderBy: { startedAt: "desc" },
    });
    const jobCount = await countGlobalActiveJobs();
    return NextResponse.json({
      run: latest
        ? {
            ...latest,
            startedAt: epochMsToIso(latest.startedAt),
            finishedAt: epochMsToIso(latest.finishedAt),
          }
        : null,
      jobCount,
    });
  } catch {
    return NextResponse.json({ run: null, jobCount: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();

    const running = await prisma.scrapeRun.findFirst({
      where: { status: "running", error: { startsWith: SERP_SYNC_TAG } },
    });
    if (running) {
      return NextResponse.json(
        { error: "A wider scan is already in progress." },
        { status: 409 },
      );
    }

    if (!getSerpApiKey()) {
      return NextResponse.json(
        {
          error:
            "SERPAPI_API_KEY is not set. Add it to .env.local to scan wider via Google Jobs.",
        },
        { status: 400 },
      );
    }

    let overrides: ScrapeOverrides | undefined;
    try {
      const text = await req.text();
      if (text.trim()) {
        const parsed = scrapeOverridesSchema.safeParse(JSON.parse(text));
        if (parsed.success) overrides = parsed.data;
      }
    } catch {
      /* empty body ok */
    }

    const queryHash = hashScrapeOverrides(overrides);
    const cachedIds = await findGlobalJobIdsByQueryHash(queryHash);
    if (cachedIds.length > 0) {
      return NextResponse.json({
        message: "Using cached wider-scan results for this query.",
        runId: null,
        queryHash,
        jobIds: cachedIds,
        cached: true,
      });
    }

    const runId = randomUUID();
    await prisma.scrapeRun.create({
      data: { id: runId, status: "running", error: `${SERP_SYNC_TAG} hash=${queryHash}` },
    });

    runSerpWider(runId, session.id, overrides, queryHash).catch(console.error);

    return NextResponse.json({ message: "Wider scan started.", runId, queryHash });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    console.error("[jobs/scrape POST]", err);
    return NextResponse.json({ error: "Failed to start wider scan." }, { status: 500 });
  }
}

async function runSerpWider(
  runId: string,
  userId: string,
  overrides: ScrapeOverrides | undefined,
  queryHash: string,
) {
  try {
    const [resume, profile] = await Promise.all([
      prisma.resume.findFirst({ where: { userId, isActive: 1 } }),
      prisma.profile.findUnique({ where: { userId } }),
    ]);

    const meta = (profile?.importMetaJson as ProfileImportMeta | null) ?? null;
    const dsp = meta?.searchProfile;
    const level: ExperienceLevel = overrides?.experienceLevel ?? "ANY";

    let baseQueries: string[];
    if (overrides?.q?.trim()) {
      baseQueries = [overrides.q.trim()];
    } else if (dsp?.primaryRoles?.length) {
      baseQueries = dsp.primaryRoles.slice(0, 4);
    } else if (resume) {
      baseQueries = buildScrapeQueries(resume, overrides);
    } else if (profile?.skills?.length) {
      baseQueries = buildScrapeQueries(
        { skills: JSON.stringify(profile.skills), rawText: "" },
        overrides,
      );
    } else {
      baseQueries = ["software engineer"];
    }

    const queries = appendLevelSuffix(baseQueries, level);
    const countryOpts = overrides?.country
      ? (COUNTRY_SERPAPI[overrides.country] ?? {})
      : {};

    const scraped = await scrapeSerpApiOnly({
      queries,
      serpApi: overrides
        ? {
            location: overrides.where ?? countryOpts.location,
            gl: countryOpts.gl ?? overrides.country,
            maxDaysOld: overrides.maxDaysOld,
          }
        : undefined,
      experienceLevel: level,
    });

    if (scraped.length === 0) {
      await prisma.scrapeRun.update({
        where: { id: runId },
        data: {
          status: "done",
          finishedAt: epochMsNow(),
          jobsFound: 0,
          error: `${SERP_SYNC_TAG} hash=${queryHash} empty`,
        },
      });
      return;
    }

    const { count, jobIds } = await mergeSerpApiIntoGlobalCache(queryHash, scraped);

    if (resume) {
      await rescoreJobIds({
        userId,
        resumeId: resume.id,
        jobIds,
        isCareerChange: dsp?.isCareerChange === true,
      });
    }

    await prisma.scrapeRun.update({
      where: { id: runId },
      data: {
        status: "done",
        finishedAt: epochMsNow(),
        jobsFound: count,
        error: `${SERP_SYNC_TAG} hash=${queryHash}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[serp-sync] Fatal:", err);
    await prisma.scrapeRun.update({
      where: { id: runId },
      data: {
        status: "error",
        finishedAt: epochMsNow(),
        error: `${SERP_SYNC_TAG} hash=${queryHash} ${message}`,
      },
    });
  }
}
