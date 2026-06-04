import { z } from "zod";

export const jobCountrySchema = z.enum(["gb", "de"]);

export const jobSortSchema = z.enum(["relevance", "date"]);

export const jobSourceSchema = z.enum(["adzuna", "remotive", "serpapi"]);

const legacyJobIdSchema = z
  .string()
  .regex(/^[a-z]{2}-\d+$/i, "Invalid legacy job id (expected e.g. gb-1234567890)");

const compositeJobIdSchema = z
  .string()
  .regex(
    /^(adzuna|remotive|serpapi):[^:]+:[^:]+$/i,
    "Invalid composite job id (expected e.g. remotive:global:12345)",
  );

export const jobIdParamSchema = z.union([legacyJobIdSchema, compositeJobIdSchema]);

export const jobSearchSchema = z.object({
  q: z.string().trim().max(200).optional(),
  where: z.string().trim().max(200).optional(),
  country: jobCountrySchema.default("gb"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  resultsPerPage: z.coerce.number().int().min(1).max(50).default(20),
  distanceKm: z.coerce.number().int().min(1).max(200).optional(),
  maxDaysOld: z.coerce.number().int().min(1).max(90).optional(),
  sortBy: jobSortSchema.optional(),
  refresh: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
});

export const jobSalarySchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().optional(),
  isPredicted: z.boolean().optional(),
});

/** Listing payload from search results — used when detail API returns 404. */
export const jobListingSchema = z
  .object({
    id: jobIdParamSchema,
    country: jobCountrySchema,
    source: jobSourceSchema,
    adzunaId: z.string().min(1).optional(),
    sourceJobId: z.string().min(1).optional(),
    title: z.string().min(1).max(500),
    company: z.string().max(300),
    location: z.string().max(500),
    description: z.string().max(100_000),
    createdAt: z.string().max(50).optional(),
    redirectUrl: z.string().max(4000),
    category: z.string().max(200).optional(),
    contractType: z.string().max(100).optional(),
    salary: jobSalarySchema.optional(),
    remote: z.boolean().optional(),
    companyLogoUrl: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const isLegacy = /^[a-z]{2}-\d+$/i.test(data.id);
    if (isLegacy || data.source === "adzuna") {
      if (!data.adzunaId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "adzunaId is required for Adzuna listings",
          path: ["adzunaId"],
        });
      }
    }
  });
