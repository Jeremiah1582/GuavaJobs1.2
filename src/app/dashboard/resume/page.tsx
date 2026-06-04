"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseApiResponse } from "@/lib/parse-api-response";
import {
  applyResumeToProfileAction,
  getProfileCompletenessAction,
} from "@/lib/profile/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Upload, CheckCircle, AlertTriangle, ArrowLeft,
  Star, TrendingUp, FileUp, Loader2, BarChart3, Award,
  RefreshCw, XCircle, Zap, Target, BookOpen, Code,
  ChevronDown, ChevronUp, Info, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Improvement = {
  priority: "critical" | "high" | "medium";
  title: string;
  issue: string;
  fix: string;
  impact: string;
};

type Strength = {
  title: string;
  detail: string;
};

type SectionScores = {
  contact: number;
  summary: number;
  experience: number;
  education: number;
  skills: number;
  projects: number;
};

type ResumeResult = {
  id: string;
  filename: string;
  atsScore: number;
  grade: string;
  passesATS: boolean;
  summary: string;
  technicalSkills: string[];
  softSkills: string[];
  skills: string[];
  keywords: string[];
  missingKeywords: string[];
  strengths: (Strength | string)[];
  improvements: (Improvement | string)[];
  sectionScores: SectionScores;
  stats: {
    wordCount: number;
    estimatedPages: number;
    bulletCount: number;
    quantifiedCount: number;
    weakVerbs: string[];
  };
  experience: { title: string; company: string; duration: string }[];
  education: { degree: string; institution: string; year: string; gpa?: string }[];
};

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" :
    score >= 65 ? "#f59e0b" :
    score >= 50 ? "#f97316" : "#ef4444";

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="52" fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="font-display text-4xl font-bold"
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">ATS Score</span>
        <span className="text-lg font-bold mt-0.5" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

// ─── Section score bar ────────────────────────────────────────────────────────

function SectionBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-amber-500" :
    score >= 40 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-foreground capitalize">{label}</span>
        <span className="text-xs font-bold text-foreground">{score}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        />
      </div>
    </div>
  );
}

// ─── Improvement card ─────────────────────────────────────────────────────────

// FIX: accept weakVerbs as prop so verb suggestions are dynamic, not hardcoded
function ImprovementCard({
  imp,
  index,
  weakVerbs,
}: {
  imp: Improvement | string;
  index: number;
  weakVerbs?: string[];
}) {
  const [expanded, setExpanded] = useState(index < 2);

  if (typeof imp === "string") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground">{imp}</p>
      </div>
    );
  }

  const cfg = {
    critical: {
      wrap:      "border-red-500/30 bg-red-500/5",
      badge:     "bg-red-500/15 text-red-500 border-red-500/30",
      body:      "border-red-500/20",
      icon:      XCircle,
      iconColor: "text-red-500",
      label:     "Critical",
    },
    high: {
      wrap:      "border-amber-500/30 bg-amber-500/5",
      badge:     "bg-amber-500/15 text-amber-600 border-amber-500/30",
      body:      "border-amber-500/20",
      icon:      AlertTriangle,
      iconColor: "text-amber-500",
      label:     "High",
    },
    medium: {
      wrap:      "border-blue-500/30 bg-blue-500/5",
      badge:     "bg-blue-500/15 text-blue-500 border-blue-500/30",
      body:      "border-blue-500/20",
      icon:      Info,
      iconColor: "text-blue-500",
      label:     "Medium",
    },
  }[imp.priority] ?? {
    wrap:      "border-border bg-card",
    badge:     "bg-secondary text-muted-foreground border-border",
    body:      "border-border",
    icon:      Info,
    iconColor: "text-muted-foreground",
    label:     "Note",
  };

  const Icon     = cfg.icon;
  const fixLines = imp.fix?.split("\n").filter(Boolean) ?? [];
  const isVerbCard = imp.title?.toLowerCase().includes("verb");
  const isQuantCard = imp.title?.toLowerCase().includes("quantif");

  return (
    <div className={`rounded-xl border ${cfg.wrap} overflow-hidden`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.label}
            </span>
            {imp.impact && (
              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/25">
                {imp.impact}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{imp.title}</p>
          {!expanded && imp.issue && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{imp.issue}</p>
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className={`px-4 pb-4 pt-3 space-y-3 border-t ${cfg.body}`}>

          {/* What's wrong */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              ⚠ What's wrong
            </p>
            <p className="text-sm text-foreground leading-relaxed">{imp.issue}</p>
          </div>

          {/* How to fix */}
          {imp.fix && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                ✦ How to fix
              </p>
              {fixLines.length > 1 ? (
                <div className="space-y-2">
                  {fixLines.map((line, i) => {
                    const isBefore = line.toLowerCase().startsWith("before") || line.includes("✗") || line.includes("❌");
                    const isAfter  = line.toLowerCase().startsWith("after")  || line.includes("✓") || line.includes("✅") || line.includes("→");
                    return (
                      <div
                        key={i}
                        className={`text-xs px-3 py-2 rounded-lg border font-mono leading-relaxed ${
                          isBefore
                            ? "bg-red-500/8 border-red-500/20 text-red-700 dark:text-red-300"
                            : isAfter
                            ? "bg-green-500/8 border-green-500/20 text-green-700 dark:text-green-300"
                            : "bg-background/60 border-border/50 text-foreground"
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-foreground leading-relaxed bg-background/60 rounded-lg px-3 py-2.5 border border-border/50">
                  {imp.fix}
                </div>
              )}
            </div>
          )}

          {/* FIX: Dynamic weak verbs from actual resume — no longer hardcoded */}
          {isVerbCard && weakVerbs && weakVerbs.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                💡 Detected weak verbs — replace these
              </p>
              <div className="flex flex-wrap gap-2">
                {weakVerbs.map((verb) => (
                  <div
                    key={verb}
                    className="flex items-center gap-1.5 text-xs rounded-lg border border-red-500/20 px-2.5 py-1.5 bg-red-500/5"
                  >
                    <span className="text-red-500 line-through font-mono">{verb}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold font-mono">
                      {verbReplacement(verb)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Strong alternatives: built · engineered · optimized · deployed · led · drove · delivered
              </p>
            </div>
          )}

          {/* Quantification guide */}
          {isQuantCard && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                💡 Quantification formula
              </p>
              <div className="space-y-1.5">
                {[
                  {
                    bad:  "Improved application performance",
                    good: "Reduced API response time by 40% using Redis caching",
                  },
                  {
                    bad:  "Built a web app for users",
                    good: "Built a React dashboard serving 500+ daily active users",
                  },
                  {
                    bad:  "Worked on ML model",
                    good: "Trained ResNet-50 model achieving 94.2% accuracy on 10k images",
                  },
                ].map((ex, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-xs px-3 py-1.5 rounded-lg border bg-red-500/8 border-red-500/20 text-red-700 dark:text-red-300 font-mono">
                      ✗ {ex.bad}
                    </div>
                    <div className="text-xs px-3 py-1.5 rounded-lg border bg-green-500/8 border-green-500/20 text-green-700 dark:text-green-300 font-mono">
                      ✓ {ex.good}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// FIX: map detected weak verbs to smart replacements
function verbReplacement(verb: string): string {
  const map: Record<string, string> = {
    "helped":           "supported",
    "worked":           "engineered",
    "did":              "executed",
    "made":             "built",
    "got":              "achieved",
    "used":             "leveraged",
    "was":              "led",
    "were":             "delivered",
    "assisted":         "accelerated",
    "supported":        "enabled",
    "involved":         "drove",
    "participated":     "contributed",
    "contributed to":   "spearheaded",
    "responsible for":  "led",
    "duties included":  "delivered",
    "tasks included":   "executed",
  };
  return map[verb.toLowerCase()] ?? "drove";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResumeAnalyzer() {
  const router = useRouter();
  const [file, setFile]               = useState<File | null>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [status, setStatus]           = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [result, setResult]           = useState<ResumeResult | null>(null);
  const [error, setError]             = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileOverwriteOpen, setProfileOverwriteOpen] = useState(false);
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(null);
  const [profileSyncing, setProfileSyncing] = useState(false);

  const offerProfileSyncFromResume = useCallback(
    async (resume: ResumeResult) => {
      if (!resume.id) return;

      const completeness = await getProfileCompletenessAction();
      if ("error" in completeness) {
        console.warn("[resume] completeness check:", completeness.error);
        return;
      }

      if (completeness.percent === 100) {
        setPendingResumeId(resume.id);
        setProfileOverwriteOpen(true);
        return;
      }

      setProfileSyncing(true);
      try {
        const result = await applyResumeToProfileAction(resume.id, "merge");
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        if (!result.updated) {
          toast.message("No new profile fields to fill from this scan.");
          return;
        }
        toast.success("Profile updated from your scan", {
          action: {
            label: "View profile",
            onClick: () => router.push("/dashboard/profile"),
          },
        });
      } finally {
        setProfileSyncing(false);
      }
    },
    [router],
  );

  const confirmProfileOverwrite = useCallback(async () => {
    if (!pendingResumeId) return;
    setProfileSyncing(true);
    try {
      const result = await applyResumeToProfileAction(
        pendingResumeId,
        "overwrite",
      );
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (!result.updated) {
        toast.message("No profile fields were replaced from this scan.");
        return;
      }
      toast.success("Profile replaced with data from this scan", {
        action: {
          label: "View profile",
          onClick: () => router.push("/dashboard/profile"),
        },
      });
      setProfileOverwriteOpen(false);
      setPendingResumeId(null);
    } finally {
      setProfileSyncing(false);
    }
  }, [pendingResumeId, router]);

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => parseApiResponse<{ resume?: ResumeResult }>(r))
      .then((data) => { if (data.resume) setResult(data.resume); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!isPdfFile(f)) { setError("Please upload a PDF file."); return; }
    if (f.size > 5 * 1024 * 1024)    { setError("File too large. Max 5MB.");   return; }
    setFile(f); setError(""); setResult(null); setStatus("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setError("");

    setStatus("analyzing");
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res  = await fetch("/api/resume/upload", { method: "POST", body: formData });
      const data = await parseApiResponse<{ error?: string; resume?: ResumeResult }>(res);
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      const uploaded = data.resume;
      setResult(uploaded ?? null);
      setFile(null);
      setStatus("done");
      if (uploaded) {
        void offerProfileSyncFromResume(uploaded);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setStatus("error");
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAnalyzing = status === "analyzing";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <FileText className="w-5 h-5 text-blue-500" /> ATS Resume Analyzer
            </h1>
            <p className="text-xs text-muted-foreground">
              {result
                ? `${result.filename} · Score: ${result.atsScore}/100 · Grade: ${result.grade}`
                : "Enterprise-grade ATS scan — same logic as Taleo, Workday & Greenhouse"}
            </p>
          </div>
          {result && (
            <button
              onClick={() => { setResult(null); setFile(null); setError(""); setStatus("idle"); }}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> New Scan
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-8">

        {/* Upload area */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
              dragOver        ? "border-accent bg-accent/5 scale-[1.01]"
              : file          ? "border-green-500/30 bg-green-500/5"
              : "border-border bg-card hover:border-accent/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 grid place-items-center">
                  <FileUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}

                {isAnalyzing && (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    <p className="text-sm text-muted-foreground">
                      Running enterprise ATS scan…
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {status === "analyzing" ? "Checking sections, keywords, formatting, quantification…" : ""}
                    </p>
                  </div>
                )}

                {!isAnalyzing && (
                  <div className="flex gap-3 mt-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAnalyze}
                      className="btn-ink flex items-center gap-2 text-sm px-5 py-2.5"
                    >
                      <BarChart3 className="w-4 h-4" /> Run ATS Scan
                    </motion.button>
                    <button
                      onClick={() => { setFile(null); setError(""); setStatus("idle"); }}
                      className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center gap-4 cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-secondary grid place-items-center">
                  <Upload className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Drop your resume here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF only · max 5MB</p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {["Section Detection", "Keyword Density", "Quantified Bullets", "Weak Verbs", "Format Issues", "ATS Keywords"].map((item) => (
                    <span
                      key={item}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            )}
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Score + Pass/Fail + Summary */}
              <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                  <div className="flex flex-col items-center gap-3 flex-shrink-0">
                    <ScoreRing score={result.atsScore} grade={result.grade || "C"} />
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                      result.passesATS
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}>
                      {result.passesATS
                        ? <><CheckCircle className="w-3.5 h-3.5" /> Likely passes ATS</>
                        : <><XCircle    className="w-3.5 h-3.5" /> May be filtered by ATS</>}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">AI Assessment</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{result.summary}</p>

                    {/* Quick stats */}
                    {result.stats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          {
                            label: "Word Count",
                            value: result.stats.wordCount,
                            // FIX: 300-800 is ideal; flag red below 200 or above 1000
                            ok:    result.stats.wordCount >= 200 && result.stats.wordCount <= 1000,
                          },
                          {
                            label: "Est. Pages",
                            value: result.stats.estimatedPages,
                            // FIX: 1-2 pages is acceptable — was strict === 1
                            ok:    result.stats.estimatedPages <= 2,
                          },
                          {
                            label: "Bullet Points",
                            value: result.stats.bulletCount,
                            ok:    result.stats.bulletCount >= 8,
                          },
                          {
                            label: "Quantified",
                            value: result.stats.quantifiedCount,
                            ok:    result.stats.quantifiedCount >= 4,
                          },
                        ].map((s) => (
                          <div
                            key={s.label}
                            className={`rounded-xl p-3 border text-center ${
                              s.ok
                                ? "border-green-500/20 bg-green-500/5"
                                : "border-red-500/20 bg-red-500/5"
                            }`}
                          >
                            <p className={`font-display text-xl font-bold ${s.ok ? "text-green-500" : "text-red-500"}`}>
                              {s.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Weak verbs warning */}
                    {result.stats?.weakVerbs?.length > 0 && (
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          <strong>Weak verbs detected:</strong>{" "}
                          "{result.stats.weakVerbs.slice(0, 4).join('", "')}"
                          {" "}— replace with: built, developed, engineered, optimized, delivered
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section scores */}
              {result.sectionScores && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">Section Breakdown</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(result.sectionScores).map(([key, score]) => (
                      <SectionBar key={key} label={key} score={score} />
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {result.improvements?.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">
                        What to Fix ({result.improvements.length} items)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Expand each to see how to fix</p>
                  </div>
                  <div className="space-y-3">
                    {result.improvements.map((imp, i) => (
                      <ImprovementCard
                        key={i}
                        imp={imp}
                        index={i}
                        // FIX: pass actual detected weak verbs so the card is dynamic
                        weakVerbs={result.stats?.weakVerbs}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {result.strengths?.length > 0 && (
                <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold tracking-[2px] uppercase text-green-600">What's Working</span>
                  </div>
                  <div className="space-y-3">
                    {result.strengths.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <Star className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          {typeof s === "string" ? (
                            <p className="text-sm text-foreground">{s}</p>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-foreground">{s.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold tracking-[2px] uppercase text-green-600">Keywords Found</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords?.slice(0, 15).map((kw) => (
                      <span
                        key={kw}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                      >
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {result.missingKeywords?.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-semibold tracking-[2px] uppercase text-red-500">Missing Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        >
                          + {kw}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Add these naturally to your skills/experience sections
                    </p>
                  </div>
                )}
              </div>

              {/* Technical Skills + Soft Skills */}
              <div className="grid md:grid-cols-2 gap-4">
                {(result.technicalSkills?.length > 0 || result.skills?.length > 0) && (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-semibold tracking-[2px] uppercase text-blue-500">Technical Skills</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {(result.technicalSkills ?? result.skills ?? []).length} detected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(result.technicalSkills ?? result.skills ?? []).map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.softSkills?.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold tracking-[2px] uppercase text-purple-400">Soft Skills</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {result.softSkills.length} detected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.softSkills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    {result.softSkills.length < 3 && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Tip: Add soft skills like "agile", "cross-functional", "collaboration" to your summary or experience bullets.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Experience + Education */}
              {(result.experience?.length > 0 || result.education?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4 pb-8">
                  {result.experience?.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold tracking-[2px] uppercase text-purple-400">Experience</span>
                      </div>
                      <ul className="space-y-3">
                        {result.experience.map((e, i) => (
                          <li key={i} className="border-l-2 border-border pl-3">
                            <p className="text-sm font-medium">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{e.company}</p>
                            <p className="text-[10px] text-muted-foreground/60">{e.duration}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.education?.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Award className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-semibold tracking-[2px] uppercase text-blue-500">Education</span>
                      </div>
                      <ul className="space-y-3">
                        {result.education.map((e, i) => (
                          <li key={i} className="border-l-2 border-border pl-3">
                            <p className="text-sm font-medium">{e.degree}</p>
                            <p className="text-xs text-muted-foreground">{e.institution}</p>
                            <p className="text-[10px] text-muted-foreground/60">
                              {e.year}{e.gpa ? ` · GPA: ${e.gpa}` : ""}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AlertDialog
        open={profileOverwriteOpen}
        onOpenChange={setProfileOverwriteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace profile with scan data?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile is already complete. Replacing will overwrite your
              summary, skills, experience, and education with data from this
              scan. You can edit everything afterward on your profile page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={profileSyncing}>
              Keep current profile
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={profileSyncing}
              onClick={(e) => {
                e.preventDefault();
                void confirmProfileOverwrite();
              }}
            >
              {profileSyncing ? "Updating…" : "Replace from scan"}
            </AlertDialogAction>
          </AlertDialogFooter>
          <p className="px-6 pb-4 text-center text-xs text-muted-foreground">
            <Link
              href="/dashboard/profile"
              className="underline underline-offset-2 hover:text-foreground"
            >
              View profile
            </Link>
          </p>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}