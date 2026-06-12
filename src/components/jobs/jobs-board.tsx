"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Briefcase,
  Clock,
  MapPin,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
} from "lucide-react";

import { MatchFitBadge } from "@/components/jobs/match-fit-badge";
import { isJobScored, type DashboardJob } from "@/lib/jobs/dashboard-job";

type JobsBoardProps = {
  jobs: DashboardJob[];
  onToggleSave: (job: DashboardJob) => void;
};

export function JobsBoard({ jobs, onToggleSave }: JobsBoardProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="space-y-3">
      {jobs.map((job, i) => (
        <motion.article
          key={job.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:border-guava-green/25 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">
                    {job.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {job.location || "Not specified"}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3" />
                  {job.type}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {job.posted}
                </span>
                {job.bridgeAdvantage?.active ? (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                    Your edge
                  </span>
                ) : null}
                {!isJobScored(job) ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Scoring…
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <MatchFitBadge
                jobId={job.id}
                overallFitScore={job.overallFitScore ?? job.matchScore}
                userFitsRoleScore={job.userFitsRoleScore}
                roleFitsUserScore={job.roleFitsUserScore}
                matchReason={job.matchReason}
                matchBreakdown={job.matchBreakdown}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSave(job)}
                  className="grid size-8 place-items-center rounded-lg border border-border hover:bg-secondary"
                  aria-label={job.saved ? "Remove bookmark" : "Bookmark job"}
                >
                  {job.saved ? (
                    <BookmarkCheck className="size-4 text-guava-green" />
                  ) : (
                    <Bookmark className="size-4 text-muted-foreground" />
                  )}
                </button>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-8 place-items-center rounded-lg border border-border hover:bg-secondary"
                >
                  <ExternalLink className="size-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
