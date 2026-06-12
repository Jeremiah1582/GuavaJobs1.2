import type { Job } from "@/generated/prisma";

import { computeCareerTrajectory } from "@/lib/job-matcher/role-fits-user";
import type { ProfilePreferencesInput } from "@/lib/job-matcher/types";
import type { SearchProfile } from "@/lib/validators/search-profile";

export type BridgeAdvantage = {
  active: boolean;
  reason: string;
  backgroundDomain: string;
};

export type RankedGlobalJob = {
  job: Job;
  rankScore: number;
  bridgeAdvantage?: BridgeAdvantage;
  intentMatch: boolean;
};

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  healthcare: ["clinical", "patient", "hospital", "hipaa", "medical", "nursing", "health"],
  nursing: ["nurse", "clinical", "patient", "hospital", "ward"],
  education: ["classroom", "curriculum", "teaching", "student", "learning"],
  finance: ["banking", "fintech", "payments", "trading", "audit"],
};

function jobHaystack(job: Job): string {
  return `${job.title} ${job.description} ${job.company}`.toLowerCase();
}

function domainBoost(description: string, domains: string[]): number {
  const hay = description.toLowerCase();
  let hits = 0;
  for (const domain of domains) {
    for (const kw of DOMAIN_KEYWORDS[domain] ?? [domain]) {
      if (hay.includes(kw)) hits++;
    }
  }
  return Math.min(hits * 8, 40);
}

function titleMatchesRole(title: string, role: string): boolean {
  const a = title.toLowerCase();
  const b = role.toLowerCase();
  return a.includes(b) || b.split(/\s+/).some((w) => w.length > 3 && a.includes(w));
}

function locationBoost(job: Job, profile: ProfilePreferencesInput): number {
  let boost = 0;
  const hay = `${job.location} ${job.company}`.toLowerCase();
  const city = profile.city?.trim().toLowerCase();
  const country = profile.country?.trim().toLowerCase();
  if (city && hay.includes(city)) boost += 10;
  if (country) {
    if (country.includes("germany") || country === "de") {
      if (/germany|deutschland|berlin|munich/i.test(hay)) boost += 8;
    } else if (country.includes("kingdom") || country === "uk" || country === "gb") {
      if (/uk|united kingdom|london|england/i.test(hay)) boost += 8;
    } else if (country.includes("states") || country === "us" || country === "usa") {
      if (/united states|usa|california|new york/i.test(hay)) boost += 8;
    }
  }
  return boost;
}

export function computeBridgeAdvantage(
  dsp: SearchProfile,
  profile: ProfilePreferencesInput,
  job: Job,
): BridgeAdvantage | undefined {
  if (!dsp.isCareerChange) return undefined;

  const trajectory = computeCareerTrajectory(profile, {
    title: job.title,
    company: job.company,
    location: job.location,
    locationType: job.locationType,
    description: job.description,
    requiredSkills: [],
  });

  if (!trajectory) return undefined;
  if (trajectory.domainContinuity < 70 || trajectory.aspirationAlignment < 40) {
    return undefined;
  }

  const domain = dsp.backgroundDomains[0] ?? "your background";
  return {
    active: true,
    reason: `Your ${domain} experience aligns with this ${job.company} role`,
    backgroundDomain: domain,
  };
}

export function rankGlobalJobs(
  jobs: Job[],
  dsp: SearchProfile | null,
  profile: ProfilePreferencesInput,
  options?: { q?: string },
): RankedGlobalJob[] {
  const intentRoles = dsp
    ? [...dsp.primaryRoles, ...dsp.derivedRoles]
    : options?.q
      ? [options.q]
      : [];
  const bridgeRoles = dsp?.isCareerChange ? dsp.bridgeRoles : [];
  const domains = dsp?.backgroundDomains ?? [];

  const ranked = jobs.map((job) => {
    let rankScore = 50;
    const intentMatch = intentRoles.some((r) => titleMatchesRole(job.title, r));
    const bridgeMatch = bridgeRoles.some((r) => titleMatchesRole(job.title, r));

    if (intentMatch) rankScore += 35;
    if (bridgeMatch) rankScore += dsp?.isCareerChange ? 25 : 10;
    rankScore += domainBoost(jobHaystack(job), domains);
    rankScore += locationBoost(job, profile);

    if (options?.q && jobHaystack(job).includes(options.q.toLowerCase())) {
      rankScore += 20;
    }

    const bridgeAdvantage =
      dsp && profile ? computeBridgeAdvantage(dsp, profile, job) : undefined;
    if (bridgeAdvantage?.active) rankScore += 15;

    return { job, rankScore, bridgeAdvantage, intentMatch };
  });

  ranked.sort((a, b) => b.rankScore - a.rankScore);
  return ranked;
}
