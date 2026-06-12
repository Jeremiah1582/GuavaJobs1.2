import { randomUUID } from "crypto";

import { prisma } from "@/db";
import { computeJobMatch, resetGroqCallCounter } from "@/lib/job-matcher";

function parseSkills(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function parseRequiredSkills(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export type RescoreOptions = {
  userId: string;
  resumeId: string;
  /** Re-score even if a match row already exists */
  force?: boolean;
};

export async function rescoreUserJobMatches({
  userId,
  resumeId,
  force = false,
}: RescoreOptions): Promise<number> {
  const [resume, profile, jobs] = await Promise.all([
    prisma.resume.findFirst({ where: { id: resumeId, userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.job.findMany({ where: { userId, isActive: 1 } }),
  ]);

  if (!resume || jobs.length === 0) return 0;

  const skills = parseSkills(resume.skills);
  resetGroqCallCounter();

  let updated = 0;
  const BATCH = 3;
  const DELAY = 1500;

  for (let i = 0; i < jobs.length; i += BATCH) {
    await Promise.all(
      jobs.slice(i, i + BATCH).map(async (job) => {
        const existing = await prisma.jobMatch.findFirst({
          where: { jobId: job.id, resumeId },
        });
        if (existing && !force) return;

        try {
          const result = await computeJobMatch(
            skills,
            resume.rawText,
            profile,
            {
              title: job.title,
              company: job.company,
              location: job.location,
              locationType: job.locationType,
              description: job.description,
              requiredSkills: parseRequiredSkills(job.requiredSkills),
            },
          );

          const data = {
            userFitsRoleScore: result.userFitsRoleScore,
            roleFitsUserScore: result.roleFitsUserScore,
            overallFitScore: result.overallFitScore,
            matchScore: result.overallFitScore,
            matchReason: result.matchReason,
            matchBreakdownJson: result.breakdown,
          };

          if (existing) {
            await prisma.jobMatch.update({
              where: { id: existing.id },
              data,
            });
          } else {
            await prisma.jobMatch.create({
              data: {
                id: randomUUID(),
                userId,
                jobId: job.id,
                resumeId,
                ...data,
              },
            });
          }
          updated++;
        } catch {
          /* non-fatal */
        }
      }),
    );

    if (i + BATCH < jobs.length) {
      await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  return updated;
}

export type RescoreJobIdsOptions = {
  userId: string;
  resumeId: string;
  jobIds: string[];
  isCareerChange?: boolean;
};

export async function rescoreJobIds({
  userId,
  resumeId,
  jobIds,
}: RescoreJobIdsOptions): Promise<number> {
  if (jobIds.length === 0) return 0;

  const [resume, profile, jobs] = await Promise.all([
    prisma.resume.findFirst({ where: { id: resumeId, userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.job.findMany({ where: { id: { in: jobIds }, isActive: 1 } }),
  ]);

  if (!resume || jobs.length === 0) return 0;

  const skills = parseSkills(resume.skills);
  resetGroqCallCounter();
  let updated = 0;

  for (const job of jobs) {
    try {
      const result = await computeJobMatch(
        skills,
        resume.rawText,
        profile,
        {
          title: job.title,
          company: job.company,
          location: job.location,
          locationType: job.locationType,
          description: job.description,
          requiredSkills: parseRequiredSkills(job.requiredSkills),
        },
      );

      const data = {
        userFitsRoleScore: result.userFitsRoleScore,
        roleFitsUserScore: result.roleFitsUserScore,
        overallFitScore: result.overallFitScore,
        matchScore: result.overallFitScore,
        matchReason: result.matchReason,
        matchBreakdownJson: result.breakdown,
      };

      const existing = await prisma.jobMatch.findFirst({
        where: { jobId: job.id, resumeId },
      });

      if (existing) {
        await prisma.jobMatch.update({ where: { id: existing.id }, data });
      } else {
        await prisma.jobMatch.create({
          data: {
            id: randomUUID(),
            userId,
            jobId: job.id,
            resumeId,
            ...data,
          },
        });
      }
      updated++;
    } catch {
      /* non-fatal */
    }
  }

  return updated;
}

export function triggerLazyRescore(
  userId: string,
  resumeId: string,
  jobIds: string[],
  _isCareerChange = false,
): void {
  const slice = jobIds.slice(0, 30);
  if (slice.length === 0) return;
  void rescoreJobIds({ userId, resumeId, jobIds: slice }).catch((err) =>
    console.error("[rescore-matches] lazy", err),
  );
}

/** Fire-and-forget helper after profile preference updates */
export function triggerJobMatchRescore(userId: string): void {
  void (async () => {
    const resume = await prisma.resume.findFirst({
      where: { userId, isActive: 1 },
    });
    if (!resume) return;
    await rescoreUserJobMatches({ userId, resumeId: resume.id, force: true });
  })().catch((err) => console.error("[rescore-matches]", err));
}
