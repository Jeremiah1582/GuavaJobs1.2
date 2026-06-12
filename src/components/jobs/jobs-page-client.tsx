"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import {
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { parseApiResponse } from "@/lib/parse-api-response";
import { HeroSearchBar } from "@/components/jobs/hero-search-bar";
import { JobsBoard } from "@/components/jobs/jobs-board";
import { RecommendedBanner } from "@/components/jobs/recommended-banner";
import {
  isJobScored,
  toDashboardJob,
  type DashboardJob,
} from "@/lib/jobs/dashboard-job";
import {
  jobsPageQueryKeyFromClient,
  type JobSearchDefaults,
} from "@/lib/jobs/jobs-page-params";
import type { ScrapeOverrides } from "@/lib/validators/saved-job-searches";
import type { SearchProfile } from "@/lib/validators/search-profile";
import type { ExperienceLevel, JobCountry } from "@/lib/validators/jobs";

const countryParser = parseAsStringLiteral(
  ["gb", "de", "us", "global"] as const,
).withDefault("global");
const levelParser = parseAsStringLiteral(
  ["ANY", "INTERN", "JUNIOR", "MID", "SENIOR", "LEAD"] as const,
).withDefault("ANY");
const filterParser = parseAsStringLiteral(
  ["all", "remote", "hybrid", "onsite"] as const,
).withDefault("all");

const WORK_MODE_OPTIONS = [
  { value: "all", label: "All modes" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;

const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  ANY: "Any level",
  INTERN: "Intern",
  JUNIOR: "Junior",
  MID: "Mid-level",
  SENIOR: "Senior",
  LEAD: "Lead",
};

const COUNTRY_LABELS: Record<JobCountry, string> = {
  gb: "UK",
  de: "Germany",
  us: "US",
  global: "Global",
};

type ScrapeRun = {
  status: "running" | "done" | "error";
  jobsFound?: number;
  finishedAt?: string;
  error?: string | null;
};

type JobsTab = "matches" | "bookmarked";

export type JobsPageClientProps = {
  initialJobs: DashboardJob[];
  initialHasResume: boolean;
  initialSearchProfile: SearchProfile | null;
  initialWidenedFamilies: boolean;
  initialGlobalJobCount: number;
  initialQueryKey: string;
  profileSearchDefaults: JobSearchDefaults;
};

export function JobsPageClient({
  initialJobs,
  initialHasResume,
  initialSearchProfile,
  initialWidenedFamilies,
  initialGlobalJobCount,
  initialQueryKey,
  profileSearchDefaults,
}: JobsPageClientProps) {
  const router = useRouter();
  const defaultsSeeded = useRef(false);
  const skipInitialFetch = useRef(true);
  const widerScanTriggered = useRef(false);

  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [searchDraft, setSearchDraft] = useState(search);
  const [where, setWhere] = useQueryState("where", parseAsString.withDefault(""));
  const [whereDraft, setWhereDraft] = useState(where);
  const [country, setCountry] = useQueryState("country", countryParser);
  const [experienceLevel, setExperienceLevel] = useQueryState("level", levelParser);
  const [filter, setFilter] = useQueryState("filter", filterParser);

  const [jobs, setJobs] = useState<DashboardJob[]>(initialJobs);
  const [tab, setTab] = useState<JobsTab>("matches");
  const [loading, setLoading] = useState(false);
  const [hasResume, setHasResume] = useState(initialHasResume);
  const [searchProfile, setSearchProfile] = useState<SearchProfile | null>(
    initialSearchProfile,
  );
  const [widenedFamilies, setWidenedFamilies] = useState(initialWidenedFamilies);
  const [globalJobCount, setGlobalJobCount] = useState(initialGlobalJobCount);
  const [scrapeRun, setScrapeRun] = useState<ScrapeRun | null>(null);
  const [scraping, setScraping] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncRun, setSyncRun] = useState<ScrapeRun | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    setWhereDraft(where);
  }, [where]);

  useEffect(() => {
    if (defaultsSeeded.current) return;
    const hasCountry =
      typeof window !== "undefined" &&
      new URL(window.location.href).searchParams.has("country");
    const hasWhere =
      typeof window !== "undefined" &&
      new URL(window.location.href).searchParams.has("where");
    const hasLevel =
      typeof window !== "undefined" &&
      new URL(window.location.href).searchParams.has("level");

    if (!hasCountry && profileSearchDefaults.country !== "global") {
      void setCountry(profileSearchDefaults.country);
    }
    if (!hasWhere && profileSearchDefaults.where) {
      void setWhere(profileSearchDefaults.where);
      setWhereDraft(profileSearchDefaults.where);
    }
    if (!hasLevel && profileSearchDefaults.experienceLevel !== "ANY") {
      void setExperienceLevel(profileSearchDefaults.experienceLevel);
    }
    defaultsSeeded.current = true;
  }, [profileSearchDefaults, setCountry, setWhere, setExperienceLevel]);

  const savedCount = useMemo(() => jobs.filter((j) => j.saved).length, [jobs]);
  const unscoredCount = useMemo(
    () => jobs.filter((j) => !isJobScored(j)).length,
    [jobs],
  );

  const visibleJobs = useMemo(() => {
    if (tab === "bookmarked") return jobs.filter((j) => j.saved);
    return jobs;
  }, [jobs, tab]);

  const buildJobsQuery = useCallback(() => {
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) {
      params.set("q", q);
      params.set("mode", "search");
    } else {
      params.set("mode", "recommended");
    }
    params.set("level", experienceLevel);
    if (where.trim()) params.set("where", where.trim());
    if (filter !== "all") params.set("workMode", filter);
    if (country && country !== "global") params.set("country", country);
    return params.toString();
  }, [search, experienceLevel, where, filter, country]);

  const buildScrapeOverrides = useCallback(
    (overrides?: ScrapeOverrides): ScrapeOverrides => ({
      q: overrides?.q ?? (searchDraft.trim() || undefined),
      where: overrides?.where ?? (whereDraft.trim() || undefined),
      country: (overrides?.country ?? country) as JobCountry,
      experienceLevel: overrides?.experienceLevel ?? experienceLevel,
      maxDaysOld: overrides?.maxDaysOld,
    }),
    [searchDraft, whereDraft, country, experienceLevel],
  );

  const triggerScrape = useCallback(
    async (overrides?: ScrapeOverrides) => {
      setScraping(true);
      setError("");
      const body = buildScrapeOverrides(overrides);
      try {
        const res = await fetch("/api/jobs/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await parseApiResponse<{ error?: string; cached?: boolean }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Could not start wider scan.");
        }
        if (data.cached) {
          setScraping(false);
          return;
        }
        setScrapeRun({ status: "running" });
      } catch (err: unknown) {
        setScraping(false);
        setError(err instanceof Error ? err.message : "Could not start wider scan.");
      }
    },
    [buildScrapeOverrides],
  );

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    widerScanTriggered.current = false;
    try {
      const res = await fetch(`/api/jobs?${buildJobsQuery()}`);
      const data = await parseApiResponse<{
        jobs?: DashboardJob[];
        hasResume?: boolean;
        searchProfile?: SearchProfile;
        widenedFamilies?: boolean;
        cachedCount?: number;
        needsWiderScan?: boolean;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load jobs.");
      setJobs((data.jobs ?? []).map((j) => toDashboardJob(j)));
      setHasResume(data.hasResume ?? false);
      if (data.searchProfile) setSearchProfile(data.searchProfile);
      setWidenedFamilies(data.widenedFamilies ?? false);
      setGlobalJobCount(data.cachedCount ?? 0);

      if (data.needsWiderScan && !widerScanTriggered.current) {
        widerScanTriggered.current = true;
        void triggerScrape();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [buildJobsQuery, triggerScrape]);

  const clientQueryKey = useMemo(
    () =>
      jobsPageQueryKeyFromClient({
        q: search,
        experienceLevel,
        filter,
        country,
        where,
      }),
    [search, experienceLevel, filter, country, where],
  );

  useEffect(() => {
    if (skipInitialFetch.current && clientQueryKey === initialQueryKey) {
      skipInitialFetch.current = false;
      return;
    }
    void fetchJobs();
  }, [clientQueryKey, fetchJobs, initialQueryKey]);

  useEffect(() => {
    if (scrapeRun?.status !== "running") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/jobs/scrape");
        const data = await parseApiResponse<{ run?: ScrapeRun | null }>(res);
        setScrapeRun(data.run ?? null);
        if (data.run?.status !== "running") {
          setScraping(false);
          if (data.run?.status === "error" && data.run.error) {
            setError(data.run.error);
          }
          void fetchJobs();
        }
      } catch {
        setScraping(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [scrapeRun?.status, fetchJobs]);

  useEffect(() => {
    if (loading || unscoredCount === 0) return;
    const query = buildJobsQuery();
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 4000;
      if (elapsed >= 30000) {
        clearInterval(interval);
        return;
      }
      fetch(`/api/jobs?${query}`)
        .then((r) => parseApiResponse<{ jobs?: DashboardJob[] }>(r))
        .then((data) => {
          const updated = data.jobs ?? [];
          setJobs((prev) =>
            prev.map((job) => {
              const fresh = updated.find((u) => u.id === job.id);
              if (fresh && isJobScored(fresh) && !isJobScored(job)) {
                return { ...job, ...fresh };
              }
              return job;
            }),
          );
          if (updated.filter((j) => !isJobScored(j)).length === 0) {
            clearInterval(interval);
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [loading, unscoredCount, buildJobsQuery]);

  const runSearch = useCallback(() => {
    void setSearch(searchDraft.trim());
    void setWhere(whereDraft.trim());
  }, [searchDraft, whereDraft, setSearch, setWhere]);

  const triggerSyncIndex = async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/sync-ats", { method: "POST" });
      const data = await parseApiResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Could not refresh job index.");
      setSyncRun({ status: "running" });
    } catch (err: unknown) {
      setSyncing(false);
      setError(err instanceof Error ? err.message : "Could not refresh job index.");
    }
  };

  useEffect(() => {
    if (syncRun?.status !== "running") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/jobs/sync-ats");
        const data = await parseApiResponse<{
          run?: ScrapeRun | null;
          globalJobCount?: number;
        }>(res);
        setSyncRun(data.run ?? null);
        if (data.globalJobCount != null) setGlobalJobCount(data.globalJobCount);
        if (data.run?.status !== "running") {
          setSyncing(false);
          void fetchJobs();
        }
      } catch {
        setSyncing(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [syncRun?.status, fetchJobs]);

  const toggleSave = async (job: DashboardJob) => {
    const prevSaved = job.saved;
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, saved: !prevSaved } : j)),
    );
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: job.source,
          snapshot: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            locationType: job.type,
            description: job.description ?? "",
            url: job.url,
            source: job.source,
            requiredSkills: job.tags,
          },
        }),
      });
      const data = await parseApiResponse<{ saved?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Could not update bookmark.");
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, saved: data.saved ?? !prevSaved } : j,
        ),
      );
    } catch (err: unknown) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, saved: prevSaved } : j)),
      );
      setError(err instanceof Error ? err.message : "Could not update bookmark.");
    }
  };

  const isScraping = scraping || scrapeRun?.status === "running";
  const isSyncing = syncing || syncRun?.status === "running";
  const listMode = search.trim() ? "search" : "recommended";

  const filterChips = [
    where.trim() || null,
    COUNTRY_LABELS[country],
    LEVEL_LABELS[experienceLevel],
    filter !== "all" ? WORK_MODE_OPTIONS.find((o) => o.value === filter)?.label : null,
  ].filter(Boolean);

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-guava-green">
              Step 2
            </p>
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Target className="size-5 text-guava-green" />
              Choose your job listing
            </h2>
            <p className="text-sm text-muted-foreground">
              Search roles, compare fit scores, and bookmark favourites.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 self-start">
            <motion.button
              type="button"
              onClick={() => void triggerSyncIndex()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-lg border border-guava-green/25 bg-card/80 px-3 py-2 text-xs font-medium text-guava-green-dark disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <RefreshCw className="size-3" />
                  Refresh index
                </>
              )}
            </motion.button>
            <button
              type="button"
              onClick={() => void triggerScrape()}
              disabled={isScraping}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            >
              Search Google Jobs manually
            </button>
          </div>
        </div>

        <HeroSearchBar
          query={searchDraft}
          where={whereDraft}
          country={country}
          experienceLevel={experienceLevel}
          onQueryChange={setSearchDraft}
          onWhereChange={setWhereDraft}
          onCountryChange={(v) => void setCountry(v)}
          onExperienceLevelChange={(v) => void setExperienceLevel(v)}
          onSubmit={runSearch}
          isScanning={isScraping || loading}
        />

        {filterChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {filterChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-border bg-card px-2.5 py-1"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {WORK_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => void setFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === opt.value
                  ? "bg-guava-green-gradient text-white shadow-sm"
                  : "border border-guava-green/20 bg-card/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <RecommendedBanner
          searchProfile={searchProfile}
          mode={listMode}
          widenedFamilies={widenedFamilies}
        />

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {!hasResume ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
            <AlertCircle className="size-4 shrink-0 text-amber-500" />
            <span className="text-amber-800 dark:text-amber-300">
              Upload your resume to see fit scores.
            </span>
            <button
              type="button"
              onClick={() => router.push("/dashboard/resume")}
              className="ml-auto text-xs font-semibold text-amber-700 underline dark:text-amber-400"
            >
              Upload now
            </button>
          </div>
        ) : null}

        {isScraping ? (
          <div className="flex items-center gap-2 rounded-xl border border-guava-green/20 bg-guava-green-light/30 p-3 text-sm text-guava-green-dark">
            <Loader2 className="size-4 animate-spin" />
            Searching wider listings via Google Jobs…
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {loading
            ? "Loading…"
            : `${visibleJobs.length} listings · ${globalJobCount} in index`}
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {isScraping
                ? "No matches in cache — searching wider listings…"
                : "No jobs found"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground/80">
              Try a different search or widen the level filter to Any level.
            </p>
          </div>
        ) : (
          <JobsBoard jobs={visibleJobs} onToggleSave={toggleSave} />
        )}
      </div>
    </div>
  );
}
