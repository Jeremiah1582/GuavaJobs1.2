import { prisma } from "@/db";
import { buildJobListItems } from "@/lib/jobs/list-items";
import { listJobsForUser, type ListJobsOptions } from "@/lib/jobs/queries";
import { maybeSyncGlobalAtsJobs } from "@/lib/jobs/global-sync";
import { sortJobListItems } from "@/lib/jobs/sort-list-items";
import type { SearchProfile } from "@/lib/validators/search-profile";

import type { JobListItem } from "./list-items";

export type LoadedJobsDashboard = {
  jobs: JobListItem[];
  hasResume: boolean;
  searchProfile: SearchProfile | null;
  widenedFamilies: boolean;
  globalJobCount: number;
};

/** Shared loader for GET /api/jobs and the jobs dashboard RSC page. */
export async function loadJobsDashboard(
  userId: string,
  options?: ListJobsOptions,
): Promise<LoadedJobsDashboard> {
  void maybeSyncGlobalAtsJobs().catch((err) =>
    console.error("[load-jobs-dashboard] ats sync", err),
  );

  const resume = await prisma.resume.findFirst({
    where: { userId, isActive: 1 },
  });

  const {
    cached,
    ranked,
    matches,
    saved,
    appliedExternalIds,
    searchProfile,
    widenedFamilies,
  } = await listJobsForUser(userId, resume?.id ?? null, options);

  const bridgeByJobId = new Map(
    ranked.map((r) => [r.job.id, r.bridgeAdvantage]),
  );

  let jobs = buildJobListItems(
    cached,
    matches,
    saved,
    appliedExternalIds,
    bridgeByJobId,
  );
  jobs = sortJobListItems(jobs, ranked);

  const globalJobCount = await prisma.job.count({
    where: { userId: null, isActive: 1 },
  });

  return {
    jobs,
    hasResume: Boolean(resume),
    searchProfile,
    widenedFamilies,
    globalJobCount,
  };
}
