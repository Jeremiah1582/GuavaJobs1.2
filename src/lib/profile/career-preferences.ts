import type {
  EmploymentType,
  LanguageProficiency,
  RelocationWillingness,
  RightToWorkStatus,
  SalaryPeriod,
  SeniorityLevel,
} from "@/generated/prisma";

/** Free 16Personalities profile — linked when user has no type yet. */
export const PERSONALITY_TEST_URL = "https://www.16personalities.com/profile";

export const LANGUAGE_PROFICIENCY_LABELS: Record<LanguageProficiency, string> = {
  BASIC: "Basic",
  CONVERSATIONAL: "Conversational",
  PROFESSIONAL: "Professional",
  FLUENT: "Fluent",
  NATIVE: "Native / bilingual",
};

export const RIGHT_TO_WORK_LABELS: Record<RightToWorkStatus, string> = {
  UK_CITIZEN: "UK / Irish citizen",
  SETTLED_STATUS: "Settled / indefinite leave",
  PRE_SETTLED: "Pre-settled status",
  SKILLED_WORKER: "Skilled worker visa",
  STUDENT_VISA: "Student visa",
  NEEDS_SPONSORSHIP: "Needs visa sponsorship",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const SENIORITY_LEVEL_LABELS: Record<SeniorityLevel, string> = {
  INTERN: "Intern / graduate",
  JUNIOR: "Junior",
  MID: "Mid-level",
  SENIOR: "Senior",
  LEAD: "Lead / principal",
  EXECUTIVE: "Director / executive",
};

export const RELOCATION_LABELS: Record<RelocationWillingness, string> = {
  NONE: "Not open to relocation",
  LOCAL: "Within my region",
  NATIONAL: "Within my country",
  INTERNATIONAL: "International",
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  ANNUAL: "Per year",
  MONTHLY: "Per month",
  HOURLY: "Per hour",
};

export const EMPLOYMENT_PREFERENCE_LABELS: Record<
  Exclude<EmploymentType, "UNKNOWN">,
  string
> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

export const EMPLOYMENT_PREFERENCE_VALUES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
] as const satisfies readonly Exclude<EmploymentType, "UNKNOWN">[];
