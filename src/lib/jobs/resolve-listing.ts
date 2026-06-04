import { resolveJobForUser, type JobSnapshot } from "../jobs-api";
import type { JobCountry, JobListing, JobSource } from "./types";

function inferCountry(jobId: string): JobCountry {
  if (jobId.startsWith("de-") || jobId.includes(":de:")) return "de";
  return "gb";
}

function inferSource(snapshot: JobSnapshot): JobSource {
  const s = snapshot.source.toLowerCase();
  if (s === "adzuna" || s === "remotive" || s === "serpapi") {
    return s;
  }
  return "serpapi";
}

function snapshotToListing(snapshot: JobSnapshot): JobListing {
  return {
    id: snapshot.id,
    country: inferCountry(snapshot.id),
    source: inferSource(snapshot),
    title: snapshot.title,
    company: snapshot.company,
    location: snapshot.location,
    description: snapshot.description,
    redirectUrl: snapshot.url,
    category: snapshot.locationType !== "Unknown" ? snapshot.locationType : undefined,
  };
}

/** Resolve a job id from the user's InternHunt cache/saved jobs (replaces core jobsService.resolveListing). */
export async function resolveListingForUser(
  userId: string,
  jobId: string,
): Promise<JobListing | null> {
  const snapshot = await resolveJobForUser(userId, jobId);
  return snapshot ? snapshotToListing(snapshot) : null;
}
