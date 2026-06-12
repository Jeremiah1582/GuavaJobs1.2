import type { Job, JobCategory, RoleFamily } from "@/generated/prisma";

import { prisma } from "@/db";
import { matchesExperienceLevel } from "@/lib/scraper";
import type { ExperienceLevel, JobCountry } from "@/lib/validators/jobs";
import type { SearchProfile } from "@/lib/validators/search-profile";

import {
  dspToJobCategories,
  dspToRoleFamilies,
  queryToJobCategories,
  queryToRoleFamilies,
  widenRoleFamilies,
} from "../taxonomy/query-to-families";

import { filterJobsByCountry, filterJobsByWhere } from "./country-filter";
import { ftsQueryFromText, recommendedFtsQuery } from "./query-expansion";
import type { RankedGlobalJob } from "./rank-jobs";

export type { BridgeAdvantage, RankedGlobalJob } from "./rank-jobs";
export { rankGlobalJobs, computeBridgeAdvantage } from "./rank-jobs";

export type SearchGlobalJobsParams = {
  q?: string;
  mode?: "recommended" | "search";
  searchProfile?: SearchProfile | null;
  targetJobCategories?: JobCategory[];
  experienceLevel?: ExperienceLevel | null;
  workMode?: "all" | "remote" | "hybrid" | "onsite";
  country?: JobCountry | null;
  where?: string | null;
  limit?: number;
  offset?: number;
};

export type SearchGlobalJobsResult = {
  jobs: Job[];
  ranked: RankedGlobalJob[];
  total: number;
  widenedFamilies: boolean;
};

const MIN_HITS_BEFORE_WIDEN = 10;
const DEFAULT_LIMIT = 100;

function workModeWhere(workMode?: SearchGlobalJobsParams["workMode"]) {
  if (!workMode || workMode === "all") return {};
  if (workMode === "remote") return { locationType: "Remote" };
  if (workMode === "hybrid") return { locationType: "Hybrid" };
  return { locationType: "On-site" };
}

async function countTaxonomyMatches(
  families: RoleFamily[],
  categories: JobCategory[],
  workMode?: SearchGlobalJobsParams["workMode"],
): Promise<number> {
  return prisma.job.count({
    where: {
      userId: null,
      isActive: 1,
      roleFamily: { in: families },
      ...(categories.length > 0 ? { jobCategory: { in: categories } } : {}),
      ...workModeWhere(workMode),
    },
  });
}

async function fetchByTaxonomy(
  families: RoleFamily[],
  categories: JobCategory[],
  ftsQuery: string | null,
  q: string | undefined,
  limit: number,
  offset: number,
  workMode?: SearchGlobalJobsParams["workMode"],
): Promise<Job[]> {
  const baseWhere = {
    userId: null,
    isActive: 1,
    roleFamily: { in: families },
    ...(categories.length > 0 ? { jobCategory: { in: categories } } : {}),
    ...workModeWhere(workMode),
  };

  if (ftsQuery?.trim()) {
    const term = ftsQuery.trim();
    return prisma.job.findMany({
      where: {
        ...baseWhere,
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { company: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { scrapedAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  if (q?.trim()) {
    const term = q.trim();
    return prisma.job.findMany({
      where: {
        ...baseWhere,
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { company: { contains: term, mode: "insensitive" } },
        ],
      },
      orderBy: { scrapedAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  return prisma.job.findMany({
    where: baseWhere,
    orderBy: { scrapedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

async function fetchIlikeFallback(
  q: string,
  limit: number,
  workMode?: SearchGlobalJobsParams["workMode"],
): Promise<Job[]> {
  return prisma.job.findMany({
    where: {
      userId: null,
      isActive: 1,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
      ],
      ...workModeWhere(workMode),
    },
    orderBy: { scrapedAt: "desc" },
    take: limit,
  });
}

function filterExperience(jobs: Job[], level?: ExperienceLevel | null): Job[] {
  if (!level || level === "ANY") return jobs;
  return jobs.filter((j) =>
    matchesExperienceLevel(j.title, j.description, level),
  );
}

/** Taxonomy pre-filter → text search → auto-widen → ILIKE fallback on global jobs. */
export async function searchGlobalJobs(
  params: SearchGlobalJobsParams,
): Promise<SearchGlobalJobsResult> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  const mode = params.mode ?? (params.q?.trim() ? "search" : "recommended");
  const dsp = params.searchProfile ?? null;

  let families: RoleFamily[];
  let categories: JobCategory[];
  let ftsQuery: string | null = null;

  if (mode === "search" && params.q?.trim()) {
    families = queryToRoleFamilies(params.q);
    categories =
      params.targetJobCategories && params.targetJobCategories.length > 0
        ? params.targetJobCategories
        : queryToJobCategories(params.q);
    ftsQuery = ftsQueryFromText(params.q);
  } else if (dsp) {
    families = dspToRoleFamilies(dsp);
    categories = dspToJobCategories(dsp, params.targetJobCategories ?? []);
    ftsQuery = recommendedFtsQuery(dsp) || null;
  } else {
    families = ["SOFTWARE_ENGINEER", "FULLSTACK", "FRONTEND", "BACKEND", "UNKNOWN"];
    categories = params.targetJobCategories ?? [];
  }

  let widenedFamilies = false;
  let hitCount = await countTaxonomyMatches(families, categories, params.workMode);
  if (hitCount < MIN_HITS_BEFORE_WIDEN) {
    families = widenRoleFamilies(families);
    widenedFamilies = true;
    hitCount = await countTaxonomyMatches(families, categories, params.workMode);
  }

  let jobs = await fetchByTaxonomy(
    families,
    categories,
    ftsQuery,
    params.q,
    limit,
    offset,
    params.workMode,
  );

  if (jobs.length < MIN_HITS_BEFORE_WIDEN && params.q?.trim()) {
    const fallback = await fetchIlikeFallback(
      params.q.trim(),
      limit,
      params.workMode,
    );
    const seen = new Set(jobs.map((j) => j.id));
    for (const j of fallback) {
      if (!seen.has(j.id)) jobs.push(j);
    }
  }

  jobs = filterExperience(jobs, params.experienceLevel);
  jobs = filterJobsByCountry(jobs, params.country);
  jobs = filterJobsByWhere(jobs, params.where);

  return {
    jobs,
    ranked: [],
    total: hitCount,
    widenedFamilies,
  };
}
