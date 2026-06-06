"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { parseApiResponse } from "@/lib/parse-api-response";
import { trackJobAction } from "@/lib/applications/track-job";
import { TrackJobButton } from "@/components/dashboard/track-job-button";
import {
  Target, MapPin, Clock, Building2, ExternalLink,
  Search, SlidersHorizontal, Bookmark, BookmarkCheck,
  TrendingUp, Briefcase, RefreshCw, Loader2, AlertCircle
} from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  matchScore: number | null;
  matchReason: string | null;
  tags: string[];
  saved: boolean;
  url: string;
  source: string;
};

type ScrapeRun = {
  status: "running" | "done" | "error";
  jobsFound?: number;
  finishedAt?: string;
  error?: string | null;
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-secondary">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
        Scoring…
      </span>
    );
  }
  const color =
    score >= 85
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : score >= 70
      ? "bg-accent/10 text-accent border-accent/20"
      : "bg-muted text-muted-foreground border-border";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
      <TrendingUp className="w-3 h-3" /> {score}%
    </span>
  );
}

export default function JobMatcher() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<"all" | "remote" | "hybrid" | "onsite">("all");
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [scrapeRun, setScrapeRun] = useState<ScrapeRun | null>(null);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ filter });
      if (search) params.set("search", search);
      const res = await fetch(`/api/jobs?${params}`);
      const data = await parseApiResponse<{
        jobs?: Job[];
        hasResume?: boolean;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load jobs.");
      setJobs(data.jobs ?? []);
      setHasResume(data.hasResume ?? false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/jobs/scrape");
        const data = await parseApiResponse<{ run?: ScrapeRun | null }>(res);
        if (data.run) setScrapeRun(data.run);
        if (data.run?.status === "running") setScraping(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

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
          fetchJobs();
        }
      } catch {
        setScraping(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [scrapeRun?.status, fetchJobs]);

  // While scores are still computing in background, silently refresh every 4s
  // Stops once all visible jobs have scores (or after 60s max)
  useEffect(() => {
    if (loading) return;
    const unscoredCount = jobs.filter(j => j.matchScore === null).length;
    if (unscoredCount === 0) return; // all scored — nothing to poll

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 4000;
      if (elapsed >= 60000) { clearInterval(interval); return; } // 60s safety cutoff

      fetch(`/api/jobs?${new URLSearchParams({ filter, ...(search ? { search } : {}) })}`)
        .then((r) => parseApiResponse<{ jobs?: Job[] }>(r))
        .then((data) => {
          const updated: Job[] = data.jobs ?? [];
          // Only update scores — don't re-sort while user is browsing
          setJobs(prev => prev.map(job => {
            const fresh = updated.find(u => u.id === job.id);
            if (fresh && fresh.matchScore !== null && job.matchScore === null) {
              return { ...job, matchScore: fresh.matchScore, matchReason: fresh.matchReason };
            }
            return job;
          }));
          // If all scored now, stop polling
          const stillUnscored = updated.filter(j => j.matchScore === null).length;
          if (stillUnscored === 0) clearInterval(interval);
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [loading, jobs, filter, search]);

  const triggerScrape = async () => {
    setScraping(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/scrape", { method: "POST" });
      const data = await parseApiResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start job scan.");
      }
      setScrapeRun({ status: "running" });
    } catch (err: unknown) {
      setScraping(false);
      setError(err instanceof Error ? err.message : "Could not start job scan.");
    }
  };

  const toggleSave = async (job: Job) => {
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
            description: "",
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
      setError(
        err instanceof Error ? err.message : "Could not update bookmark.",
      );
    }
  };

  const isScraping = scraping || scrapeRun?.status === "running";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-widest text-guava-pink">Step 2</p>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Target className="size-5 text-accent" />
              Choose your job listing
            </h2>
            <p className="text-sm text-muted-foreground">
              Internships ranked by your match score — track any role to start your application.
            </p>
          </div>
          <motion.button
            onClick={triggerScrape}
            disabled={isScraping}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-guava-pink-gradient px-3 py-2 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isScraping
              ? <><Loader2 className="size-3 animate-spin" /> Scanning…</>
              : <><RefreshCw className="size-3" /> Scan jobs</>}
          </motion.button>
        </div>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* No resume banner */}
        {!hasResume && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-400">
              Upload your resume to see personalized match scores for each job.
            </span>
            <button
              onClick={() => router.push("/dashboard/resume")}
              className="ml-auto text-xs font-semibold text-amber-600 hover:text-amber-500 underline-offset-2 underline"
            >
              Upload now
            </button>
          </motion.div>
        )}

        {/* Scrape running banner */}
        {isScraping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-accent/20 bg-accent/5 text-sm"
          >
            <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
            <span className="text-accent">Fetching real listings from Google Jobs (SerpAPI)… This can take 30–90 seconds.</span>
          </motion.div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs or companies…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            {(["all", "remote", "hybrid", "onsite"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {f === "onsite" ? "On-site" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${jobs.length} real listings`}
          {scrapeRun?.status === "done" && scrapeRun.jobsFound !== undefined && (
            <span className="ml-2 text-green-600">· Last scan cached {scrapeRun.jobsFound} from Google Jobs</span>
          )}
        </p>

        {/* Job list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary grid place-items-center mb-4">
              <Target className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">No jobs found</p>
            <p className="text-xs text-muted-foreground/60">
              {search
                ? "Try a different search term."
                : `Click "Scan Jobs" to fetch real listings from Google Jobs (SerpAPI).`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => (
              <motion.div key={job.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="rounded-2xl border border-border bg-card p-5 hover:border-accent/20 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-secondary grid place-items-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-semibold truncate">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || "Not specified"}</span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.type}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.posted}</span>
                      <span className="text-muted-foreground/50 capitalize">{job.source}</span>
                    </div>
                    {job.matchReason && (
                      <p className="text-xs text-muted-foreground/70 mt-2 italic leading-relaxed">{job.matchReason}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags.slice(0, 6).map((tag) => (
                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <ScoreBadge score={job.matchScore} />
                    <form action={trackJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <TrackJobButton />
                    </form>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSave(job)}
                        className="w-8 h-8 rounded-lg border border-border grid place-items-center hover:bg-secondary transition-colors"
                      >
                        {job.saved
                          ? <BookmarkCheck className="w-4 h-4 text-accent" />
                          : <Bookmark className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <a
                        href={job.url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg border border-border grid place-items-center hover:bg-secondary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}