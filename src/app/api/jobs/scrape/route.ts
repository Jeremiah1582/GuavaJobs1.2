export const dynamic = "force-dynamic";

// src/app/api/jobs/scrape/route.ts
import { NextResponse } from "next/server";
import {
  getLegacyApiSession,
  isSessionResponse,
} from "@/lib/auth/legacy-api-session";
import { prisma } from "@/db";
import { randomUUID } from "crypto";
import { computeMatchScore, resetGroqCallCounter } from "@/lib/job-matcher";
import {
  clearStaleScrapeRuns,
  countUserCachedJobs,
  pruneOrphanMatches,
  replaceUserJobCache,
} from "@/lib/jobs-api";
import { epochMsNow, epochMsToIso } from "@/lib/epoch-ms";
import { getSerpApiKey } from "@/lib/serpapi-jobs";

async function getScraper() {
  const { scrapeAll } = await import("@/lib/scraper");
  return scrapeAll;
}

export async function GET() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();
    const latest = await prisma.scrapeRun.findFirst({
      orderBy: { startedAt: "desc" },
    });
    const jobCount = await countUserCachedJobs(session.id);
    return NextResponse.json({
      run: latest
        ? {
            ...latest,
            startedAt: epochMsToIso(latest.startedAt),
            finishedAt: epochMsToIso(latest.finishedAt),
          }
        : null,
      jobCount,
    });
  } catch {
    return NextResponse.json({ run: null, jobCount: 0 });
  }
}

export async function POST() {
  try {
    const session = await getLegacyApiSession();
    if (isSessionResponse(session)) return session;
    await clearStaleScrapeRuns();

    const running = await prisma.scrapeRun.findFirst({
      where: { status: "running" },
    });
    if (running) {
      return NextResponse.json(
        { error: "A scan is already in progress. Wait for it to finish." },
        { status: 409 },
      );
    }

    if (!getSerpApiKey()) {
      return NextResponse.json(
        {
          error:
            "SERPAPI_API_KEY is not set. Add it to .env.local to fetch real Google Jobs listings.",
        },
        { status: 400 },
      );
    }

    const resume = await prisma.resume.findFirst({
      where: { userId: session.id, isActive: 1 },
    });
    if (!resume) {
      return NextResponse.json(
        { error: "Upload your resume first so we can find relevant jobs." },
        { status: 400 },
      );
    }

    const runId = randomUUID();
    await prisma.scrapeRun.create({ data: { id: runId, status: "running" } });
    runScraper(runId, session.id, resume).catch(console.error);

    return NextResponse.json({ message: "Scrape started.", runId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    console.error("[jobs/scrape POST]", err);
    return NextResponse.json({ error: "Failed to start scrape." }, { status: 500 });
  }
}

function buildQueries(resume: { skills: string; rawText: string }): string[] {
  let skills: string[] = [];
  try {
    skills = JSON.parse(resume.skills || "[]") as string[];
    if (!Array.isArray(skills)) skills = [];
  } catch {
    skills = [];
  }

  const queries: string[] = [];
  const is = (terms: string[]) =>
    terms.some((t) => skills.some((s) => s.toLowerCase() === t.toLowerCase()));

  if (
    is([
      "Machine Learning",
      "Deep Learning",
      "TensorFlow",
      "PyTorch",
      "NLP",
      "Computer Vision",
    ])
  ) {
    queries.push("machine learning internship", "AI internship");
  }
  if (is(["React", "Vue", "Angular", "Next.js", "HTML", "CSS", "Tailwind"])) {
    queries.push("frontend developer internship");
  }
  if (
    is([
      "Node.js",
      "Django",
      "Flask",
      "Spring Boot",
      "FastAPI",
      "Express",
      "PostgreSQL",
      "MongoDB",
    ])
  ) {
    queries.push("backend developer internship");
  }
  if (
    is([
      "Pandas",
      "NumPy",
      "SQL",
      "Tableau",
      "Power BI",
      "Data Analysis",
      "Data Science",
    ])
  ) {
    queries.push("data science internship");
  }
  if (is(["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android"])) {
    queries.push("mobile developer internship");
  }
  if (is(["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD"])) {
    queries.push("devops internship");
  }

  const hard = skills
    .filter(
      (s) =>
        ![
          "Communication",
          "Leadership",
          "Teamwork",
          "Problem Solving",
          "Agile",
          "Scrum",
        ].includes(s),
    )
    .slice(0, 2);
  hard.forEach((s) => queries.push(`${s} internship`));

  queries.push("software engineering internship", "entry level software internship");

  const unique = [...new Set(queries)].slice(0, 6);
  return unique.length > 0 ? unique : ["software engineering internship"];
}

async function runScraper(
  runId: string,
  userId: string,
  resume: { id: string; skills: string; rawText: string; summary: string | null },
) {
  try {
    const queries = buildQueries(resume);
    console.log(`[scrape] Queries: ${queries.join(" | ")}`);

    const scrapeAll = await getScraper();
    const scraped = await scrapeAll({ queries });
    console.log(`[scrape] ${scraped.length} jobs from SerpAPI`);

    if (scraped.length === 0) {
      await replaceUserJobCache(userId, []);
      await prisma.scrapeRun.update({
        where: { id: runId },
        data: {
          status: "done",
          finishedAt: epochMsNow(),
          jobsFound: 0,
          error:
            "No jobs returned from Google Jobs (SerpAPI). Check SERPAPI_API_KEY, quota, and try SERPAPI_LOCATION in .env.local (e.g. United Kingdom).",
        },
      });
      return;
    }

    const cached = await replaceUserJobCache(userId, scraped);
    const jobIds = scraped.map((j) => j.id);
    await pruneOrphanMatches(userId, jobIds);

    let skills: string[] = [];
    try {
      skills = JSON.parse(resume.skills) as string[];
    } catch {
      skills = [];
    }
    resetGroqCallCounter();

    let scored = 0;
    const BATCH = 3;
    const DELAY = 1500;

    for (let i = 0; i < scraped.length; i += BATCH) {
      await Promise.all(
        scraped.slice(i, i + BATCH).map(async (job) => {
          const alreadyScored = await prisma.jobMatch.findFirst({
            where: { jobId: job.id, resumeId: resume.id },
          });
          if (alreadyScored) return;

          try {
            const { score, reason } = await computeMatchScore(
              skills,
              resume.rawText,
              job.title,
              job.description,
              job.requiredSkills,
            );
            await prisma.jobMatch.create({
              data: {
                id: randomUUID(),
                userId,
                jobId: job.id,
                resumeId: resume.id,
                matchScore: score,
                matchReason: reason,
              },
            });
            scored++;
          } catch {
            /* non-fatal */
          }
        }),
      );

      if (i + BATCH < scraped.length) {
        await new Promise((r) => setTimeout(r, DELAY));
      }
    }

    console.log(`[scrape] ${cached} cached, ${scored} scored`);

    await prisma.scrapeRun.update({
      where: { id: runId },
      data: { status: "done", finishedAt: epochMsNow(), jobsFound: cached },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape] Fatal:", err);
    await prisma.scrapeRun.update({
      where: { id: runId },
      data: { status: "error", finishedAt: epochMsNow(), error: message },
    });
  }
}
