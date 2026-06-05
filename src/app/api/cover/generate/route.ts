export const dynamic = "force-dynamic";

// src/app/api/cover/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { getPrisma } from "@/db";
import { complete, MODEL_SMART } from "@/lib/llm";
import { randomUUID } from "crypto";
import { resumeTextForAI } from "@/lib/pdf-extract.server";
import {
  buildJobListItems,
  listJobsForUser,
  resolveJobForUser,
} from "@/lib/jobs-api";

const TONES: Record<string, string> = {
  professional: "Write in a formal, confident, professional tone.",
  friendly: "Write in a warm, approachable, conversational tone while staying professional.",
  bold: "Write in a direct, punchy, high-impact tone that commands attention.",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const userId = session.id;
    const { jobId, tone = "professional" } = await req.json();

    if (!jobId)
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });

    const job = await resolveJobForUser(userId, jobId);
    if (!job)
      return NextResponse.json(
        { error: "Job not found. Scan or save the job first." },
        { status: 404 },
      );

    const resume = await getPrisma().resume.findFirst({
      where: { userId, isActive: 1 },
    });
    if (!resume)
      return NextResponse.json(
        { error: "Upload your resume first to generate a tailored cover letter." },
        { status: 400 },
      );

    const skills = JSON.parse(resume.skills) as string[];
    const requiredSkills = job.requiredSkills;

    const prompt = `Write a cover letter for this internship application. Return ONLY the letter.

Role: ${job.title} at ${job.company}
Required: ${requiredSkills.slice(0, 8).join(", ")}
Job description: ${job.description.slice(0, 800)}
Candidate skills: ${skills.slice(0, 10).join(", ")}
Resume summary: ${resume.summary?.slice(0, 300) ?? ""}
Resume highlights (all pages): ${resumeTextForAI(resume.rawText, 2500)}

Rules: ${TONES[tone] ?? TONES.professional} Open "Dear Hiring Manager,". 3 paragraphs, 250-300 words. Mention ${job.company} and role by name. Reference 2 specific matching skills. End "Sincerely," on its own line.`;

    const content = await complete(prompt, undefined, 0.5, MODEL_SMART, 600);

    const id = randomUUID();
    await getPrisma().legacyCoverLetter.create({
      data: {
        id,
        userId,
        jobId,
        resumeId: resume.id,
        content,
        tone,
      },
    });

    return NextResponse.json({
      success: true,
      id,
      content,
      jobTitle: job.title,
      company: job.company,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    console.error("[cover/generate]", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    const userId = session.id;

    const resume = await getPrisma().resume.findFirst({
      where: { userId, isActive: 1 },
    });

    const { cached, matches, saved, applied } = await listJobsForUser(
      userId,
      resume?.id ?? null,
    );
    const savedJobs = buildJobListItems(cached, matches, saved, applied)
      .filter((j) => j.saved)
      .map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        source: j.source,
        matchScore: j.matchScore,
      }));

    const letters = await getPrisma().legacyCoverLetter.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
    });

    const enriched = await Promise.all(
      letters.map(async (l) => {
        const job = await resolveJobForUser(userId, l.jobId);
        return {
          id: l.id,
          jobId: l.jobId,
          jobTitle: job?.title ?? "Unknown role",
          company: job?.company ?? "Unknown company",
          tone: l.tone,
          content: l.content,
          generatedAt: Number(l.generatedAt),
        };
      }),
    );

    return NextResponse.json({
      letters: enriched,
      savedJobs,
      hasResume: !!resume,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}
