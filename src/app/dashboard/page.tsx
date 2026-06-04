"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, Target, PenTool, MessageSquare,
  LogOut, Home, ChevronRight, TrendingUp, Clock, Sparkles,
  Upload, ArrowRight, BarChart3, Zap, CheckCircle, AlertCircle,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

// "abhinavshakya063" → "Abhinavshakya"  |  "Abhinav Shakya" → "Abhinav Shakya"
function formatName(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  if (email) {
    const prefix = email.split("@")[0];
    const cleaned = prefix
      .replace(/\d+$/, "")          // strip trailing digits
      .replace(/[._-]+/g, " ")      // dots/underscores/dashes → spaces
      .trim();
    return cleaned
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return "there";
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : "U";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Activity = { label: string; time: string; icon: "resume" | "cover" | "jobs" };

type DashStats = {
  resumeScore: number | null;
  resumeFilename: string | null;
  jobsCount: number;
  coverLettersCount: number;
  avgMatchScore: number | null;
  hasResume: boolean;
  activity: Activity[];
};

// ─── Static config ────────────────────────────────────────────────────────────

const navItems = [
  { icon: LayoutDashboard, label: "Overview",        href: "/dashboard" },
  { icon: FileText,        label: "Resume Analyzer", href: "/dashboard/resume" },
  { icon: Target,          label: "Job Matcher",     href: "/dashboard/jobs" },
  { icon: PenTool,         label: "Cover Letters",   href: "/dashboard/cover" },
  { icon: MessageSquare,   label: "AI Assistant",    href: "/dashboard/chat" },
];

const quickActions = [
  {
    icon: Upload, title: "Analyze Resume",
    desc: "Upload your PDF and get an instant AI analysis with ATS score.",
    cta: "Upload PDF", href: "/dashboard/resume",
    accent: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20",
    iconBg: "bg-blue-500/10", iconColor: "text-blue-500", badge: "Most Popular",
  },
  {
    icon: Target, title: "Browse Job Matches",
    desc: "See all scraped internships ranked by your personal match score.",
    cta: "View Matches", href: "/dashboard/jobs",
    accent: "from-amber-500/10 to-amber-600/5", border: "border-amber-500/20",
    iconBg: "bg-amber-500/10", iconColor: "text-amber-500", badge: "Live Jobs",
  },
  {
    icon: PenTool, title: "Generate Cover Letter",
    desc: "Pick a job, get a personalized cover letter in seconds.",
    cta: "Start Writing", href: "/dashboard/cover",
    accent: "from-green-500/10 to-green-600/5", border: "border-green-500/20",
    iconBg: "bg-green-500/10", iconColor: "text-green-500", badge: null,
  },
  {
    icon: MessageSquare, title: "AI Career Assistant",
    desc: "Ask anything — role advice, interview prep, offer comparisons.",
    cta: "Start Chatting", href: "/dashboard/chat",
    accent: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20",
    iconBg: "bg-purple-500/10", iconColor: "text-purple-400", badge: "AI Powered",
  },
];

const tips = [
  "Upload your resume first — everything else gets smarter once we know your profile.",
  "A 90%+ ATS score dramatically increases recruiter callbacks.",
  "Cover letters tailored to each job description get 3× more responses.",
  "Your data stays local — nothing leaves your machine except AI API calls.",
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed, setCollapsed, displayName, email, initials, onHome,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  displayName: string;
  email: string;
  initials: string;
  onHome: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed left-0 top-0 h-screen bg-primary text-primary-foreground flex flex-col z-40 overflow-hidden border-r border-primary-foreground/10"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-foreground/10 flex-shrink-0">
        <div className="w-9 h-9 bg-accent rounded-xl grid place-items-center flex-shrink-0">
          <span className="font-display text-primary text-lg font-bold">I</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}
              className="font-display text-base font-semibold tracking-tight whitespace-nowrap"
            >
              InternHunt
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`ml-auto p-1.5 rounded-lg hover:bg-primary-foreground/10 transition-colors flex-shrink-0 ${collapsed ? "mx-auto" : ""}`}
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
            <ChevronRight className="w-4 h-4 text-primary-foreground/60" />
          </motion.div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <motion.button
              key={item.href}
              onClick={() => router.push(item.href)}
              whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                active
                  ? "bg-accent text-primary"
                  : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary" : ""}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-accent rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-primary-foreground/10 p-3 space-y-1">
        <button
          onClick={onHome}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm font-medium whitespace-nowrap">
                Back to home
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <SignOutButton className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span className="text-sm font-medium whitespace-nowrap">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </SignOutButton>

        {/* User chip */}
        <div className={`flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-xl bg-primary-foreground/5 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-accent grid place-items-center flex-shrink-0">
            <span className="text-primary font-display text-xs font-bold">{initials}</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                <p className="text-xs font-medium text-primary-foreground truncate max-w-[150px]">{displayName}</p>
                <p className="text-[10px] text-primary-foreground/40 truncate max-w-[150px]">{email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [dashStats, setDashStats] = useState<DashStats>({
    resumeScore: null, resumeFilename: null,
    jobsCount: 0, coverLettersCount: 0,
    avgMatchScore: null, hasResume: false, activity: [],
  });

  const [user, setUser] = useState<{ name: string; email: string }>({
    name: "",
    email: "",
  });

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getUser().then(({ data }) => {
      const authUser = data.user;
      if (!authUser?.email) return;
      const metaName =
        typeof authUser.user_metadata?.full_name === "string"
          ? authUser.user_metadata.full_name
          : typeof authUser.user_metadata?.name === "string"
            ? authUser.user_metadata.name
            : "";
      setUser({
        email: authUser.email,
        name: metaName || authUser.email,
      });
    });
  }, []);

  // Rotate tips
  useEffect(() => {
    const t = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Load real stats from APIs
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      try {
        const [resumeRes, jobsRes, coverRes] = await Promise.all([
          fetch("/api/resume"),
          fetch("/api/jobs?filter=all"),
          fetch("/api/cover/generate"),
        ]);
        const [resumeData, jobsData, coverData] = await Promise.all([
          resumeRes.json(), jobsRes.json(), coverRes.json(),
        ]);

        const resume = resumeData.resume;
        const jobs: any[] = jobsData.jobs ?? [];
        const letters: any[] = coverData.letters ?? [];

        const scored = jobs.filter((j) => j.matchScore !== null);
        const avg = scored.length
          ? Math.round(scored.reduce((s, j) => s + j.matchScore, 0) / scored.length)
          : null;

        const activity: Activity[] = [];
        if (resume) activity.push({
          label: `Resume analyzed — ATS score: ${resume.atsScore}`,
          time: new Date(resume.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          icon: "resume",
        });
        letters.slice(0, 2).forEach((l: any) => activity.push({
          label: `Cover letter for ${l.jobTitle} at ${l.company}`,
          time: new Date(l.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          icon: "cover",
        }));
        if (jobs.length > 0) activity.push({
          label: `${jobs.length} internships loaded`,
          time: "Recently", icon: "jobs",
        });

        setDashStats({
          resumeScore: resume?.atsScore ?? null,
          resumeFilename: resume?.filename ?? null,
          jobsCount: jobs.length,
          coverLettersCount: letters.length,
          avgMatchScore: avg,
          hasResume: !!resume,
          activity,
        });
      } catch (e) {
        console.error("[dashboard] stats error:", e);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const handleHome = () => router.push("/");

  const displayName = formatName(user.name, user.email);
  const initials = getInitials(user.name, user.email);
  const firstName = displayName.split(" ")[0];
  const greeting = getGreeting();
  const sidebarWidth = collapsed ? 72 : 260;

  const steps = [
    { label: "Upload Resume",         done: dashStats.hasResume },
    { label: "Browse Jobs",           done: dashStats.jobsCount > 0 },
    { label: "Generate Cover Letter", done: dashStats.coverLettersCount > 0 },
  ];
  const allDone = steps.every((s) => s.done);

  const statsCards = [
    {
      label: "ATS Score", icon: FileText, color: "text-blue-500",
      value: dashStats.resumeScore !== null ? `${dashStats.resumeScore}` : "—",
      sub: dashStats.resumeFilename ?? "No resume yet",
    },
    {
      label: "Jobs Matched", icon: Target, color: "text-amber-500",
      value: `${dashStats.jobsCount}`,
      sub: dashStats.jobsCount > 0 ? "Tap to browse" : "Scan to find jobs",
    },
    {
      label: "Cover Letters", icon: PenTool, color: "text-green-500",
      value: `${dashStats.coverLettersCount}`,
      sub: dashStats.coverLettersCount > 0 ? "Generated" : "None yet",
    },
    {
      label: "Avg Match Score", icon: BarChart3, color: "text-purple-400",
      value: dashStats.avgMatchScore !== null ? `${dashStats.avgMatchScore}%` : "—",
      sub: dashStats.avgMatchScore !== null ? "Across all jobs" : "Upload resume first",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        collapsed={collapsed} setCollapsed={setCollapsed}
        displayName={displayName} email={user.email ?? ""}
        initials={initials} onHome={handleHome}
      />

      <motion.main
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-1 min-h-screen"
      >
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary grid place-items-center">
            <span className="text-accent font-display text-sm font-bold">{initials}</span>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-8 max-w-6xl">

          {/* Onboarding banner — disappears once all 3 steps done */}
          {!allDone && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/8 via-accent/5 to-transparent p-6 lg:p-8 overflow-hidden"
            >
              {/* Decorative circles */}
              <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none">
                <div className="absolute top-4 right-8 w-24 h-24 rounded-full border-2 border-accent" />
                <div className="absolute top-8 right-16 w-12 h-12 rounded-full border border-accent" />
                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-lg border border-accent rotate-12" />
              </div>

              <div className="flex flex-col lg:flex-row items-start justify-between gap-6 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">Get Started</span>
                  </div>
                  <h2 className="font-display text-2xl lg:text-3xl font-semibold mb-2">
                    {dashStats.hasResume
                      ? "Great start! Explore your matches."
                      : "Upload your resume to unlock everything."}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                    {dashStats.hasResume
                      ? "Your resume is analyzed. Now scan for jobs and generate cover letters tailored to you."
                      : "Once we analyze your resume, job matching, cover letters, and AI advice all become personalized."}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(dashStats.hasResume ? "/dashboard/jobs" : "/dashboard/resume")}
                  className="btn-ink flex items-center gap-2 text-sm px-5 py-3 flex-shrink-0"
                >
                  {dashStats.hasResume
                    ? <><Target className="w-4 h-4" /> Browse Jobs</>
                    : <><Upload className="w-4 h-4" /> Upload Resume</>}
                </motion.button>
              </div>

              {/* Progress steps */}
              <div className="flex items-center gap-3 mt-6 relative z-10 flex-wrap">
                {steps.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full border-2 grid place-items-center flex-shrink-0 transition-colors ${
                      s.done ? "border-accent bg-accent" : "border-border bg-background"
                    }`}>
                      {s.done && <CheckCircle className="w-3 h-3 text-primary" />}
                    </div>
                    <span className={`text-xs font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </span>
                    {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, i) => (
              <motion.div key={stat.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-accent/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary grid place-items-center">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {statsLoading && (
                    <div className="w-3.5 h-3.5 border border-muted rounded-full border-t-accent animate-spin mt-1" />
                  )}
                </div>
                <p className="font-display text-2xl font-bold mb-0.5">
                  {statsLoading ? <span className="text-muted-foreground/40">—</span> : stat.value}
                </p>
                <p className="text-xs font-medium text-foreground mb-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick action cards */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-semibold">Tools</h2>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-accent" /> Powered by OpenRouter
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {quickActions.map((action, i) => (
                <motion.div key={action.title}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => router.push(action.href)}
                  className={`relative rounded-2xl border ${action.border} bg-gradient-to-br ${action.accent} p-6 cursor-pointer group overflow-hidden hover:shadow-xl transition-shadow duration-300`}
                >
                  {action.badge && (
                    <span className="absolute top-4 right-4 text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-background/80 border border-border text-muted-foreground backdrop-blur-sm">
                      {action.badge}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl ${action.iconBg} grid place-items-center mb-4`}>
                    <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-1.5">{action.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{action.desc}</p>
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${action.iconColor} group-hover:gap-2.5 transition-all duration-200`}>
                    {action.cta} <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid md:grid-cols-2 gap-4 pb-8">

            {/* Tip carousel */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent" />
                <span className="text-xs font-semibold tracking-[2px] uppercase text-accent">Pro Tip</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={tipIndex}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
                  className="text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]"
                >
                  {tips[tipIndex]}
                </motion.p>
              </AnimatePresence>
              <div className="flex gap-1.5 mt-4">
                {tips.map((_, i) => (
                  <button key={i} onClick={() => setTipIndex(i)}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === tipIndex ? "w-6 bg-accent" : "w-1.5 bg-border hover:bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Recent activity — real data */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold tracking-[2px] uppercase text-muted-foreground">
                  Recent Activity
                </span>
              </div>

              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-secondary rounded animate-pulse w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : dashStats.activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary grid place-items-center mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">No activity yet</p>
                  <p className="text-xs text-muted-foreground/60">Start by uploading your resume.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {dashStats.activity.map((a, i) => {
                    const Icon = a.icon === "resume" ? FileText : a.icon === "cover" ? PenTool : Target;
                    const color =
                      a.icon === "resume" ? "text-blue-500 bg-blue-500/10"
                      : a.icon === "cover" ? "text-green-500 bg-green-500/10"
                      : "text-amber-500 bg-amber-500/10";
                    return (
                      <motion.li key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.08 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{a.label}</p>
                          <p className="text-[10px] text-muted-foreground">{a.time}</p>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </motion.div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}