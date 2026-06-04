import { z } from "zod";

import {
  ApplicationStatus,
  EmploymentType,
  JobCategory,
} from "@/generated/prisma";

import { PIPELINE_APPLICATION_STATUSES } from "../applications/constants";

const applicationStatusValues = [
  ...PIPELINE_APPLICATION_STATUSES,
] as const satisfies readonly ApplicationStatus[];

export const applicationStatusUpdateSchema = z.enum(applicationStatusValues);

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .refine(
    (value) => !value || value === "" || z.string().url().safeParse(value).success,
    "Enter a valid URL",
  );

const optionalDate = z
  .union([z.string().datetime(), z.string().date(), z.date()])
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  });

export const interviewUpdateSchema = z
  .object({
    interviewRound: z.number().int().min(1).max(5),
    interviewScheduledAt: optionalDate,
    interviewLocation: z.string().trim().max(500).optional(),
    interviewUrl: optionalUrl,
  })
  .refine(
    (data) =>
      Boolean(data.interviewLocation?.trim()) || Boolean(data.interviewUrl?.trim()),
    { message: "Provide interview location or URL" },
  );

export const applicationUpdateSchema = z.object({
  status: applicationStatusUpdateSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  company: z.string().trim().min(1).max(200).optional(),
  jobUrl: optionalUrl,
  source: z.string().trim().max(120).optional(),
  location: z.string().trim().max(200).optional(),
  salaryText: z.string().trim().max(200).optional(),
  nextStep: z.string().trim().max(500).optional(),
  contactName: z.string().trim().max(200).optional(),
  viaRecruiter: z.boolean().optional(),
  fitScore: z.string().trim().max(20).optional(),
  industry: z.string().trim().max(120).optional(),
  jobCategory: z.nativeEnum(JobCategory).optional(),
  jobCategoryOther: z.string().trim().max(200).optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  requirementsNotes: z.string().trim().max(10_000).optional(),
  aboutNotes: z.string().trim().max(10_000).optional(),
  language: z.string().trim().max(80).optional(),
  roleStartDate: optionalDate,
  appliedAt: optionalDate,
  interviewRound: z.number().int().min(1).max(5).optional(),
  interviewScheduledAt: optionalDate,
  interviewLocation: z.string().trim().max(500).optional(),
  interviewUrl: optionalUrl,
  clearRejection: z.boolean().optional(),
});

export const applicationNoteSchema = z.object({
  body: z.string().trim().min(1, "Note cannot be empty").max(10_000),
});

export const applicationNoteUpdateSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
});

export const manualApplicationCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  company: z.string().trim().min(1, "Company is required").max(200),
  description: z.string().trim().max(50_000).optional(),
  jobUrl: optionalUrl,
  source: z.string().trim().max(120).optional(),
  location: z.string().trim().max(200).optional(),
  appliedAt: optionalDate,
});

export type ManualApplicationCreateInput = z.infer<
  typeof manualApplicationCreateSchema
>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ApplicationNoteInput = z.infer<typeof applicationNoteSchema>;
export type InterviewUpdateInput = z.infer<typeof interviewUpdateSchema>;
