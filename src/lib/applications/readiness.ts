import type { ApplicationAtsReportDto } from "./ats/types";

export type ReadinessItemStatus = "missing" | "weak" | "good";

export type ReadinessItem = {
  id: string;
  label: string;
  status: ReadinessItemStatus;
  detail: string;
  weight: number;
};

export type ApplicationReadiness = {
  score: number;
  label: string;
  summary: string;
  items: ReadinessItem[];
  topGaps: string[];
};

function statusMultiplier(status: ReadinessItemStatus): number {
  if (status === "good") return 1;
  if (status === "weak") return 0.45;
  return 0;
}

function scoreTier(score: number | null | undefined): ReadinessItemStatus {
  if (score === null || score === undefined) return "missing";
  if (score >= 75) return "good";
  if (score >= 50) return "weak";
  return "missing";
}

function atsTier(score: number | null | undefined): ReadinessItemStatus {
  if (score === null || score === undefined) return "missing";
  if (score >= 70) return "good";
  if (score >= 45) return "weak";
  return "missing";
}

export type ComputeApplicationReadinessInput = {
  jobDescription: string | null;
  cvFileUrl: string | null;
  hasResumeLinked: boolean;
  coverLetterContent: string | null;
  displayName: string | null;
  phone: string | null;
  atsReport: ApplicationAtsReportDto | null;
};

export function computeApplicationReadiness(
  input: ComputeApplicationReadinessInput,
): ApplicationReadiness {
  const items: ReadinessItem[] = [];

  const hasJd = Boolean(input.jobDescription?.trim());
  items.push({
    id: "jd",
    label: "Job description",
    status: hasJd ? "good" : "missing",
    detail: hasJd ? "Role requirements captured" : "Add the job posting text",
    weight: 12,
  });

  const hasName = Boolean(input.displayName?.trim());
  const hasPhone = Boolean(input.phone?.trim());
  items.push({
    id: "contact",
    label: "Contact details",
    status: hasName && hasPhone ? "good" : hasName ? "weak" : "missing",
    detail: hasName && hasPhone
      ? "Name and phone on profile"
      : hasName
        ? "Add a phone number on your profile"
        : "Add your full name on your profile",
    weight: 14,
  });

  const hasCv = Boolean(input.cvFileUrl?.trim()) || input.hasResumeLinked;
  items.push({
    id: "cv",
    label: "CV / resume",
    status: hasCv ? "good" : "missing",
    detail: hasCv ? "CV available for this application" : "Upload a CV on your profile",
    weight: 18,
  });

  const letterLen = input.coverLetterContent?.trim().length ?? 0;
  items.push({
    id: "letter",
    label: "Cover letter",
    status: letterLen >= 120 ? "good" : letterLen > 0 ? "weak" : "missing",
    detail:
      letterLen >= 120
        ? "Cover letter drafted"
        : letterLen > 0
          ? "Expand or refine your cover letter"
          : "Generate or write a cover letter",
    weight: 18,
  });

  const icpScore = input.atsReport?.icpMatch?.overallScore ?? input.atsReport?.overallScore;
  const icpStatus = input.atsReport
    ? scoreTier(icpScore)
    : hasJd
      ? "weak"
      : "missing";
  items.push({
    id: "icp",
    label: "Profile fit",
    status: icpStatus,
    detail: input.atsReport
      ? icpStatus === "good"
        ? `Strong match to ideal candidate (${icpScore}%)`
        : icpStatus === "weak"
          ? `Partial ICP match (${icpScore}%) — review gaps`
          : "Low match — address must-have gaps"
      : hasJd
        ? "Run match analysis in the sidebar"
        : "Add a job description, then analyze fit",
    weight: 20,
  });

  const cvAts = input.atsReport?.cvScore;
  items.push({
    id: "cv-ats",
    label: "CV keywords",
    status: input.atsReport ? atsTier(cvAts) : hasCv && hasJd ? "weak" : "missing",
    detail: input.atsReport
      ? cvAts !== null
        ? `CV covers ${cvAts}% of role keywords`
        : "Link a resume scan for keyword scoring"
      : "Analyze after CV and job description are set",
    weight: 9,
  });

  const letterAts = input.atsReport?.letterScore;
  items.push({
    id: "letter-ats",
    label: "Letter keywords",
    status: input.atsReport
      ? atsTier(letterAts)
      : letterLen > 0 && hasJd
        ? "weak"
        : "missing",
    detail: input.atsReport
      ? letterAts !== null
        ? `Letter covers ${letterAts}% of role keywords`
        : "Save a cover letter to score keywords"
      : "Draft a letter, then re-analyze",
    weight: 9,
  });

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const weighted = items.reduce(
    (sum, item) => sum + item.weight * statusMultiplier(item.status),
    0,
  );
  const score = Math.round((weighted / totalWeight) * 100);

  const label =
    score >= 85 ? "Ready to submit"
    : score >= 65 ? "Almost ready"
    : score >= 40 ? "Needs work"
    : "Not ready";

  const summary =
    score >= 85
      ? "Strong application package for this role."
      : score >= 65
        ? "A few items would strengthen your submission."
        : "Complete the checklist below before applying.";

  const topGaps = items
    .filter((item) => item.status !== "good")
    .sort((a, b) => {
      const order = { missing: 0, weak: 1, good: 2 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 3)
    .map((item) => item.detail);

  return { score, label, summary, items, topGaps };
}
