// src/app/api/jobs/scrape/route.ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { scrapeRuns, jobs, jobMatches, resumes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { computeMatchScore, resetGroqCallCounter } from "@/lib/job-matcher";

async function getScraper() {
  const { scrapeAll } = await import("@/lib/scraper");
  return scrapeAll;
}

export async function GET() {
  try {
    await requireAuth();
    const latest = await db.query.scrapeRuns.findFirst({
      orderBy: (r, { desc }) => [desc(r.startedAt)],
    });
    return NextResponse.json({ run: latest ?? null });
  } catch {
    return NextResponse.json({ run: null });
  }
}

export async function POST() {
  try {
    const user = await requireAuth();

    const running = await db.query.scrapeRuns.findFirst({
      where: eq(scrapeRuns.status, "running"),
    });
    if (running)
      return NextResponse.json({ message: "Scrape already running." }, { status: 409 });

    const resume = await db.query.resumes.findFirst({
      where: and(eq(resumes.userId, user.id), eq(resumes.isActive, true)),
    });
    if (!resume)
      return NextResponse.json(
        { error: "Upload your resume first so we can find relevant jobs." },
        { status: 400 }
      );

    const runId = randomUUID();
    await db.insert(scrapeRuns).values({ id: runId, status: "running" });
    runScraper(runId, user.id, resume).catch(console.error);

    return NextResponse.json({ message: "Scrape started.", runId });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ error: "Failed to start scrape." }, { status: 500 });
  }
}

function buildQueries(resume: { skills: string; rawText: string }): string[] {
  const skills = JSON.parse(resume.skills) as string[];
  const queries: string[] = [];

  const is = (terms: string[]) => terms.some(t => skills.includes(t));

  if (is(["Machine Learning","Deep Learning","TensorFlow","PyTorch","NLP","Computer Vision"]))
    queries.push("machine learning internship", "AI internship");
  if (is(["React","Vue","Angular","Next.js","HTML","CSS","Tailwind"]))
    queries.push("frontend developer internship");
  if (is(["Node.js","Django","Flask","Spring Boot","FastAPI","Express","PostgreSQL","MongoDB"]))
    queries.push("backend developer internship");
  if (is(["Pandas","NumPy","SQL","Tableau","Power BI","Data Analysis","Data Science"]))
    queries.push("data science internship");
  if (is(["React Native","Flutter","Swift","Kotlin","iOS","Android"]))
    queries.push("mobile developer internship");
  if (is(["Docker","Kubernetes","AWS","Azure","GCP","CI/CD"]))
    queries.push("devops internship");

  // Top 2 hard skills as direct queries
  const hard = skills.filter(s =>
    !["Communication","Leadership","Teamwork","Problem Solving","Agile","Scrum"].includes(s)
  ).slice(0, 2);
  hard.forEach(s => queries.push(`${s} internship`));

  queries.push("software engineering internship");
  return [...new Set(queries)].slice(0, 6);
}

async function runScraper(
  runId: string,
  userId: string,
  resume: { id: string; skills: string; rawText: string; summary: string | null }
) {
  try {
    const queries = buildQueries(resume);
    console.log(`[scrape] Queries: ${queries.join(" | ")}`);

    const scrapeAll = await getScraper();
    const scraped   = await scrapeAll({ queries });
    console.log(`[scrape] ${scraped.length} jobs fetched`);

    const skills = JSON.parse(resume.skills) as string[];
    resetGroqCallCounter();

    // Insert + score concurrently — score each job right after it's inserted
    // This means the first scored jobs appear in the UI within seconds
    let inserted = 0;
    let scored = 0;

    const BATCH = 3;
    const DELAY = 1500;

    for (let i = 0; i < scraped.length; i += BATCH) {
      await Promise.all(
        scraped.slice(i, i + BATCH).map(async (job) => {
          let jobId: string | null = null;

          // Insert job
          try {
            jobId = randomUUID();
            await db.insert(jobs).values({
              id: jobId,
              title: job.title, company: job.company,
              location: job.location, locationType: job.locationType,
              description: job.description, url: job.url,
              source: job.source,
              requiredSkills: JSON.stringify(job.requiredSkills),
              postedAt: job.postedAt ? new Date(job.postedAt) : undefined,
              isActive: true,
            });
            inserted++;
          } catch {
            // Duplicate URL — find the existing job's id to still score it
            const existing = await db.query.jobs.findFirst({
              where: eq(jobs.url, job.url),
            });
            jobId = existing?.id ?? null;
          }

          // Score immediately after insert (or for existing job if not yet scored)
          if (jobId) {
            const alreadyScored = await db.query.jobMatches.findFirst({
              where: and(eq(jobMatches.jobId, jobId), eq(jobMatches.resumeId, resume.id)),
            });
            if (!alreadyScored) {
              try {
                const { score, reason } = await computeMatchScore(
                  skills, resume.rawText,
                  job.title, job.description,
                  job.requiredSkills,
                );
                await db.insert(jobMatches).values({
                  id: randomUUID(), userId,
                  jobId, resumeId: resume.id,
                  matchScore: score, matchReason: reason,
                });
                scored++;
              } catch { /* non-fatal */ }
            }
          }
        })
      );

      if (i + BATCH < scraped.length) {
        await new Promise(r => setTimeout(r, DELAY));
      }
    }

    console.log(`[scrape] ${inserted} inserted, ${scored} scored`);

    await db.update(scrapeRuns)
      .set({ status: "done", finishedAt: new Date(), jobsFound: inserted })
      .where(eq(scrapeRuns.id, runId));

  } catch (err: any) {
    console.error("[scrape] Fatal:", err);
    await db.update(scrapeRuns)
      .set({ status: "error", finishedAt: new Date(), error: err.message })
      .where(eq(scrapeRuns.id, runId));
  }
}