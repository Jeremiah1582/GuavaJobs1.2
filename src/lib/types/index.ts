/** Subscription tier (see projectVision.md pricing). */
export type Tier = "freemium" | "starter" | "pro";

/** V1 simplified application statuses (full colour model in V2). */
export type ApplicationStatus =
  | "draft"
  | "applied"
  | "waiting"
  | "interview"
  | "offer"
  | "accepted";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "draft",
  "applied",
  "waiting",
  "interview",
  "offer",
  "accepted",
];

/** Cover letter source. */
export type CoverLetterSource = "manual" | "ai";
