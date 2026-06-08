"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Loader2, MoveRight, TrendingDown, TrendingUp } from "lucide-react";

import type { MatchBreakdown } from "@/lib/job-matcher/types";
import { parseApiResponse } from "@/lib/parse-api-response";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TrajectoryLabel = "Step forward" | "Lateral move" | "Tangential" | "Different direction";

function trajectoryStyle(label: TrajectoryLabel) {
  switch (label) {
    case "Step forward":
      return { color: "text-green-700 border-green-500/30 bg-green-500/8", icon: ArrowUpRight };
    case "Lateral move":
      return { color: "text-blue-700 border-blue-500/30 bg-blue-500/8", icon: MoveRight };
    case "Tangential":
      return { color: "text-amber-700 border-amber-500/30 bg-amber-500/8", icon: ArrowRight };
    case "Different direction":
      return { color: "text-rose-700 border-rose-500/30 bg-rose-500/8", icon: TrendingDown };
  }
}

function TrajectoryChip({ dimensions }: { dimensions?: import("@/lib/job-matcher/types").MatchDimension[] }) {
  const traj = dimensions?.find((d) => d.key === "careerTrajectory");
  if (!traj) return null;

  const label = traj.label as TrajectoryLabel;
  const { color, icon: Icon } = trajectoryStyle(label);

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border mb-2 ${color}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{label}</span>
      <span className="text-[10px] opacity-70">({traj.score}%)</span>
    </div>
  );
}

type MatchFitBadgeProps = {
  jobId: string;
  overallFitScore: number | null;
  userFitsRoleScore: number | null;
  roleFitsUserScore: number | null;
  matchReason: string | null;
  matchBreakdown: MatchBreakdown | null;
};

function scoreColor(score: number | null) {
  if (score === null) return "bg-secondary text-muted-foreground border-border";
  if (score >= 85) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (score >= 70) return "bg-accent/10 text-accent border-accent/20";
  return "bg-muted text-muted-foreground border-border";
}

function SubScore({
  label,
  score,
  children,
}: {
  label: string;
  score: number | null;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors hover:opacity-80 ${scoreColor(score)}`}
        >
          {label} {score === null ? "—" : `${score}%`}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="end">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function MatchFitBadge({
  jobId,
  overallFitScore,
  userFitsRoleScore,
  roleFitsUserScore,
  matchReason,
  matchBreakdown,
}: MatchFitBadgeProps) {
  const [explanation, setExplanation] = useState<string | null>(
    matchBreakdown?.roleFitsUser?.explanation ?? null,
  );
  const [loadingExplain, setLoadingExplain] = useState(false);

  async function loadExplanation() {
    if (explanation || roleFitsUserScore === null) return;
    setLoadingExplain(true);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/explain-fit`, {
        method: "POST",
      });
      const data = await parseApiResponse<{ explanation?: string }>(res);
      if (res.ok && data.explanation) {
        setExplanation(data.explanation);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingExplain(false);
    }
  }

  if (overallFitScore === null && userFitsRoleScore === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-secondary">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
        Scoring…
      </span>
    );
  }

  const overall = overallFitScore ?? userFitsRoleScore ?? 0;
  const userFits = matchBreakdown?.userFitsRole;
  const roleFits = matchBreakdown?.roleFitsUser;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${scoreColor(overall)}`}
      >
        <TrendingUp className="w-3 h-3" />
        Overall {overall}%
      </span>
      <div className="flex flex-wrap justify-end gap-1">
        <SubScore label="You→Role" score={userFitsRoleScore}>
          <p className="font-medium text-foreground mb-2">You → Role (CV)</p>
          <p className="text-muted-foreground text-xs mb-2">
            How well your resume meets what the employer is asking for.
          </p>
          {userFits?.reason && (
            <p className="text-xs mb-2">{userFits.reason}</p>
          )}
          {userFits?.matchedSkills && userFits.matchedSkills.length > 0 && (
            <p className="text-xs text-green-600">
              Matched: {userFits.matchedSkills.slice(0, 6).join(", ")}
            </p>
          )}
          {userFits?.missingSkills && userFits.missingSkills.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Missing: {userFits.missingSkills.slice(0, 4).join(", ")}
            </p>
          )}
        </SubScore>

        <SubScore label="Role→You" score={roleFitsUserScore}>
          <p className="font-medium text-foreground mb-2">Role → You (Profile)</p>
          <p className="text-muted-foreground text-xs mb-2">
            How well this role matches your preferences and goals.
          </p>
          {roleFitsUserScore === null ? (
            <p className="text-xs">
              <Link href="/dashboard/profile" className="text-accent underline">
                Complete your preferences
              </Link>{" "}
              to see role-fit scoring.
            </p>
          ) : (
            <>
              <button
                type="button"
                className="sr-only"
                onFocus={loadExplanation}
              />
              <div onMouseEnter={loadExplanation} onFocus={loadExplanation}>
                {loadingExplain && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Building explanation…
                  </p>
                )}
                {explanation && (
                  <p className="text-xs italic leading-relaxed mb-2">{explanation}</p>
                )}
                {!explanation && !loadingExplain && roleFits?.reason && (
                  <p className="text-xs mb-2">{roleFits.reason}</p>
                )}
                <TrajectoryChip dimensions={roleFits?.dimensions} />
                <div className="flex flex-wrap gap-1 mt-2">
                  {roleFits?.dimensions?.filter((d) => d.key !== "careerTrajectory").map((d) => (
                    <span
                      key={d.key}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        d.matched
                          ? "border-green-500/30 text-green-700 bg-green-500/5"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </SubScore>
      </div>
      {matchReason && (
        <p className="text-[10px] text-muted-foreground/70 max-w-[200px] text-right leading-snug">
          {matchReason}
        </p>
      )}
    </div>
  );
}
