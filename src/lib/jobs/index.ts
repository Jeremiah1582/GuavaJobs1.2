import { jobListingSchema } from "../validators/jobs";
import type { JobListing } from "./types";
import { resolveListingForUser } from "./resolve-listing";

export { savedJobSearchesService, type SavedJobSearchDto } from "./saved-searches";
export type { SavedJobSearchCreateInput } from "../validators/saved-job-searches";
export type { JobListing, JobCountry, JobSearchInput, JobSearchResult } from "./types";

/** Minimal jobs facade for application flows (full search stays in jobs-api.ts). */
export const jobsService = {
  async resolveListing(
    userId: string,
    id: string,
    snapshot?: unknown,
  ): Promise<JobListing | null> {
    if (snapshot !== undefined) {
      const parsed = jobListingSchema.safeParse(snapshot);
      if (parsed.success && parsed.data.id === id) {
        return parsed.data as JobListing;
      }
    }
    return resolveListingForUser(userId, id);
  },
};
