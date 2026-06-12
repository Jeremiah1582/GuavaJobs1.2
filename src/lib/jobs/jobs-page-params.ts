import type { ListJobsOptions } from "@/lib/jobs/queries";
import {
  experienceLevelSchema,
  jobCountrySchema,
  type ExperienceLevel,
  type JobCountry,
} from "@/lib/validators/jobs";

const WORK_MODES = new Set(["all", "remote", "hybrid", "onsite"]);

export type JobsPageUrlParams = {
  q?: string;
  mode?: string;
  level?: string;
  filter?: string;
  country?: string;
  where?: string;
  limit?: string;
  offset?: string;
};

export type ProfileLocationInput = {
  location?: string | null;
  city?: string | null;
  country?: string | null;
  targetSeniority?: string | null;
};

export type JobSearchDefaults = {
  country: JobCountry;
  where: string;
  experienceLevel: ExperienceLevel;
};

function countryStringToMarket(country: string): JobCountry {
  const c = country.trim().toLowerCase();
  if (
    c === "de" ||
    c === "germany" ||
    c === "deutschland" ||
    c.includes("germany")
  ) {
    return "de";
  }
  if (
    c === "gb" ||
    c === "uk" ||
    c === "united kingdom" ||
    c.includes("england") ||
    c.includes("scotland") ||
    c.includes("wales")
  ) {
    return "gb";
  }
  if (
    c === "us" ||
    c === "usa" ||
    c === "united states" ||
    c.includes("america")
  ) {
    return "us";
  }
  return "global";
}

function parseLocationString(location: string): { city: string; country: JobCountry } {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { city: "", country: "global" };
  if (parts.length === 1) {
    const market = countryStringToMarket(parts[0]);
    if (market !== "global") return { city: "", country: market };
    return { city: parts[0], country: "global" };
  }
  const countryPart = parts[parts.length - 1];
  const city = parts.slice(0, -1).join(", ");
  return {
    city,
    country: countryStringToMarket(countryPart),
  };
}

const SENIORITY_TO_LEVEL: Record<string, ExperienceLevel> = {
  INTERN: "INTERN",
  JUNIOR: "JUNIOR",
  MID: "MID",
  SENIOR: "SENIOR",
  LEAD: "LEAD",
  EXECUTIVE: "LEAD",
};

/** Derive hero-search defaults from profile.location (priority) then city/country. */
export function resolveJobSearchDefaultsFromProfile(
  profile: ProfileLocationInput | null | undefined,
): JobSearchDefaults {
  const level =
    profile?.targetSeniority && SENIORITY_TO_LEVEL[profile.targetSeniority]
      ? SENIORITY_TO_LEVEL[profile.targetSeniority]
      : "ANY";

  if (profile?.location?.trim()) {
    const parsed = parseLocationString(profile.location.trim());
    return {
      country: parsed.country,
      where: parsed.city || profile.city?.trim() || "",
      experienceLevel: level,
    };
  }

  const market = profile?.country
    ? countryStringToMarket(profile.country)
    : "global";

  return {
    country: market,
    where: profile?.city?.trim() ?? "",
    experienceLevel: level,
  };
}

export function normalizeJobsPageSearchParams(
  raw: Record<string, string | string[] | undefined>,
): JobsPageUrlParams {
  const pick = (key: string): string | undefined => {
    const v = raw[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  return {
    q: pick("q"),
    mode: pick("mode"),
    level: pick("level"),
    filter: pick("filter"),
    country: pick("country"),
    where: pick("where"),
    limit: pick("limit"),
    offset: pick("offset"),
  };
}

export function listOptionsFromJobsPageParams(
  params: JobsPageUrlParams,
): ListJobsOptions {
  const q = params.q?.trim() || undefined;
  const modeParam = params.mode;
  const mode =
    modeParam === "search"
      ? "search"
      : modeParam === "recommended"
        ? "recommended"
        : q
          ? "search"
          : "recommended";

  const levelRaw = params.level;
  const experienceLevelParsed = experienceLevelSchema.safeParse(levelRaw);
  const experienceLevel = experienceLevelParsed.success
    ? experienceLevelParsed.data
    : null;

  const workModeRaw = params.filter ?? "all";
  const workMode = WORK_MODES.has(workModeRaw)
    ? (workModeRaw as "all" | "remote" | "hybrid" | "onsite")
    : "all";

  const countryParsed = jobCountrySchema.safeParse(params.country);
  const country = countryParsed.success ? countryParsed.data : null;

  const where = params.where?.trim() || undefined;

  const limit = Math.min(
    200,
    Math.max(1, Number.parseInt(params.limit ?? "100", 10) || 100),
  );
  const offset = Math.max(
    0,
    Number.parseInt(params.offset ?? "0", 10) || 0,
  );

  return {
    q,
    mode,
    experienceLevel,
    workMode: workMode === "all" ? undefined : workMode,
    country,
    where,
    limit,
    offset,
  };
}

export function jobsPageQueryKey(options: ListJobsOptions): string {
  return JSON.stringify({
    q: options.q ?? "",
    mode: options.mode ?? "recommended",
    experienceLevel: options.experienceLevel ?? "ANY",
    workMode: options.workMode ?? "all",
    country: options.country ?? "global",
    where: options.where ?? "",
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  });
}

export function jobsPageQueryKeyFromClient(input: {
  q: string;
  experienceLevel: ExperienceLevel;
  filter: string;
  country: JobCountry;
  where: string;
}): string {
  const q = input.q.trim() || undefined;
  const mode = q ? "search" : "recommended";
  return jobsPageQueryKey({
    q,
    mode,
    experienceLevel: input.experienceLevel,
    workMode:
      input.filter === "all"
        ? undefined
        : (input.filter as "remote" | "hybrid" | "onsite"),
    country: input.country === "global" ? null : input.country,
    where: input.where.trim() || undefined,
  });
}
