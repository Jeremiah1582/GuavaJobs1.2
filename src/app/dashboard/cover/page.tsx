"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  PenTool, ArrowLeft, Download, Copy, Check,
  Sparkles, Building2, Loader2, RefreshCw,
  FileText, AlertCircle, ChevronDown
} from "lucide-react";

type Job = { id: string; title: string; company: string };
type Letter = { id: string; jobId: string; jobTitle: string; company: string; tone: string; content: string };

const TONES = [
  { id: "professional", label: "Professional", desc: "Formal and confident" },
  { id: "friendly", label: "Friendly", desc: "Warm and approachable" },
  { id: "bold", label: "Bold", desc: "Direct and high-impact" },
];

export default function CoverLetters() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [history, setHistory] = useState<Letter[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(true);

  useEffect(() => {
    // Load saved jobs + existing letters in parallel
    Promise.all([
      fetch("/api/jobs?filter=all").then((r) => r.json()),
      fetch("/api/cover/generate").then((r) => r.json()),
    ]).then(([jobsData, lettersData]) => {
      // Show only saved jobs or all jobs if none saved
      const allJobs: any[] = jobsData.jobs ?? [];
      setHasResume(jobsData.hasResume ?? false);
      // Use saved jobs first, fallback to top scored
      const saved = allJobs.filter((j) => j.saved);
      setJobs((saved.length > 0 ? saved : allJobs.slice(0, 8)).map((j: any) => ({
        id: j.id, title: j.title, company: j.company,
      })));
      setHistory(lettersData.letters ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!selectedJob) return;
    setGenerating(true);
    setError("");
    setLetter(null);
    try {
      const res = await fetch("/api/cover/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.id, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      const newLetter: Letter = {
        id: data.id,
        jobId: selectedJob.id,
        jobTitle: data.jobTitle,
        company: data.company,
        tone,
        content: data.content,
      };
      setLetter(newLetter);
      setHistory((prev) => [newLetter, ...prev]);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!letter) return;
    navigator.clipboard.writeText(letter.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!letter) return;
    const blob = new Blob([letter.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${letter.company.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4 max-w-5xl mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-9 h-9 rounded-xl border border-border bg-card grid place-items-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold flex items-center gap-2">
              <PenTool className="w-5 h-5 text-green-500" /> Cover Letter Generator
            </h1>
            <p className="text-xs text-muted-foreground">
              Select a job and generate a personalized cover letter
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">
        {/* No resume warning */}
        {!hasResume && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-400">Upload your resume first to generate a truly personalized cover letter.</span>
            <button onClick={() => router.push("/dashboard/resume")}
              className="ml-auto text-xs font-semibold text-amber-600 hover:text-amber-500 underline underline-offset-2">
              Upload now
            </button>
          </motion.div>
        )}

        {/* Step 1: Job selection */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">Step 1</span>
            <span className="text-xs text-muted-foreground ml-1">— Select a job</span>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>No jobs yet. <button onClick={() => router.push("/dashboard/jobs")} className="text-accent underline underline-offset-2">Scan for jobs first</button></p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {jobs.map((job) => (
                <button key={job.id} onClick={() => setSelectedJob(job)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                    selectedJob?.id === job.id
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-border bg-background hover:border-accent/20"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary grid place-items-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                  {selectedJob?.id === job.id && <Check className="w-4 h-4 text-accent ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Step 2: Tone */}
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">Step 2</span>
              <span className="text-xs text-muted-foreground ml-1">— Choose tone</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {TONES.map((t) => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl border text-left transition-all ${
                    tone === t.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/20"
                  }`}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-destructive mt-3">{error}</p>}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleGenerate} disabled={generating}
              className="btn-ink flex items-center gap-2 text-sm px-5 py-2.5 mt-5"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><PenTool className="w-4 h-4" /> Generate Cover Letter</>}
            </motion.button>
          </motion.div>
        )}

        {/* Generated letter */}
        <AnimatePresence>
          {letter && (
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-semibold tracking-[2px] uppercase text-green-600">
                    {letter.jobTitle} · {letter.company}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                  <button onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button onClick={handleGenerate} disabled={generating}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed bg-background rounded-xl p-6 border border-border">
                {letter.content}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && !letter && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-xs font-semibold tracking-[2px] uppercase text-muted-foreground">Previous Letters</p>
            {history.slice(0, 5).map((l) => (
              <button key={l.id} onClick={() => setLetter(l)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/20 transition-all text-left"
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.jobTitle} — {l.company}</p>
                  <p className="text-xs text-muted-foreground capitalize">{l.tone} tone</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto rotate-[-90deg]" />
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}