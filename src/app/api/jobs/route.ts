// src/app/api/jobs/route.ts — global job index + per-user matches/saved state
import { NextRequest, NextResponse } from "next/server";

import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import { loadJobsDashboard } from "@/lib/jobs/load-jobs-dashboard";
import { clearStaleScrapeRuns } from "@/lib/jobs/scrape-runs";
import { triggerLazyRescore } from "@/lib/jobs/rescore-matches";
import { getSerpApiKey } from "@/lib/serpapi-jobs";
import { experienceLevelSchema, jobCountrySchema } from "@/lib/validators/jobs";

const WORK_MODES = new Set(["all", "remote", "hybrid", "onsite"]);
const WIDER_SCAN_THRESHOLD = 15;

export async function GET(req: NextRequest) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();
    const userId = session.id;
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || undefined;
    const modeParam = searchParams.get("mode");
    const mode =
      modeParam === "search"
        ? "search"
        : modeParam === "recommended"
          ? "recommended"
          : q
            ? "search"
            : "recommended";

    const levelRaw =
      searchParams.get("level") ?? searchParams.get("experienceLevel");
    const experienceLevelParsed = experienceLevelSchema.safeParse(levelRaw);
    const experienceLevel = experienceLevelParsed.success
      ? experienceLevelParsed.data
      : null;

    const workModeRaw = searchParams.get("workMode") ?? searchParams.get("filter") ?? "all";
    const workMode = WORK_MODES.has(workModeRaw)
      ? (workModeRaw as "all" | "remote" | "hybrid" | "onsite")
      : "all";

    const countryParsed = jobCountrySchema.safeParse(searchParams.get("country"));
    const country = countryParsed.success ? countryParsed.data : null;

    const where = searchParams.get("where")?.trim() || undefined;

    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "100", 10) || 100),
    );
    const offset = Math.max(
      0,
      Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    );

    const loaded = await loadJobsDashboard(userId, {
      q,
      mode,
      experienceLevel,
      workMode: workMode === "all" ? undefined : workMode,
      country,
      where,
      limit,
      offset,
    });

    const result = loaded.jobs;
    const searchProfile = loaded.searchProfile;

    const resume = await prisma.resume.findFirst({
      where: { userId, isActive: 1 },
    });

    if (resume) {
      const unscoredIds = result
        .filter((j) => j.overallFitScore === null)
        .slice(0, 30)
        .map((j) => j.id);
      triggerLazyRescore(
        userId,
        resume.id,
        unscoredIds,
        searchProfile?.isCareerChange === true,
      );
    }

    const needsWiderScan =
      result.length < WIDER_SCAN_THRESHOLD && Boolean(getSerpApiKey());

    return NextResponse.json({
      jobs: result,
      hasResume: !!resume,
      hasSearchProfile: !!searchProfile,
      searchProfile: searchProfile ?? undefined,
      mode,
      widenedFamilies: loaded.widenedFamilies,
      total: result.length,
      cachedCount: loaded.globalJobCount,
      needsScan: loaded.globalJobCount === 0,
      needsWiderScan,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    console.error("[jobs GET]", err);
    return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}
