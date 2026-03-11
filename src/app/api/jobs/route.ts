// src/app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { jobs, jobMatches, savedJobs, resumes } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() ?? "";
    const filter = searchParams.get("filter") ?? "all";

    // Active resume for match scores
    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.userId, user.id), eq(resumes.isActive, true)),
    });

    // All active jobs
    const allJobs = await db.query.jobs.findMany({
      where: eq(jobs.isActive, true),
      orderBy: [desc(jobs.scrapedAt)],
    });

    // Match scores (only exist if resume uploaded)
    const matches = resume
      ? await db.query.jobMatches.findMany({
          where: and(eq(jobMatches.userId, user.id), eq(jobMatches.resumeId, resume.id)),
        })
      : [];

    // Saved job IDs
    const saved = await db.query.savedJobs.findMany({
      where: eq(savedJobs.userId, user.id),
    });
    const savedSet = new Set(saved.map((s) => s.jobId));
    const matchMap = new Map(matches.map((m) => [m.jobId, m]));

    let result = allJobs.map((job) => {
      const match = matchMap.get(job.id);
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.locationType,
        posted: job.postedAt ? relativeTime(new Date(job.postedAt)) : "Recently",
        matchScore: match?.matchScore ?? null,
        matchReason: match?.matchReason ?? null,
        tags: JSON.parse(job.requiredSkills) as string[],
        saved: savedSet.has(job.id),
        url: job.url,
        source: job.source,
      };
    });

    // Filter by location type
    if (filter === "remote") result = result.filter((j) => j.type === "Remote");
    else if (filter === "hybrid") result = result.filter((j) => j.type === "Hybrid");
    else if (filter === "onsite") result = result.filter((j) => j.type === "On-site");

    // Search
    if (search) {
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(search) ||
          j.company.toLowerCase().includes(search) ||
          j.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    // Sort by match score desc (nulls last)
    result.sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

    return NextResponse.json({ jobs: result, hasResume: !!resume, total: result.length });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}