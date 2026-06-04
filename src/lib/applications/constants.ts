import type { ApplicationStatus } from "@/generated/prisma";

/** Pipeline statuses shown in status dropdown (no Rejected). */
export const PIPELINE_APPLICATION_STATUSES = [
  "DRAFT",
  "APPLIED",
  "WAITING",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
] as const satisfies readonly ApplicationStatus[];

export const STAGE_ORDER: ApplicationStatus[] = [
  "DRAFT",
  "APPLIED",
  "WAITING",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
];

export function nextPipelineStatus(
  current: ApplicationStatus,
): ApplicationStatus | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1]!;
}

/** Alias used by app UI imports. */
export const PIPELINE_STATUS_OPTIONS = PIPELINE_APPLICATION_STATUSES;

export function formatApplicationStatusLabel(status: ApplicationStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
