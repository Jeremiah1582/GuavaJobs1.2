import type { JobListItem } from "@/lib/jobs/list-items";

export type DashboardJob = JobListItem & {
  matchScore: number | null;
  isNew?: boolean;
};

export function toDashboardJob(job: JobListItem, isNew = false): DashboardJob {
  return {
    ...job,
    matchScore: job.overallFitScore,
    isNew,
  };
}

export function isJobScored(job: Pick<DashboardJob, "overallFitScore" | "matchScore">): boolean {
  return (job.overallFitScore ?? job.matchScore) !== null;
}
