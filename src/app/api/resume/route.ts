// src/app/api/resume/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { resumes } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// ─── Grade helper (must match upload route) ───────────────────────────────────
function scoreToGrade(score: number): string {
  return score >= 90 ? "A"  :
         score >= 80 ? "B+" :
         score >= 70 ? "B"  :
         score >= 60 ? "C+" :
         score >= 50 ? "C"  : "D";
}

// ─── Safe JSON parse with fallback ────────────────────────────────────────────
function safeJSON<T>(raw: string | null | undefined, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Parse DB row into full ResumeResult shape ────────────────────────────────
function parseResume(r: typeof resumes.$inferSelect) {
  // metadata column stores: { sectionScores, stats, grade, passesATS, softSkills }
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

  // grade and passesATS: prefer stored meta, fallback to recalculate from atsScore
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

// ─── GET /api/resume ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const user = await requireAuth();
    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.userId, user.id), eq(resumes.isActive, true)),
      orderBy: (r, { desc }) => [desc(r.uploadedAt)],
    });
    return NextResponse.json({ resume: resume ? parseResume(resume) : null });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch resume." }, { status: 500 });
  }
}