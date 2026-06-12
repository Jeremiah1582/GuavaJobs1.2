// src/lib/serpapi-jobs.ts — Google Jobs listings via SerpAPI (SERPAPI_API_KEY)

const SERPAPI_BASE = "https://serpapi.com/search.json";
const MAX_QUERIES = 5;
const MAX_PAGES_PER_QUERY = 3; // up to ~10 results per page

export type SerpApiSearchOptions = {
  location?: string;
  gl?: string;
  maxDaysOld?: number;
};

export type SerpApiJob = {
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  via?: string;
  share_link?: string;
  thumbnail?: string;
  job_id?: string;
  related_links?: Array<{ link?: string; text?: string }>;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    salary?: string;
  };
  apply_options?: Array<{ title?: string; link?: string }>;
  job_highlights?: Array<{ title?: string; items?: string[] }>;
};

type SerpApiResponse = {
  error?: string;
  jobs_results?: SerpApiJob[];
  serpapi_pagination?: { next_page_token?: string };
  search_metadata?: { status?: string };
};

export function getSerpApiKey(): string | null {
  const key = process.env.SERPAPI_API_KEY?.trim();
  return key || null;
}

function buildSearchUrl(
  query: string,
  apiKey: string,
  options?: SerpApiSearchOptions,
  nextPageToken?: string,
): string {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("hl", process.env.SERPAPI_HL?.trim() || "en");

  const gl = options?.gl ?? process.env.SERPAPI_GL?.trim();
  if (gl) url.searchParams.set("gl", gl);

  const location = options?.location ?? process.env.SERPAPI_LOCATION?.trim();
  if (location) url.searchParams.set("location", location);

  if (options?.maxDaysOld) {
    url.searchParams.set("chips", `date_posted:${options.maxDaysOld}d`);
  }

  if (nextPageToken) url.searchParams.set("next_page_token", nextPageToken);

  return url.toString();
}

export function resolveApplyUrl(job: SerpApiJob): string {
  const directApply = job.apply_options?.find((o) => o.link?.startsWith("http"))?.link;
  if (directApply) return directApply;

  if (job.share_link?.startsWith("http")) return job.share_link;

  const related = job.related_links?.find((l) => l.link?.startsWith("http"))?.link;
  if (related) return related;

  return job.via?.startsWith("http") ? job.via : "";
}

export function buildDescription(job: SerpApiJob): string {
  const parts: string[] = [];
  if (job.description?.trim()) parts.push(job.description.trim());

  if (job.job_highlights?.length) {
    for (const block of job.job_highlights) {
      if (!block.items?.length) continue;
      const heading = block.title ? `${block.title}:\n` : "";
      parts.push(`${heading}${block.items.join("\n")}`);
    }
  }

  if (job.extensions?.length) {
    parts.push(`Details: ${job.extensions.join(" · ")}`);
  }

  return parts.join("\n\n");
}

export function resolveSalary(job: SerpApiJob): string {
  if (job.detected_extensions?.salary) return job.detected_extensions.salary;
  const salaryExt = job.extensions?.find((e) =>
    /\$|£|€|\/hr|\/hour|per year|salary/i.test(e),
  );
  return salaryExt ?? "Not specified";
}

export function resolvePostedAt(job: SerpApiJob): string {
  return (
    job.detected_extensions?.posted_at ??
    job.extensions?.find((e) => /ago|day|week|hour|month/i.test(e)) ??
    new Date().toISOString()
  );
}

/** Fetch real Google Jobs listings from SerpAPI for each search query. */
export async function fetchGoogleJobsFromSerpApi(
  queries: string[],
  options?: SerpApiSearchOptions,
): Promise<SerpApiJob[]> {
  const apiKey = getSerpApiKey();
  if (!apiKey) {
    throw new Error(
      "SERPAPI_API_KEY is missing. Add it to .env.local to fetch real job listings.",
    );
  }

  const uniqueQueries = [...new Set(queries.filter(Boolean))].slice(0, MAX_QUERIES);
  const allJobs: SerpApiJob[] = [];
  const seenIds = new Set<string>();

  for (const query of uniqueQueries) {
    let nextPageToken: string | undefined;
    let pages = 0;

    console.log(`[serpapi] Searching: "${query}"`);

    do {
      const url = buildSearchUrl(query, apiKey, options, nextPageToken);
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res.text();
        console.error(`[serpapi] HTTP ${res.status} for "${query}":`, body.slice(0, 200));
        break;
      }

      const data = (await res.json()) as SerpApiResponse;

      if (data.error) {
        console.error(`[serpapi] API error for "${query}":`, data.error);
        break;
      }

      const batch = data.jobs_results ?? [];
      for (const job of batch) {
        if (!job.title?.trim()) continue;
        const key = job.job_id ?? `${job.title}|${job.company_name}|${job.location}`;
        if (seenIds.has(key)) continue;
        seenIds.add(key);
        allJobs.push(job);
      }

      console.log(
        `[serpapi] "${query}" page ${pages + 1}: +${batch.length} (total ${allJobs.length})`,
      );

      nextPageToken = data.serpapi_pagination?.next_page_token;
      pages++;
    } while (nextPageToken && pages < MAX_PAGES_PER_QUERY);
  }

  console.log(`[serpapi] ${allJobs.length} unique Google Jobs listings`);
  return allJobs;
}
