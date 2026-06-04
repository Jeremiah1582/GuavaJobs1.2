import type { ApplicationProfileSnapshotDto } from "./snapshots";

export function formatProfileSnapshotForPrompt(
  snapshot: ApplicationProfileSnapshotDto,
): string {
  const parts: string[] = [];
  if (snapshot.summary?.trim()) {
    parts.push(`Summary:\n${snapshot.summary.trim()}`);
  }
  if (Array.isArray(snapshot.experienceJson) && snapshot.experienceJson.length > 0) {
    parts.push(`Experience (JSON):\n${JSON.stringify(snapshot.experienceJson, null, 2)}`);
  }
  if (snapshot.skills.length > 0) {
    parts.push(`Skills: ${snapshot.skills.join(", ")}`);
  }
  if (Array.isArray(snapshot.educationJson) && snapshot.educationJson.length > 0) {
    parts.push(`Education (JSON):\n${JSON.stringify(snapshot.educationJson, null, 2)}`);
  }
  return parts.join("\n\n") || "(empty profile)";
}
