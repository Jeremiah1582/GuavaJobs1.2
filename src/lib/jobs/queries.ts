import { prisma } from "@/db";
import type { AppliedJob, Job, JobMatch, SavedJob } from "@/generated/prisma";
import { profileToPreferences } from "@/lib/job-matcher";
import { rankGlobalJobs, searchGlobalJobs, type RankedGlobalJob } from "@/lib/jobs/search";
import type { ExperienceLevel, JobCountry } from "@/lib/validators/jobs";
import type { ProfileImportMeta } from "@/lib/validators/profile";
import type { SearchProfile } from "@/lib/validators/search-profile";

export type ListJobsOptions = {
  q?: string;
  mode?: "recommended" | "search";
  experienceLevel?: ExperienceLevel | null;
  workMode?: "all" | "remote" | "hybrid" | "onsite";
  country?: JobCountry | null;
  where?: string;
  limit?: number;
  offset?: number;
};

/** Global job index + saved snapshots + per-user match/saved/applied state. */
export async function listJobsForUser(
  userId: string,
  resumeId: string | null,
  options?: ListJobsOptions,
): Promise<{
  cached: Job[];
  ranked: RankedGlobalJob[];
  matches: JobMatch[];
  saved: SavedJob[];
  appliedExternalIds: string[];
  searchProfile: SearchProfile | null;
  widenedFamilies: boolean;
}> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const meta = (profile?.importMetaJson as ProfileImportMeta | null) ?? null;
  const dsp = meta?.searchProfile ?? null;

  const mode =
    options?.mode ?? (options?.q?.trim() ? "search" : "recommended");

  const search = await searchGlobalJobs({
    q: options?.q,
    mode,
    searchProfile: dsp,
    experienceLevel: options?.experienceLevel,
    workMode: options?.workMode,
    country: options?.country,
    where: options?.where,
    limit: options?.limit,
    offset: options?.offset,
  });

  const prefs = profileToPreferences(profile);
  const ranked = rankGlobalJobs(search.jobs, dsp, prefs, { q: options?.q });

  const [matches, saved, appliedApplications] = await Promise.all([
    resumeId
      ? prisma.jobMatch.findMany({
          where: { userId, resumeId },
        })
      : Promise.resolve([] as JobMatch[]),
    prisma.savedJob.findMany({ where: { userId } }),
    prisma.appliedJob.findMany({ where: { userId } }),
  ]);

  const appliedExternalIds = appliedApplications.map((a) => a.jobExternalId);

  return {
    cached: ranked.map((r) => r.job),
    ranked,
    matches,
    saved,
    appliedExternalIds,
    searchProfile: dsp,
    widenedFamilies: search.widenedFamilies,
  };
}
