import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/db";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { epochMsNow, epochMsToIso } from "@/lib/epoch-ms";
import { syncGlobalAtsJobs } from "@/lib/jobs/global-sync";
import { clearStaleScrapeRuns } from "@/lib/jobs/scrape-runs";

const ATS_SYNC_TAG = "[ats-sync]";
const RATE_LIMIT_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();

    const latest = await prisma.scrapeRun.findFirst({
      where: { error: { startsWith: ATS_SYNC_TAG } },
      orderBy: { startedAt: "desc" },
    });

    const globalCount = await prisma.job.count({
      where: { userId: null, isActive: 1 },
    });

    return NextResponse.json({
      run: latest
        ? {
            ...latest,
            startedAt: epochMsToIso(latest.startedAt),
            finishedAt: epochMsToIso(latest.finishedAt),
          }
        : null,
      globalJobCount: globalCount,
    });
  } catch {
    return NextResponse.json({ run: null, globalJobCount: 0 });
  }
}

export async function POST() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();

    const running = await prisma.scrapeRun.findFirst({
      where: { status: "running", error: { startsWith: ATS_SYNC_TAG } },
    });
    if (running) {
      return NextResponse.json(
        { error: "Job index refresh is already running." },
        { status: 409 },
      );
    }

    const latest = await prisma.scrapeRun.findFirst({
      where: { status: "done", error: { startsWith: ATS_SYNC_TAG } },
      orderBy: { finishedAt: "desc" },
    });
    if (
      latest?.finishedAt &&
      Date.now() - Number(latest.finishedAt) < RATE_LIMIT_MS
    ) {
      return NextResponse.json({
        message: "Job index was refreshed recently.",
        runId: latest.id,
      });
    }

    const runId = randomUUID();
    await prisma.scrapeRun.create({
      data: { id: runId, status: "running", error: ATS_SYNC_TAG },
    });

    void (async () => {
      try {
        const result = await syncGlobalAtsJobs();
        await prisma.scrapeRun.update({
          where: { id: runId },
          data: {
            status: "done",
            finishedAt: epochMsNow(),
            jobsFound: result.jobsFound,
            error: ATS_SYNC_TAG,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.scrapeRun.update({
          where: { id: runId },
          data: {
            status: "error",
            finishedAt: epochMsNow(),
            error: `${ATS_SYNC_TAG} ${message}`,
          },
        });
      }
    })();

    return NextResponse.json({ message: "Refreshing job index.", runId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not refresh job index." }, { status: 500 });
  }
}
