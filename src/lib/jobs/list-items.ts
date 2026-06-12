import type { Job, JobMatch, SavedJob } from "@/generated/prisma";
import type { BridgeAdvantage } from "@/lib/jobs/search/rank-jobs";
import type { MatchBreakdown } from "@/lib/job-matcher/types";

export type JobListItem = {
  id: string;
  title: string;
  company: string;
  companyLogoUrl: string | null;
  location: string;
  type: string;
  posted: string;
  matchReason: string | null;
  userFitsRoleScore: number | null;
  roleFitsUserScore: number | null;
  overallFitScore: number | null;
  matchBreakdown: MatchBreakdown | null;
  tags: string[];
  description: string;
  saved: boolean;
  applied: boolean;
  url: string;
  source: string;
  scrapedAtMs: number | null;
  fromCache: boolean;
  bridgeAdvantage?: BridgeAdvantage;
};

function safeJsonArray(raw: string | null | undefined): string[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function breakdownFromMatch(match: JobMatch | undefined): MatchBreakdown | null {
  if (!match?.matchBreakdownJson || typeof match.matchBreakdownJson !== "object") {
    return null;
  }
  return match.matchBreakdownJson as MatchBreakdown;
}

function scoresFromMatch(match: JobMatch | undefined) {
  if (!match) {
    return {
      matchReason: null as string | null,
      userFitsRoleScore: null as number | null,
      roleFitsUserScore: null as number | null,
      overallFitScore: null as number | null,
      matchBreakdown: null as MatchBreakdown | null,
    };
  }
  const overall = match.overallFitScore ?? match.matchScore;
  return {
    matchReason: match.matchReason || null,
    userFitsRoleScore: match.userFitsRoleScore ?? match.matchScore ?? null,
    roleFitsUserScore: match.roleFitsUserScore ?? null,
    overallFitScore: overall ?? null,
    matchBreakdown: breakdownFromMatch(match),
  };
}

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}

function postedLabel(postedAt: bigint | null): string {
  if (postedAt == null) return "Recently";
  const d = new Date(Number(postedAt));
  if (Number.isNaN(d.getTime())) return "Recently";
  return relativeTime(d);
}

function snapshotFromSavedRow(
  snapshotRaw: string,
  jobExternalId: string,
): {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  description: string;
  url: string;
  source: string;
  requiredSkills: string[];
} | null {
  try {
    const parsed = JSON.parse(snapshotRaw) as Record<string, unknown>;
    if (!parsed.title || !parsed.company) return null;
    return {
      id: String(parsed.id ?? jobExternalId),
      title: String(parsed.title),
      company: String(parsed.company),
      location: String(parsed.location ?? ""),
      locationType: String(parsed.locationType ?? "Unknown"),
      description: String(parsed.description ?? ""),
      url: String(parsed.url ?? ""),
      source: String(parsed.source ?? "Unknown"),
      requiredSkills: Array.isArray(parsed.requiredSkills)
        ? parsed.requiredSkills.map(String)
        : [],
    };
  } catch {
    return null;
  }
}

export function buildJobListItems(
  cached: Job[],
  matches: JobMatch[],
  saved: SavedJob[],
  appliedExternalIds: string[],
  bridgeByJobId?: Map<string, BridgeAdvantage | undefined>,
): JobListItem[] {
  const savedSet = new Set(saved.map((s) => s.jobExternalId));
  const appliedSet = new Set(appliedExternalIds);
  const matchMap = new Map(matches.map((m) => [m.jobId, m]));
  const byId = new Map<string, JobListItem>();

  for (const job of cached) {
    const match = matchMap.get(job.id);
    const scores = scoresFromMatch(match);
    byId.set(job.id, {
      id: job.id,
      title: job.title,
      company: job.company,
      companyLogoUrl: job.companyLogoUrl ?? null,
      location: job.location,
      type: job.locationType,
      posted: postedLabel(job.postedAt),
      ...scores,
      tags: safeJsonArray(job.requiredSkills),
      description: job.description,
      saved: savedSet.has(job.id),
      applied: appliedSet.has(job.id),
      url: job.url,
      source: job.source,
      scrapedAtMs: job.scrapedAt != null ? Number(job.scrapedAt) : null,
      fromCache: true,
      bridgeAdvantage: bridgeByJobId?.get(job.id),
    });
  }

  for (const s of saved) {
    if (byId.has(s.jobExternalId)) continue;
    const snap = snapshotFromSavedRow(s.snapshot, s.jobExternalId);
    if (!snap) continue;
    const match = matchMap.get(s.jobExternalId);
    byId.set(s.jobExternalId, {
      id: snap.id,
      title: snap.title,
      company: snap.company,
      companyLogoUrl: null,
      location: snap.location,
      type: snap.locationType,
      posted: "Saved",
      ...scoresFromMatch(match),
      tags: snap.requiredSkills,
      description: snap.description,
      saved: true,
      applied: appliedSet.has(s.jobExternalId),
      url: snap.url,
      source: snap.source || s.source,
      scrapedAtMs: null,
      fromCache: false,
      bridgeAdvantage: bridgeByJobId?.get(s.jobExternalId),
    });
  }

  return [...byId.values()];
}
