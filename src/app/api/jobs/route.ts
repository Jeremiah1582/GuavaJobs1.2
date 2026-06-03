// src/app/api/jobs/route.ts — real listings from per-user SerpAPI cache
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/db";
import {
  buildJobListItems,
  clearStaleScrapeRuns,
  listJobsForUser,
} from "@/lib/jobs-api";

export async function GET(req: NextRequest) {
  try {
    await clearStaleScrapeRuns();
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() ?? "";
    const filter = searchParams.get("filter") ?? "all";

    const resume = await prisma.resume.findFirst({
      where: { userId: user.id, isActive: 1 },
    });

    const { cached, matches, saved, applied } = await listJobsForUser(
      user.id,
      resume?.id ?? null,
    );

    let result = buildJobListItems(cached, matches, saved, applied);

    if (filter === "remote") result = result.filter((j) => j.type === "Remote");
    else if (filter === "hybrid") result = result.filter((j) => j.type === "Hybrid");
    else if (filter === "onsite")
      result = result.filter((j) => j.type === "On-site");

    if (search) {
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(search) ||
          j.company.toLowerCase().includes(search) ||
          j.tags.some((t) => t.toLowerCase().includes(search)),
      );
    }

    result.sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

    return NextResponse.json({
      jobs: result,
      hasResume: !!resume,
      total: result.length,
      cachedCount: cached.length,
      needsScan: cached.length === 0,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    console.error("[jobs GET]", err);
    return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}
