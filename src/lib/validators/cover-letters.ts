import { z } from "zod";

export const coverLetterContentSchema = z.object({
  content: z.string().trim().min(1, "Cover letter cannot be empty").max(50_000),
});

export const coverLetterUpdateSchema = coverLetterContentSchema;

export const coverLetterGenerateSchema = z
  .object({
    applicationId: z.string().uuid().optional(),
    jobId: z.string().trim().min(1).optional(),
    adaptExisting: z.boolean().optional(),
    fresh: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.applicationId || value.jobId), {
    message: "applicationId or jobId is required",
  });

export type CoverLetterContentInput = z.infer<typeof coverLetterContentSchema>;
export type CoverLetterGenerateInput = z.infer<typeof coverLetterGenerateSchema>;
