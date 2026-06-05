import "server-only";

import type {
  ApplicationCoverLetter,
  CoverLetterSource,
  Prisma,
} from "@/generated/prisma";
import { prisma } from "@/db";
import { ApiErrorCode } from "../../api/errors";
import {
  coverLetterContentSchema,
  coverLetterUpdateSchema,
  type CoverLetterContentInput,
} from "../../validators/cover-letters";
import { CoverLettersServiceError } from "./errors";
import { safeRecomputeReport } from "../ats/hooks";

export type {
  CoverLetterCitation,
  CoverLetterDto,
  GenerateCoverLetterOptions,
  GenerateCoverLetterResult,
} from "./types";

import type { CoverLetterCitation, CoverLetterDto } from "./types";

function parseCitations(value: unknown): CoverLetterCitation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const field = typeof row.field === "string" ? row.field.trim() : "";
      const excerpt = typeof row.excerpt === "string" ? row.excerpt.trim() : "";
      if (!field || !excerpt) return null;
      return { field, excerpt };
    })
    .filter((item): item is CoverLetterCitation => item !== null);
}

function mapLetter(
  letter: ApplicationCoverLetter,
  applicationId: string,
): CoverLetterDto {
  return {
    id: letter.id,
    applicationId,
    content: letter.content,
    source: letter.source,
    citations: parseCitations(letter.citationsJson),
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
  };
}

export function coverLetterPreviewText(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > 120 ? `${flat.slice(0, 120)}…` : flat;
}

/** @deprecated alias — prefer `coverLetterPreviewText` */
export const previewCoverLetterContent = coverLetterPreviewText;

export type LetterPayload = {
  letter: CoverLetterDto | null;
};

/** @deprecated F8 shape — `manual` mirrors `letter` */
export type ManualCoverLetterPayload = {
  manual: CoverLetterDto | null;
};

export async function getLetterPayload(
  userId: string,
  applicationId: string,
): Promise<LetterPayload> {
  const letter = await getLetterForApplication(userId, applicationId);
  return { letter };
}

export async function getManualPayload(
  userId: string,
  applicationId: string,
): Promise<ManualCoverLetterPayload> {
  const letter = await getLetterForApplication(userId, applicationId);
  return { manual: letter };
}

async function assertApplicationOwned(
  userId: string,
  applicationId: string,
): Promise<void> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!application) {
    throw new CoverLettersServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }
}

async function getApplicationWithLetter(
  userId: string,
  applicationId: string,
) {
  return prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: { coverLetter: true },
  });
}

export async function listForApplication(
  userId: string,
  applicationId: string,
): Promise<CoverLetterDto[]> {
  const application = await getApplicationWithLetter(userId, applicationId);
  if (!application) {
    throw new CoverLettersServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }
  return application.coverLetter
    ? [mapLetter(application.coverLetter, applicationId)]
    : [];
}

export async function getLetterForApplication(
  userId: string,
  applicationId: string,
): Promise<CoverLetterDto | null> {
  const application = await getApplicationWithLetter(userId, applicationId);
  if (!application) {
    throw new CoverLettersServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }
  return application.coverLetter
    ? mapLetter(application.coverLetter, applicationId)
    : null;
}

/** @deprecated use `getLetterForApplication` */
export const getManualForApplication = getLetterForApplication;

export async function upsertLetter(
  userId: string,
  applicationId: string,
  input: CoverLetterContentInput,
  options?: { source?: CoverLetterSource; citations?: CoverLetterCitation[] },
): Promise<CoverLetterDto> {
  const parsed = coverLetterContentSchema.parse(input);
  await assertApplicationOwned(userId, applicationId);

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: { coverLetter: true },
  });
  if (!application) {
    throw new CoverLettersServiceError(
      ApiErrorCode.NOT_FOUND,
      "Application not found",
      404,
    );
  }

  const citationsJson =
    options?.citations !== undefined
      ? (options.citations as Prisma.InputJsonValue)
      : undefined;

  const isManual = (options?.source ?? "MANUAL") === "MANUAL";

  if (application.coverLetter) {
    const updated = await prisma.applicationCoverLetter.update({
      where: { id: application.coverLetter.id },
      data: {
        content: parsed.content,
        ...(options?.source ? { source: options.source } : {}),
        ...(citationsJson !== undefined ? { citationsJson } : {}),
        ...(isManual ? { isUserEdited: true } : {}),
      },
    });
    const trigger = options?.source === "AI" ? "letter.generated" : "letter.saved";
    await safeRecomputeReport(userId, applicationId, trigger);
    return mapLetter(updated, applicationId);
  }

  const created = await prisma.$transaction(async (tx) => {
    const letter = await tx.applicationCoverLetter.create({
      data: {
        content: parsed.content,
        source: options?.source ?? "MANUAL",
        citationsJson: citationsJson ?? undefined,
        isUserEdited: isManual,
      },
    });
    await tx.application.update({
      where: { id: applicationId },
      data: { coverLetterId: letter.id },
    });
    return letter;
  });

  const trigger = options?.source === "AI" ? "letter.generated" : "letter.saved";
  await safeRecomputeReport(userId, applicationId, trigger);
  return mapLetter(created, applicationId);
}

/** @deprecated use `upsertLetter` */
export const upsertManual = upsertLetter;

export async function updateLetter(
  userId: string,
  applicationId: string,
  letterId: string,
  input: CoverLetterContentInput,
): Promise<CoverLetterDto> {
  const parsed = coverLetterUpdateSchema.parse(input);
  await assertApplicationOwned(userId, applicationId);

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId, coverLetterId: letterId },
    include: { coverLetter: true },
  });

  if (!application?.coverLetter) {
    throw new CoverLettersServiceError(
      ApiErrorCode.NOT_FOUND,
      "Cover letter not found",
      404,
    );
  }

  const updated = await prisma.applicationCoverLetter.update({
    where: { id: letterId },
    data: { content: parsed.content, isUserEdited: true },
  });
  await safeRecomputeReport(userId, applicationId, "letter.saved");
  return mapLetter(updated, applicationId);
}

/** @deprecated use `updateLetter` */
export const updateManual = updateLetter;

export {
  generateCoverLetterForBody,
  resolveApplicationIdForGenerate,
} from "./generate-route";
export { CoverLettersServiceError } from "./errors";
export { generateForApplication } from "./generate";

export const coverLettersService = {
  listForApplication,
  getLetterForApplication,
  getLetterPayload,
  getManualForApplication,
  getManualPayload,
  upsertLetter,
  upsertManual,
  updateLetter,
  updateManual,
  generateForApplication: async (
    ...args: Parameters<
      typeof import("./generate").generateForApplication
    >
  ) => {
    const { generateForApplication } = await import("./generate");
    return generateForApplication(...args);
  },
  generateCoverLetterForBody: async (
    ...args: Parameters<
      typeof import("./generate-route").generateCoverLetterForBody
    >
  ) => {
    const { generateCoverLetterForBody } = await import("./generate-route");
    return generateCoverLetterForBody(...args);
  },
  generate: async (
    ...args: Parameters<
      typeof import("./generate").generateForApplication
    >
  ) => {
    const { generateForApplication } = await import("./generate");
    return generateForApplication(...args);
  },
};
