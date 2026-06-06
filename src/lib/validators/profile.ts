import { z } from "zod";

import {
  LanguageProficiency,
  RelocationWillingness,
  RightToWorkStatus,
  SalaryPeriod,
  SeniorityLevel,
} from "@/generated/prisma";

import { EMPLOYMENT_PREFERENCE_VALUES } from "../profile/career-preferences";

export const experienceEntrySchema = z.object({
  role: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  startDate: z.string().min(1).max(50),
  endDate: z.string().max(50).optional(),
  bullets: z.array(z.string().max(2000)).max(30).default([]),
});

export const educationEntrySchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().max(200).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
});

export const profileLanguageEntrySchema = z.object({
  language: z.string().trim().min(1).max(80),
  proficiency: z.nativeEnum(LanguageProficiency),
});

export const profileLanguagesSchema = z.array(profileLanguageEntrySchema).max(20);

export const profileQuizSchema = z.object({
  roleType: z.string().max(100).optional(),
  workMode: z.enum(["remote", "hybrid", "onsite", "flexible"]).optional(),
  priorities: z.array(z.string().max(100)).max(10).optional(),
});

export const profileImportMetaSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]).optional(),
  pagesScanned: z
    .array(
      z.object({
        url: z.string().url(),
        path: z.string(),
        ok: z.boolean(),
      }),
    )
    .optional(),
  /** Fields the user has manually edited — imports must not overwrite without consent. */
  userEditedFields: z.array(z.string().max(80)).max(64).optional(),
});

const nullableShortText = (max: number) =>
  z.string().max(max).nullable().optional();

const optionalDate = z
  .union([z.string().datetime(), z.string().date(), z.date()])
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  });

const optionalSalary = z
  .number()
  .int()
  .min(0)
  .max(10_000_000)
  .nullable()
  .optional();

const employmentPreferenceSchema = z.enum(
  EMPLOYMENT_PREFERENCE_VALUES as unknown as [
    (typeof EMPLOYMENT_PREFERENCE_VALUES)[number],
    ...(typeof EMPLOYMENT_PREFERENCE_VALUES)[number][],
  ],
);

export const profileUpdateSchema = z
  .object({
    displayName: nullableShortText(200),
    summary: z.string().max(5000).nullable().optional(),
    headline: nullableShortText(300),
    location: nullableShortText(200),
    avatarUrl: nullableShortText(2000),
    phone: nullableShortText(40),
    addressLine1: nullableShortText(200),
    addressLine2: nullableShortText(200),
    city: nullableShortText(100),
    region: nullableShortText(100),
    postalCode: nullableShortText(20),
    country: nullableShortText(100),
    websiteUrl: nullableShortText(2000),
    linkedInUrl: nullableShortText(2000),
    githubUrl: nullableShortText(2000),
    aspiringRole: nullableShortText(200),
    personalityType: nullableShortText(80),
    languagesJson: profileLanguagesSchema.optional(),
    salaryCurrency: z.string().trim().max(10).nullable().optional(),
    salaryMin: optionalSalary,
    salaryMax: optionalSalary,
    salaryPeriod: z.nativeEnum(SalaryPeriod).nullable().optional(),
    salaryNegotiable: z.boolean().optional(),
    rightToWork: z.nativeEnum(RightToWorkStatus).nullable().optional(),
    rightToWorkNote: nullableShortText(500),
    noticePeriodWeeks: z.number().int().min(0).max(104).nullable().optional(),
    availableFrom: optionalDate.nullable(),
    targetSeniority: z.nativeEnum(SeniorityLevel).nullable().optional(),
    employmentTypePreference: employmentPreferenceSchema.nullable().optional(),
    relocationWillingness: z.nativeEnum(RelocationWillingness).nullable().optional(),
    experienceJson: z.array(experienceEntrySchema).max(30).optional(),
    skills: z.array(z.string().min(1).max(100)).max(100).optional(),
    educationJson: z.array(educationEntrySchema).max(20).optional(),
    quizJson: profileQuizSchema.optional(),
    cvFileUrl: z.string().max(2000).nullable().optional(),
    lastImportSourceUrl: z.string().max(2000).nullable().optional(),
    importMetaJson: profileImportMetaSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.salaryMin == null || data.salaryMax == null) return true;
      return data.salaryMin <= data.salaryMax;
    },
    { message: "Minimum salary cannot exceed maximum", path: ["salaryMax"] },
  );

export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type ProfileLanguageEntry = z.infer<typeof profileLanguageEntrySchema>;
export type ProfileQuiz = z.infer<typeof profileQuizSchema>;
export type ProfileImportMeta = z.infer<typeof profileImportMetaSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
