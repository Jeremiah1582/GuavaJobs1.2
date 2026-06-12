// src/lib/scraper.ts
export type ScrapedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: "Remote" | "Hybrid" | "On-site";
  salary: string;
  description: string;
  url: string;
  postedAt: string;
  source: string;
  remote: boolean;
  country: string;
  requiredSkills: string[];
};

import type { ExperienceLevel } from "@/lib/validators/jobs";

export type ScrapeOptions = {
  queries: string[];
  serpApi?: import("./serpapi-jobs").SerpApiSearchOptions;
  curatedQueryFilter?: string;
  experienceLevel?: ExperienceLevel;
};

// ─── Skill extraction ────────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js", "Next.js", "Vue", "Angular",
  "Java", "C++", "C#", "C", "Go", "Rust", "Ruby", "Swift", "Kotlin", "Scala", "PHP",
  "HTML", "CSS", "Tailwind", "Bootstrap", "SASS",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase", "DynamoDB",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "Linux",
  "REST", "GraphQL", "gRPC", "Microservices", "API",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
  "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy",
  "React Native", "Flutter", "iOS", "Android",
  "Spring Boot", "Django", "Flask", "FastAPI", "Express", "Laravel",
  "Figma", "Agile", "Scrum", "Jest", "Selenium", "Testing",
  "Data Analysis", "Data Science", "Tableau", "Power BI",
  "Blockchain", "Solidity", "Web3", "LLMs", "Generative AI",
];

function extractSkills(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  return SKILL_KEYWORDS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`[\\s,•(]${escaped}[\\s,•);.]`, "i").test(lower);
  });
}

// ─── Internship filter ───────────────────────────────────────────────────────

const INTERN_TERMS = [
  "intern", "internship", "trainee", "apprentice", "co-op", "coop",
  "placement", "graduate program", "entry level", "entry-level", "fresher", "junior",
];

function isInternship(title: string, description = ""): boolean {
  const combined = `${title} ${description.slice(0, 300)}`.toLowerCase();
  return INTERN_TERMS.some((t) => combined.includes(t));
}

const JUNIOR_TERMS = [
  "junior",
  "graduate",
  "entry level",
  "entry-level",
  "associate",
  "early career",
  "fresher",
];

const SENIOR_TERMS = ["senior", "sr.", "staff", "principal", "lead", "director", "head of"];

function haystack(title: string, description: string): string {
  return `${title} ${description.slice(0, 400)}`.toLowerCase();
}

/** Returns true when a listing matches the requested experience level. */
export function matchesExperienceLevel(
  title: string,
  description: string,
  level: string,
): boolean {
  if (level === "ANY") return true;
  if (level === "INTERN") return isInternship(title, description);
  const combined = haystack(title, description);
  if (level === "JUNIOR") {
    return (
      JUNIOR_TERMS.some((t) => combined.includes(t)) ||
      (!SENIOR_TERMS.some((t) => combined.includes(t)) && !isInternship(title, description))
    );
  }
  if (level === "MID") {
    return (
      !isInternship(title, description) &&
      !SENIOR_TERMS.some((t) => combined.includes(t))
    );
  }
  if (level === "SENIOR") {
    return /\bsenior\b|\bsr\.?\b|\bstaff\b|\bprincipal\b/i.test(combined);
  }
  if (level === "LEAD") {
    return /\blead\b|\bstaff\b|\bprincipal\b|\bdirector\b|\bhead of\b/i.test(combined);
  }
  return true;
}

function applyExperienceFilter(
  jobs: ScrapedJob[],
  level?: ExperienceLevel,
): ScrapedJob[] {
  if (!level || level === "ANY") return jobs;
  return jobs.filter((j) =>
    matchesExperienceLevel(j.title, j.description, level),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dedup(jobs: ScrapedJob[]): ScrapedJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = j.url || `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripHtml(text: string | null | undefined, len = 800): string {
  return (text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, len);
}

function toLocationType(isRemote: boolean, title = "", location = ""): "Remote" | "Hybrid" | "On-site" {
  const combined = `${title} ${location}`.toLowerCase();
  if (isRemote || combined.includes("remote")) return "Remote";
  if (combined.includes("hybrid")) return "Hybrid";
  return "On-site";
}

// ─── Enabled sources (from .env JOBS_ENABLED_SOURCES) ────────────────────────

import {
  buildDescription,
  fetchGoogleJobsFromSerpApi,
  getSerpApiKey,
  resolveApplyUrl,
  resolvePostedAt,
  resolveSalary,
  type SerpApiSearchOptions,
} from "./serpapi-jobs";

type JobSource = "serpapi" | "remotive" | "adzuna" | "jsearch" | "arbeitnow";

function getEnabledSources(): JobSource[] {
  const hasSerpApi = !!getSerpApiKey();
  const raw = process.env.JOBS_ENABLED_SOURCES?.trim();

  if (raw) {
    const parsed = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is JobSource =>
        ["serpapi", "remotive", "adzuna", "jsearch", "arbeitnow"].includes(s),
      );
    if (parsed.length > 0) {
      // SerpAPI first when configured (real Google Jobs listings)
      if (hasSerpApi && parsed.includes("serpapi")) {
        return ["serpapi", ...parsed.filter((s) => s !== "serpapi")];
      }
      return parsed;
    }
  }

  // Default: Google Jobs via SerpAPI when API key is present
  if (hasSerpApi) return ["serpapi"];

  const defaults: JobSource[] = ["remotive"];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_API_KEY) {
    defaults.push("adzuna");
  }
  return defaults;
}

// ─── SerpAPI → Google Jobs (real listings) ───────────────────────────────────

async function fetchSerpApi(
  queries: string[],
  serpApi?: SerpApiSearchOptions,
): Promise<ScrapedJob[]> {
  const listings = await fetchGoogleJobsFromSerpApi(queries, serpApi);
  const results: ScrapedJob[] = [];

  for (const j of listings) {
    const applyUrl = resolveApplyUrl(j);
    if (!applyUrl) continue;

    const description = stripHtml(buildDescription(j), 4000);
    const location = j.location ?? "Unknown";
    const schedule = (j.detected_extensions?.schedule_type ?? "").toLowerCase();
    const remote =
      location.toLowerCase().includes("remote") ||
      schedule.includes("remote") ||
      /remote/i.test(description.slice(0, 500));

    const via = j.via ?? j.apply_options?.[0]?.title ?? "Google Jobs";

    results.push({
      id: `serpapi_${j.job_id ?? `${j.title}_${j.company_name}`.slice(0, 80)}`,
      title: j.title!,
      company: j.company_name ?? "Unknown",
      location: remote ? "Remote" : location,
      locationType: toLocationType(remote, j.title, location),
      salary: resolveSalary(j),
      description,
      url: applyUrl,
      postedAt: resolvePostedAt(j),
      source: `Google Jobs · ${via}`,
      remote,
      country: remote ? "REMOTE" : "Global",
      requiredSkills: extractSkills(description),
    });
  }

  console.log(`[scraper] Google Jobs (SerpAPI): ${results.length} listings`);
  return results;
}

// ─── 1. JSearch (RapidAPI) ───────────────────────────────────────────────────

type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city: string;
  job_country: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_description: string;
  job_apply_link: string;
  job_posted_at_datetime_utc: string;
  job_is_remote: boolean;
};

async function fetchJSearch(queries: string[]): Promise<ScrapedJob[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    console.warn("[scraper] JSEARCH_API_KEY not set — skipping JSearch");
    return [];
  }

  const results: ScrapedJob[] = [];

  // Run up to 3 queries concurrently
  await Promise.all(
    queries.slice(0, 3).map(async (query) => {
      const url = new URL("https://jsearch.p.rapidapi.com/search");
      url.searchParams.set("query", query);
      url.searchParams.set("page", "1");
      url.searchParams.set("num_pages", "2");
      url.searchParams.set("date_posted", "month");

      try {
        const res = await fetch(url.toString(), {
          headers: {
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
            "x-rapidapi-key": apiKey,
          },
        });
        if (!res.ok) return;
        const data = await res.json();

        ((data.data as JSearchJob[]) ?? []).forEach((j) => {
            const cur = j.job_salary_currency ?? "USD";
            const fmt = (n: number) =>
              new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
            results.push({
              id: `jsearch_${j.job_id}`,
              title: j.job_title,
              company: j.employer_name,
              location: j.job_is_remote
                ? "Remote"
                : [j.job_city, j.job_country].filter(Boolean).join(", ") || "Unknown",
              locationType: toLocationType(j.job_is_remote, j.job_title),
              salary: j.job_min_salary || j.job_max_salary
                ? j.job_min_salary && j.job_max_salary
                  ? `${fmt(j.job_min_salary)} – ${fmt(j.job_max_salary)}`
                  : fmt((j.job_min_salary ?? j.job_max_salary)!)
                : "Not specified",
              description: stripHtml(j.job_description),
              url: j.job_apply_link,
              postedAt: j.job_posted_at_datetime_utc,
              source: "JSearch",
              remote: j.job_is_remote,
              country: j.job_country ?? "Global",
              requiredSkills: extractSkills(j.job_description),
            });
          });
      } catch (err) {
        console.error(`[scraper] JSearch "${query}" failed:`, err);
      }
    })
  );

  console.log(`[scraper] JSearch: ${results.length} listings`);
  return results;
}

// ─── 2. Remotive (free, remote-only) ─────────────────────────────────────────

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  publication_date: string;
  tags: string[];
};

async function fetchRemotive(queries: string[]): Promise<ScrapedJob[]> {
  const results: ScrapedJob[] = [];

  await Promise.all(
    queries.slice(0, 4).map(async (query) => {
      try {
        const url = new URL("https://remotive.com/api/remote-jobs");
        url.searchParams.set("search", query);
        url.searchParams.set("limit", "20");
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();

        ((data.jobs as RemotiveJob[]) ?? []).forEach((j) => {
            results.push({
              id: `remotive_${j.id}`,
              title: j.title,
              company: j.company_name,
              location: j.candidate_required_location || "Worldwide",
              locationType: "Remote",
              salary: j.salary || "Not specified",
              description: stripHtml(j.description),
              url: j.url,
              postedAt: j.publication_date,
              source: "Remotive",
              remote: true,
              country: "REMOTE",
              requiredSkills: extractSkills(`${j.description} ${(j.tags ?? []).join(" ")}`),
            });
          });
      } catch (err) {
        console.error(`[scraper] Remotive "${query}" failed:`, err);
      }
    })
  );

  console.log(`[scraper] Remotive: ${results.length} listings`);
  return results;
}

// ─── 3. Arbeitnow (free, EU + remote) ────────────────────────────────────────

type ArbeitnowJob = {
  slug: string;
  url: string;
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  description: string;
  created_at: string;
  tags: string[];
};

async function fetchArbeitnow(queries: string[]): Promise<ScrapedJob[]> {
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
    if (!res.ok) return [];
    const data = await res.json();

    const queryTerms = queries.map((q) => q.toLowerCase());

    return ((data.data as ArbeitnowJob[]) ?? [])
      .filter((j) => {
        const combined = `${j.title} ${j.description}`.toLowerCase();
        return queryTerms.some((q) => combined.includes(q.split(" ")[0]));
      })
      .slice(0, 25)
      .map((j) => ({
        id: `arbeitnow_${j.slug}`,
        title: j.title,
        company: j.company_name,
        location: j.remote ? "Remote" : j.location || "Europe",
        locationType: toLocationType(j.remote, j.title, j.location),
        salary: "Not specified",
        description: stripHtml(j.description),
        url: j.url,
        postedAt: j.created_at,
        source: "Arbeitnow",
        remote: j.remote,
        country: j.remote ? "REMOTE" : "EU",
        requiredSkills: extractSkills(`${j.description} ${(j.tags ?? []).join(" ")}`),
      }));
  } catch (err) {
    console.error("[scraper] Arbeitnow failed:", err);
    return [];
  }
}

// ─── 4. Adzuna (paid, optional) ───────────────────────────────────────────────

type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  description: string;
  redirect_url: string;
  created: string;
};

async function fetchAdzuna(queries: string[]): Promise<ScrapedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const results: ScrapedJob[] = [];
  // Use first 2 queries against US only — prevents Adzuna from dominating
  await Promise.all(
    queries.slice(0, 2).map(async (query) => {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/1`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("what", query);
      url.searchParams.set("results_per_page", "10");
      url.searchParams.set("sort_by", "date");

      try {
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();

        ((data.results as AdzunaJob[]) ?? []).forEach((j) => {
            const fmt = (n: number) =>
              new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
            results.push({
              id: `adzuna_us_${j.id}`,
              title: j.title,
              company: j.company?.display_name ?? "Unknown",
              location: j.location?.display_name ?? "US",
              locationType: toLocationType(false, j.title, j.location?.display_name),
              salary: j.salary_min && j.salary_max
                ? `${fmt(j.salary_min)} – ${fmt(j.salary_max)}`
                : "Not specified",
              description: stripHtml(j.description),
              url: j.redirect_url,
              postedAt: j.created,
              source: "Adzuna",
              remote: j.title.toLowerCase().includes("remote"),
              country: "US",
              requiredSkills: extractSkills(j.description),
            });
          });
      } catch (err) {
        console.error(`[scraper] Adzuna "${query}" failed:`, err);
      }
    })
  );

  console.log(`[scraper] Adzuna: ${results.length} listings`);
  return results;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function scrapeAll(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const { queries, serpApi, experienceLevel } = options;
  const enabled = getEnabledSources();
  console.log(
    `[scraper] Sources: ${enabled.join(", ")} | Queries: ${queries.join(" | ")}`,
  );

  const { ingestCuratedAtsBoards } = await import("./jobs/ats/ingest");

  const [sourceBatches, curated] = await Promise.all([
    Promise.allSettled(
      enabled.map((source) => {
        if (source === "serpapi") return fetchSerpApi(queries, serpApi);
        if (source === "remotive") return fetchRemotive(queries);
        if (source === "adzuna") return fetchAdzuna(queries);
        if (source === "jsearch") return fetchJSearch(queries);
        if (source === "arbeitnow") return fetchArbeitnow(queries);
        return Promise.resolve([] as ScrapedJob[]);
      }),
    ),
    ingestCuratedAtsBoards({ queryFilter: options.curatedQueryFilter }),
  ]);

  const all = [
    ...sourceBatches.flatMap((res) => (res.status === "fulfilled" ? res.value : [])),
    ...curated,
  ];
  console.log(`[scraper] Total before dedup: ${all.length}`);

  let final = dedup(all).sort(
    (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
  );

  final = applyExperienceFilter(final, experienceLevel);

  console.log(`[scraper] Final: ${final.length} unique listings`);
  return final;
}

/** SerpAPI-only path for wider scan (no curated ATS boards). */
export async function scrapeSerpApiOnly(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const scraped = await fetchSerpApi(options.queries, options.serpApi);
  let final = dedup(scraped);
  final = applyExperienceFilter(final, options.experienceLevel);
  return final;
}