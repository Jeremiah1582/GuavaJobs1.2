import { getPrisma } from "@/db";
import type { ApplicationBundle } from "../types";
import { formatProfileSnapshotForPrompt } from "../profile-prompt";

export type ApplicationTexts = {
  letterText: string;
  cvText: string;
};

export async function gatherApplicationTexts(
  userId: string,
  bundle: ApplicationBundle,
): Promise<ApplicationTexts> {
  const letterText = bundle.letter?.content?.trim() ?? "";

  const application = await getPrisma().application.findFirst({
    where: { id: bundle.application.id, userId },
    select: { resumeId: true },
  });

  if (application?.resumeId) {
    const resume = await getPrisma().resume.findFirst({
      where: { id: application.resumeId, userId, isActive: 1 },
      select: { rawText: true },
    });
    if (resume?.rawText?.trim()) {
      return { letterText, cvText: resume.rawText.trim() };
    }
  }

  const cvText = bundle.profileSnapshot
    ? formatProfileSnapshotForPrompt(bundle.profileSnapshot)
    : "";

  return { letterText, cvText: cvText.trim() };
}
