// src/app/api/cover/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { coverLetters, jobs, resumes } from "@/db/schema";
import { complete, MODEL_SMART } from "@/lib/groq";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const TONES: Record<string, string> = {
  professional: "Write in a formal, confident, professional tone.",
  friendly: "Write in a warm, approachable, conversational tone while staying professional.",
  bold: "Write in a direct, punchy, high-impact tone that commands attention.",
};

// POST — generate a new cover letter
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { jobId, tone = "professional" } = await req.json();

    if (!jobId)
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });

    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
    if (!job)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.userId, user.id), eq(resumes.isActive, true)),
    });
    if (!resume)
      return NextResponse.json(
        { error: "Upload your resume first to generate a tailored cover letter." },
        { status: 400 }
      );

    const skills = JSON.parse(resume.skills) as string[];
    const requiredSkills = JSON.parse(job.requiredSkills) as string[];

    const prompt = `Write a cover letter for this internship application. Return ONLY the letter.

Role: ${job.title} at ${job.company}
Required: ${requiredSkills.slice(0, 8).join(", ")}
Job description: ${job.description.slice(0, 800)}
Candidate skills: ${skills.slice(0, 10).join(", ")}
Resume summary: ${resume.summary?.slice(0, 300) ?? ""}

Rules: ${TONES[tone] ?? TONES.professional} Open "Dear Hiring Manager,". 3 paragraphs, 250-300 words. Mention ${job.company} and role by name. Reference 2 specific matching skills. End "Sincerely," on its own line.`;

    const content = await complete(prompt, undefined, 0.5, MODEL_SMART, 600);

    const id = randomUUID();
    await db.insert(coverLetters).values({
      id, userId: user.id, jobId, resumeId: resume.id, content, tone,
    });

    return NextResponse.json({ success: true, id, content, jobTitle: job.title, company: job.company });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    console.error("[cover/generate]", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}

// GET — list all cover letters for this user
export async function GET() {
  try {
    const user = await requireAuth();
    const letters = await db.query.coverLetters.findMany({
      where: eq(coverLetters.userId, user.id),
      with: { job: true },
      orderBy: (cl, { desc }) => [desc(cl.generatedAt)],
    });

    return NextResponse.json({
      letters: letters.map((l) => ({
        id: l.id,
        jobId: l.jobId,
        jobTitle: l.job.title,
        company: l.job.company,
        tone: l.tone,
        content: l.content,
        generatedAt: l.generatedAt,
      })),
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }
}