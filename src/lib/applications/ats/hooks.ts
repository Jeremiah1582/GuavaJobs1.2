import type { AtsRecomputeTrigger } from "./types";

export async function safeRecomputeReport(
  userId: string,
  applicationId: string,
  trigger: AtsRecomputeTrigger,
): Promise<void> {
  try {
    const { recomputeReport } = await import("./recompute");
    await recomputeReport(userId, applicationId, trigger);
  } catch (error) {
    console.warn("[application-ats] recompute failed:", trigger, applicationId, error);
  }
}
