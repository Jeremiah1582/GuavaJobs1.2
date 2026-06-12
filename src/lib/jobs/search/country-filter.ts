import type { Job } from "@/generated/prisma";
import type { JobCountry } from "@/lib/validators/jobs";

const COUNTRY_LOCATION_HINTS: Record<Exclude<JobCountry, "global">, RegExp[]> = {
  gb: [
    /\buk\b/i,
    /united kingdom/i,
    /london/i,
    /england/i,
    /scotland/i,
    /wales/i,
    /manchester/i,
    /birmingham/i,
    /edinburgh/i,
  ],
  de: [/germany/i, /deutschland/i, /berlin/i, /munich/i, /hamburg/i, /frankfurt/i],
  us: [
    /united states/i,
    /\busa\b/i,
    /\bus\b/i,
    /san francisco/i,
    /new york/i,
    /seattle/i,
    /austin/i,
    /california/i,
  ],
};

/** Post-filter global jobs by coarse location hints; remote rows always pass. */
export function filterJobsByCountry(jobs: Job[], country?: JobCountry | null): Job[] {
  if (!country || country === "global") return jobs;
  const hints = COUNTRY_LOCATION_HINTS[country];
  return jobs.filter((job) => {
    if (job.locationType === "Remote") return true;
    const loc = `${job.location} ${job.company}`.toLowerCase();
    return hints.some((re) => re.test(loc));
  });
}

/** City / where filter from hero search bar. */
export function filterJobsByWhere(jobs: Job[], where?: string | null): Job[] {
  const term = where?.trim().toLowerCase();
  if (!term) return jobs;
  return jobs.filter((job) => {
    if (job.locationType === "Remote") return true;
    return job.location.toLowerCase().includes(term);
  });
}
