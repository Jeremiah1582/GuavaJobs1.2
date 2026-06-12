import type { ScrapedJob } from "@/lib/scraper";

import { CURATED_BOARDS } from "./curated-boards";
import { fetchWithRetry } from "./fetch-with-retry";
import {
  greenhouseBoardResponseSchema,
  leverPostingsSchema,
} from "./schemas";

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toLocationType(
  remote: boolean,
  title = "",
  location = "",
): "Remote" | "Hybrid" | "On-site" {
  const combined = `${title} ${location}`.toLowerCase();
  if (remote || combined.includes("remote")) return "Remote";
  if (combined.includes("hybrid")) return "Hybrid";
  return "On-site";
}

export async function fetchGreenhouseBoard(
  org: string,
  displayName: string,
): Promise<ScrapedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(org)}/jobs?content=true`;
  let res: Response;
  try {
    res = await fetchWithRetry(url);
  } catch (err) {
    console.warn(`[ats-ingest] Greenhouse ${org}: fetch failed`, err);
    return [];
  }

  if (!res.ok) {
    console.warn(`[ats-ingest] Greenhouse ${org}: HTTP ${res.status}`);
    return [];
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return [];
  }

  const parsed = greenhouseBoardResponseSchema.safeParse(payload);
  if (!parsed.success) return [];

  const results: ScrapedJob[] = [];
  for (const job of parsed.data.jobs ?? []) {
    if (!job.title?.trim() || !job.absolute_url) continue;
    const description = stripHtml(job.content ?? "");
    const location = job.location?.name ?? "Unknown";
    const remote = location.toLowerCase().includes("remote");

    results.push({
      id: `gh_${org}_${job.id}`,
      title: job.title,
      company: displayName,
      location: remote ? "Remote" : location,
      locationType: toLocationType(remote, job.title, location),
      salary: "Not specified",
      description,
      url: job.absolute_url,
      postedAt: new Date().toISOString(),
      source: `Greenhouse · ${displayName}`,
      remote,
      country: remote ? "REMOTE" : "Global",
      requiredSkills: [],
    });
  }
  return results;
}

export async function fetchLeverBoard(
  org: string,
  displayName: string,
): Promise<ScrapedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(org)}?mode=json`;
  let res: Response;
  try {
    res = await fetchWithRetry(url);
  } catch (err) {
    console.warn(`[ats-ingest] Lever ${org}: fetch failed`, err);
    return [];
  }

  if (!res.ok) return [];

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return [];
  }

  const parsed = leverPostingsSchema.safeParse(payload);
  if (!parsed.success) return [];

  const results: ScrapedJob[] = [];
  for (const job of parsed.data) {
    if (!job.text?.trim() || !job.hostedUrl) continue;
    const description = stripHtml(job.descriptionPlain ?? job.description ?? "");
    const location = job.categories?.location ?? "Unknown";
    const remote = location.toLowerCase().includes("remote");

    results.push({
      id: `lever_${org}_${job.id}`,
      title: job.text,
      company: displayName,
      location: remote ? "Remote" : location,
      locationType: toLocationType(remote, job.text, location),
      salary: "Not specified",
      description,
      url: job.hostedUrl,
      postedAt: new Date().toISOString(),
      source: `Lever · ${displayName}`,
      remote,
      country: remote ? "REMOTE" : "Global",
      requiredSkills: [],
    });
  }
  return results;
}

export function filterCuratedByQuery(jobs: ScrapedJob[], query?: string): ScrapedJob[] {
  const q = query?.trim().toLowerCase();
  if (!q) return jobs;
  return jobs.filter((job) => {
    const haystack = `${job.title} ${job.description} ${job.company}`.toLowerCase();
    return q.split(/\s+/).some((term) => term.length > 2 && haystack.includes(term));
  });
}

export async function ingestCuratedAtsBoards(options?: {
  queryFilter?: string;
}): Promise<ScrapedJob[]> {
  const settled = await Promise.allSettled(
    CURATED_BOARDS.map((board) =>
      board.provider === "greenhouse"
        ? fetchGreenhouseBoard(board.org, board.displayName)
        : fetchLeverBoard(board.org, board.displayName),
    ),
  );

  const failed = settled.filter((r) => r.status === "rejected").length;
  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const filtered = filterCuratedByQuery(all, options?.queryFilter);
  console.log(
    `[ats-ingest] ${filtered.length} roles from ${CURATED_BOARDS.length} curated boards (${failed} board errors)`,
  );
  return filtered;
}
