import { complete, MODEL_FAST } from "@/lib/llm";

import type {
  JobMatchInput,
  ProfilePreferencesInput,
  RoleFitsUserBreakdown,
} from "./types";
import { computeCareerTrajectory } from "./role-fits-user";

function trajectoryClause(
  profile: ProfilePreferencesInput,
  job: JobMatchInput,
): string {
  const traj = computeCareerTrajectory(profile, job);
  if (!traj) return "";

  const domainHint = profile.experienceJson?.[0]?.role
    ? ` your background in ${profile.experienceJson[0].role}`
    : " your experience";

  switch (traj.label) {
    case "Step forward":
      return ` Given${domainHint}, this is a clear step toward${profile.aspiringRole ? ` your goal of becoming a ${profile.aspiringRole}` : " where you want to be"}.`;
    case "Lateral move":
      return ` This role is adjacent to your current lane${profile.aspiringRole ? ` and keeps you moving toward ${profile.aspiringRole}` : ""} — it broadens your experience.`;
    case "Tangential":
      return profile.aspiringRole
        ? ` Note: this role overlaps some of your skills but takes you in a different direction from your goal of ${profile.aspiringRole}.`
        : " This role overlaps some of your background but shifts direction.";
    case "Different direction":
      return profile.aspiringRole
        ? ` Be aware: this role diverges from your stated goal of ${profile.aspiringRole}.`
        : " This role diverges from your current career direction.";
  }
}

export function buildTemplatedRoleFitExplanation(
  profile: ProfilePreferencesInput,
  roleFit: RoleFitsUserBreakdown,
  job: JobMatchInput,
): string {
  if (roleFit.score === null) {
    return roleFit.reason;
  }

  const parts: string[] = [];
  if (profile.personalityType?.trim()) {
    parts.push(`you're ${profile.personalityType}`);
  }
  if (profile.priorities?.length) {
    parts.push(`you value ${profile.priorities.slice(0, 3).join(", ")}`);
  }
  if (profile.salaryMin != null) {
    const sym = profile.salaryCurrency === "EUR" ? "€" : profile.salaryCurrency === "USD" ? "$" : "£";
    parts.push(`you're targeting ${sym}${profile.salaryMin.toLocaleString()}+`);
  }
  if (profile.workMode) {
    parts.push(`you prefer ${profile.workMode} work`);
  }

  const who = parts.length > 0 ? `Because ${parts.join(", and ")}, ` : "";
  const strength = roleFit.score >= 85 ? "strong" : roleFit.score >= 70 ? "good" : "moderate";
  const trajClause = trajectoryClause(profile, job);

  return `${who}this ${job.title} role at ${job.company ?? "this company"} is a ${strength} ${roleFit.score}% fit to your specifications.${trajClause}`;
}

export async function generateRoleFitExplanation(
  profile: ProfilePreferencesInput,
  roleFit: RoleFitsUserBreakdown,
  job: JobMatchInput & { company?: string },
): Promise<string> {
  if (roleFit.score === null) {
    return roleFit.reason;
  }

  const traj = computeCareerTrajectory(profile, job);
  const matchedDims = roleFit.dimensions
    .filter((d) => d.matched)
    .map((d) => `${d.label}: ${d.detail}`)
    .join("; ");

  const trajectoryContext = traj
    ? `Career trajectory: ${traj.label} (score ${traj.score}/100). ${traj.detail}`
    : "Career trajectory: not enough data.";

  const mostRecentRole = profile.experienceJson?.[0]
    ? `${profile.experienceJson[0].role} at ${profile.experienceJson[0].company}`
    : "not provided";

  const prompt = `Write ONE confident sentence (max 60 words) explaining why a job fits a candidate's preferences AND career direction.
Use second person ("you"). Mention personality type and priorities if provided. Include the career trajectory verdict. End with the fit percentage.

Personality: ${profile.personalityType ?? "not set"}
Priorities: ${profile.priorities?.join(", ") ?? "not set"}
Salary min: ${profile.salaryMin ?? "not set"}
Work mode: ${profile.workMode ?? "not set"}
Career goal (aspiring role): ${profile.aspiringRole ?? "not set"}
Most recent experience: ${mostRecentRole}
Job: ${job.title} at ${job.company ?? "company"}
Fit score: ${roleFit.score}%
${trajectoryContext}
Matched preference checks: ${matchedDims || "general alignment"}

Example tone: "Because you're an ENTP-A who wants a challenging role on a large team paying €70k+, this position is a strong 95% fit to your specifications — and given your background in UX, it's a clear step toward your goal of becoming a Senior Product Designer."`;

  try {
    const raw = await complete(prompt, undefined, 0.3, MODEL_FAST, 160);
    const sentence = raw.trim().replace(/^["']|["']$/g, "");
    if (sentence.length > 20) return sentence;
  } catch {
    /* fall through */
  }

  return buildTemplatedRoleFitExplanation(profile, roleFit, job);
}
