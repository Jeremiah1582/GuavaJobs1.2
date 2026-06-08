import { NextRequest, NextResponse } from "next/server";

import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import {
  generateRoleFitExplanation,
  profileToPreferences,
} from "@/lib/job-matcher";
import type { MatchBreakdown } from "@/lib/job-matcher/types";
import { getCachedJobForUser } from "@/lib/jobs-api";

function decodeJobId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;

    const userId = session.id;
    const { id: rawId } = await params;
    const jobId = decodeJobId(rawId);

    const resume = await prisma.resume.findFirst({
      where: { userId, isActive: 1 },
    });

    const [profile, job, match] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      getCachedJobForUser(userId, jobId),
      resume
        ? prisma.jobMatch.findFirst({
            where: { userId, jobId, resumeId: resume.id },
          })
        : Promise.resolve(null),
    ]);

    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    if (!match) {
      return NextResponse.json({ error: "No match data for this job." }, { status: 404 });
    }

    const breakdown = (match.matchBreakdownJson ?? {}) as MatchBreakdown;
    const roleFit = breakdown.roleFitsUser;

    if (!roleFit || roleFit.score === null) {
      return NextResponse.json({
        explanation: roleFit?.reason ?? "Add career preferences for role-fit scoring.",
      });
    }

    if (roleFit.explanation?.trim()) {
      return NextResponse.json({ explanation: roleFit.explanation });
    }

    const prefs = profileToPreferences(profile);
    const explanation = await generateRoleFitExplanation(prefs, roleFit, {
      title: job.title,
      company: job.company,
      location: job.location,
      locationType: job.locationType,
      description: job.description,
      requiredSkills: [],
    });

    const updatedBreakdown: MatchBreakdown = {
      ...breakdown,
      roleFitsUser: { ...roleFit, explanation },
    };

    await prisma.jobMatch.update({
      where: { id: match.id },
      data: { matchBreakdownJson: updatedBreakdown },
    });

    return NextResponse.json({ explanation });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    console.error("[jobs/explain-fit POST]", err);
    return NextResponse.json({ error: "Failed to generate explanation." }, { status: 500 });
  }
}
