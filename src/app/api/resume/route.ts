// src/app/api/resume/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/db";
import type { Resume } from "@/generated/prisma";

function scoreToGrade(score: number): string {
  return score >= 90 ? "A"  :
         score >= 80 ? "B+" :
         score >= 70 ? "B"  :
         score >= 60 ? "C+" :
         score >= 50 ? "C"  : "D";
}

function safeJSON<T>(raw: string | null | undefined, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseResume(r: Resume) {
  const meta = safeJSON<{
    sectionScores?: Record<string, number>;
    stats?: {
      wordCount: number;
      estimatedPages: number;
      bulletCount: number;
      quantifiedCount: number;
      weakVerbs: string[];
    };
    grade?: string;
    passesATS?: boolean;
    softSkills?: string[];
    missingKeywords?: string[];
  }>(r.metadata, {});

  const technicalSkills = safeJSON<string[]>(r.skills, []);
  const keywords        = safeJSON<string[]>(r.keywords, []);
  const strengths       = safeJSON<unknown[]>(r.strengths, []);
  const improvements    = safeJSON<unknown[]>(r.feedback, []);
  const experience      = safeJSON<unknown[]>(r.experience, []);
  const education       = safeJSON<unknown[]>(r.education, []);

  const grade     = meta.grade     ?? scoreToGrade(r.atsScore ?? 0);
  const passesATS = meta.passesATS ?? (r.atsScore ?? 0) >= 65;

  return {
    id:              r.id,
    filename:        r.filename,
    atsScore:        r.atsScore ?? 0,
    grade,
    passesATS,
    summary:         r.summary ?? "",
    technicalSkills,
    softSkills:      meta.softSkills     ?? [],
    skills:          technicalSkills,
    keywords,
    missingKeywords: meta.missingKeywords ?? [],
    strengths,
    improvements,
    sectionScores:   meta.sectionScores  ?? null,
    stats:           meta.stats          ?? null,
    experience,
    education,
  };
}

export async function GET() {
  try {
    const user = await requireAuth();
    const resume = await prisma.resume.findFirst({
      where: { userId: user.id, isActive: 1 },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json({ resume: resume ? parseResume(resume) : null });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch resume." }, { status: 500 });
  }
}
