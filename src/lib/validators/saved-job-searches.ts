import { z } from "zod";

import {
  experienceLevelSchema,
  jobCountrySchema,
  jobSortSchema,
} from "./jobs";

export const scrapeOverridesSchema = z.object({
  q: z.string().trim().max(200).optional(),
  where: z.string().trim().max(200).optional(),
  country: jobCountrySchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  maxDaysOld: z.coerce.number().int().min(1).max(90).optional(),
});

export type ScrapeOverrides = z.infer<typeof scrapeOverridesSchema>;

export const savedJobSearchCreateSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(120),
  q: z.string().trim().max(200).optional(),
  where: z.string().trim().max(200).optional(),
  country: jobCountrySchema.default("global"),
  experienceLevel: experienceLevelSchema.optional(),
  distanceKm: z.coerce.number().int().min(1).max(200).optional(),
  maxDaysOld: z.coerce.number().int().min(1).max(90).optional(),
  sortBy: jobSortSchema.optional(),
});

export const savedJobSearchUpdateSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
});

export type SavedJobSearchCreateInput = z.infer<typeof savedJobSearchCreateSchema>;
