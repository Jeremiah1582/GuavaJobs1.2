import type { Prisma } from "@/generated/prisma";
import type { ApplicationProfileSnapshotDto } from "../applications/snapshots";

/** Minimum profile data required for grounded AI generation. */
export function isProfileReadyForAi(
  snapshot: ApplicationProfileSnapshotDto | null | undefined,
): boolean {
  if (!snapshot) return false;
  const hasSummary = Boolean(snapshot.summary?.trim());
  const hasExperience =
    Array.isArray(snapshot.experienceJson) && snapshot.experienceJson.length > 0;
  const hasSkills = snapshot.skills.length > 0;
  return hasSummary || hasExperience || hasSkills;
}

export function profileSnapshotToPromptJson(
  snapshot: ApplicationProfileSnapshotDto,
): Prisma.InputJsonValue {
  return {
    summary: snapshot.summary,
    skills: snapshot.skills,
    experienceJson: (snapshot.experienceJson ?? []) as Prisma.InputJsonValue,
    educationJson: (snapshot.educationJson ?? []) as Prisma.InputJsonValue,
    snapshotAt: snapshot.snapshotAt.toISOString(),
  };
}
