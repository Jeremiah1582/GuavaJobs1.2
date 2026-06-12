import { z } from "zod";

export const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  absolute_url: z.string().optional(),
  location: z.object({ name: z.string().optional() }).optional(),
  content: z.string().optional(),
});

export const greenhouseBoardResponseSchema = z.object({
  jobs: z.array(greenhouseJobSchema).optional(),
});

export const leverPostingSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  hostedUrl: z.string().optional(),
  descriptionPlain: z.string().optional(),
  description: z.string().optional(),
  categories: z.object({ location: z.string().optional() }).optional(),
});

export const leverPostingsSchema = z.array(leverPostingSchema);
