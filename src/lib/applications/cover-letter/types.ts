import type { CoverLetterSource } from "@/generated/prisma";

export type CoverLetterCitation = {
  field: string;
  excerpt: string;
};

export type CoverLetterDto = {
  id: string;
  applicationId: string;
  content: string;
  source: CoverLetterSource;
  citations: CoverLetterCitation[];
  createdAt: Date;
  updatedAt: Date;
};

export type GenerateCoverLetterResult = {
  applicationId: string;
  letter: CoverLetterDto;
  citations: CoverLetterCitation[];
};

export type GenerateCoverLetterOptions = {
  adaptExisting?: boolean;
  fresh?: boolean;
};
