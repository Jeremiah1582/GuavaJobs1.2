import { z } from "zod";

import {
  educationEntrySchema,
  experienceEntrySchema,
  profileQuizSchema,
} from "./profile";

/** Raw shape returned by the AI (flexible field names). */
export const profileImportAiExperienceSchema = z.object({
  role: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  bullets: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
});

export const profileImportAiAddressSchema = z.object({
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

/** AI often returns `null` for unknown quiz fields — accept nullish, strip in normalize. */
export const profileImportAiQuizSchema = z.object({
  roleType: z.string().max(100).nullish(),
  workMode: z.enum(["remote", "hybrid", "onsite", "flexible"]).nullish(),
  priorities: z.array(z.string().max(100)).max(10).nullish(),
});

export const profileImportAiSchema = z.object({
  name: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  address: profileImportAiAddressSchema.optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(profileImportAiExperienceSchema).default([]),
  education: z
    .array(
      z.object({
        institution: z.string().nullish(),
        degree: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      }),
    )
    .default([]),
  quiz: profileImportAiQuizSchema.nullish(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

export type ProfileImportAiPayload = z.infer<typeof profileImportAiSchema>;
export type ProfileImportAiQuiz = z.infer<typeof profileImportAiQuizSchema>;

export const profileUrlImportResultSchema = z.object({
  name: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  skills: z.array(z.string()),
  experience: z.array(experienceEntrySchema),
  education: z.array(educationEntrySchema),
  quiz: profileQuizSchema.optional(),
  confidence: z.enum(["high", "medium", "low"]),
  pagesScanned: z.array(
    z.object({
      url: z.string().url(),
      path: z.string(),
      ok: z.boolean(),
    }),
  ),
});

export type ProfileUrlImportResult = z.infer<typeof profileUrlImportResultSchema>;
