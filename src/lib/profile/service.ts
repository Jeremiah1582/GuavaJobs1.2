import { Prisma, type Profile } from "@/generated/prisma";
import { prisma } from "@/db";
import {
  profileLanguagesSchema,
  profileUpdateSchema,
  type ProfileImportMeta,
  type ProfileLanguageEntry,
  type ProfileUpdateInput,
} from "../validators/profile";

export type ProfileCompleteness = {
  percent: number;
  missing: string[];
};

export type ProfileDto = {
  userId: string;
  displayName: string | null;
  summary: string | null;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  websiteUrl: string | null;
  linkedInUrl: string | null;
  githubUrl: string | null;
  aspiringRole: string | null;
  personalityType: string | null;
  languagesJson: ProfileLanguageEntry[];
  salaryCurrency: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null;
  salaryNegotiable: boolean;
  rightToWork: string | null;
  rightToWorkNote: string | null;
  noticePeriodWeeks: number | null;
  availableFrom: string | null;
  targetSeniority: string | null;
  employmentTypePreference: string | null;
  relocationWillingness: string | null;
  experienceJson: unknown;
  skills: string[];
  educationJson: unknown;
  cvFileUrl: string | null;
  quizJson: unknown;
  lastImportedAt: string | null;
  lastImportSourceUrl: string | null;
  importMetaJson: ProfileImportMeta | null;
  createdAt: string;
  updatedAt: string;
  completeness: ProfileCompleteness;
};

const COMPLETENESS_SECTIONS = [
  { key: "summary", label: "Professional summary" },
  { key: "experience", label: "Work experience" },
  { key: "skills", label: "Skills" },
  { key: "education", label: "Education" },
  { key: "quiz", label: "Job preferences" },
  { key: "career", label: "Career goals & logistics" },
] as const;

function hasExperience(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasEducation(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasQuiz(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const quiz = value as Record<string, unknown>;
  return Boolean(
    quiz.roleType ||
      quiz.workMode ||
      (Array.isArray(quiz.priorities) && quiz.priorities.length > 0),
  );
}

function parseLanguages(value: unknown): ProfileLanguageEntry[] {
  const parsed = profileLanguagesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function hasCareerPreferences(profile: Profile): boolean {
  return Boolean(
    profile.aspiringRole?.trim() ||
      profile.personalityType?.trim() ||
      profile.rightToWork ||
      profile.salaryMin != null ||
      profile.salaryMax != null ||
      parseLanguages(profile.languagesJson).length > 0 ||
      profile.targetSeniority ||
      profile.employmentTypePreference ||
      profile.relocationWillingness,
  );
}

/** Minimum data required before AI cover letter generation (F9). */
export function isProfileReadyForAi(profile: Profile | null): boolean {
  if (!profile) return false;
  const hasSummary = Boolean(profile.summary?.trim());
  const hasExperience =
    Array.isArray(profile.experienceJson) &&
    (profile.experienceJson as unknown[]).length > 0;
  const hasSkills = profile.skills.length > 0;
  return hasSummary && (hasExperience || hasSkills);
}

export function computeCompleteness(profile: Profile): ProfileCompleteness {
  const checks: Record<string, boolean> = {
    summary: Boolean(profile.summary?.trim()),
    experience: hasExperience(profile.experienceJson),
    skills: profile.skills.length > 0,
    education: hasEducation(profile.educationJson),
    quiz: hasQuiz(profile.quizJson),
    career: hasCareerPreferences(profile),
  };

  const filled = COMPLETENESS_SECTIONS.filter((s) => checks[s.key]).length;
  const percent = Math.round((filled / COMPLETENESS_SECTIONS.length) * 100);
  const missing = COMPLETENESS_SECTIONS.filter((s) => !checks[s.key]).map(
    (s) => s.label,
  );

  return { percent, missing };
}

type ProfileWithUser = Profile & {
  user: { displayName: string | null };
};

function toDto(profile: ProfileWithUser): ProfileDto {
  return {
    userId: profile.userId,
    displayName: profile.user.displayName,
    summary: profile.summary,
    headline: profile.headline,
    location: profile.location,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2,
    city: profile.city,
    region: profile.region,
    postalCode: profile.postalCode,
    country: profile.country,
    websiteUrl: profile.websiteUrl,
    linkedInUrl: profile.linkedInUrl,
    githubUrl: profile.githubUrl,
    aspiringRole: profile.aspiringRole,
    personalityType: profile.personalityType,
    languagesJson: parseLanguages(profile.languagesJson),
    salaryCurrency: profile.salaryCurrency,
    salaryMin: profile.salaryMin,
    salaryMax: profile.salaryMax,
    salaryPeriod: profile.salaryPeriod,
    salaryNegotiable: profile.salaryNegotiable,
    rightToWork: profile.rightToWork,
    rightToWorkNote: profile.rightToWorkNote,
    noticePeriodWeeks: profile.noticePeriodWeeks,
    availableFrom: profile.availableFrom?.toISOString() ?? null,
    targetSeniority: profile.targetSeniority,
    employmentTypePreference: profile.employmentTypePreference,
    relocationWillingness: profile.relocationWillingness,
    experienceJson: profile.experienceJson ?? [],
    skills: profile.skills,
    educationJson: profile.educationJson ?? [],
    cvFileUrl: profile.cvFileUrl,
    quizJson: profile.quizJson ?? {},
    lastImportedAt: profile.lastImportedAt?.toISOString() ?? null,
    lastImportSourceUrl: profile.lastImportSourceUrl,
    importMetaJson: (profile.importMetaJson as ProfileImportMeta | null) ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    completeness: computeCompleteness(profile),
  };
}

const profileWithUserInclude = {
  user: { select: { displayName: true } },
} as const;

export async function getOrCreateForUser(userId: string): Promise<Profile> {
  
  return prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getByUserId(userId: string): Promise<ProfileDto | null> {
  
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: profileWithUserInclude,
  });
  if (!profile) return null;
  return toDto(profile);
}

export async function update(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileDto> {
  const parsed = profileUpdateSchema.parse(input);
  await getOrCreateForUser(userId);

  const data: Prisma.ProfileUpdateInput = {};

  if (parsed.summary !== undefined) data.summary = parsed.summary;
  if (parsed.headline !== undefined) data.headline = parsed.headline;
  if (parsed.location !== undefined) data.location = parsed.location;
  if (parsed.avatarUrl !== undefined) data.avatarUrl = parsed.avatarUrl;
  if (parsed.phone !== undefined) data.phone = parsed.phone;
  if (parsed.addressLine1 !== undefined) data.addressLine1 = parsed.addressLine1;
  if (parsed.addressLine2 !== undefined) data.addressLine2 = parsed.addressLine2;
  if (parsed.city !== undefined) data.city = parsed.city;
  if (parsed.region !== undefined) data.region = parsed.region;
  if (parsed.postalCode !== undefined) data.postalCode = parsed.postalCode;
  if (parsed.country !== undefined) data.country = parsed.country;
  if (parsed.websiteUrl !== undefined) data.websiteUrl = parsed.websiteUrl;
  if (parsed.linkedInUrl !== undefined) data.linkedInUrl = parsed.linkedInUrl;
  if (parsed.githubUrl !== undefined) data.githubUrl = parsed.githubUrl;
  if (parsed.aspiringRole !== undefined) data.aspiringRole = parsed.aspiringRole;
  if (parsed.personalityType !== undefined) {
    data.personalityType = parsed.personalityType;
  }
  if (parsed.languagesJson !== undefined) {
    data.languagesJson = parsed.languagesJson;
  }
  if (parsed.salaryCurrency !== undefined) {
    data.salaryCurrency = parsed.salaryCurrency;
  }
  if (parsed.salaryMin !== undefined) data.salaryMin = parsed.salaryMin;
  if (parsed.salaryMax !== undefined) data.salaryMax = parsed.salaryMax;
  if (parsed.salaryPeriod !== undefined) data.salaryPeriod = parsed.salaryPeriod;
  if (parsed.salaryNegotiable !== undefined) {
    data.salaryNegotiable = parsed.salaryNegotiable;
  }
  if (parsed.rightToWork !== undefined) data.rightToWork = parsed.rightToWork;
  if (parsed.rightToWorkNote !== undefined) {
    data.rightToWorkNote = parsed.rightToWorkNote;
  }
  if (parsed.noticePeriodWeeks !== undefined) {
    data.noticePeriodWeeks = parsed.noticePeriodWeeks;
  }
  if (parsed.availableFrom !== undefined) {
    data.availableFrom = parsed.availableFrom ?? null;
  }
  if (parsed.targetSeniority !== undefined) {
    data.targetSeniority = parsed.targetSeniority;
  }
  if (parsed.employmentTypePreference !== undefined) {
    data.employmentTypePreference = parsed.employmentTypePreference;
  }
  if (parsed.relocationWillingness !== undefined) {
    data.relocationWillingness = parsed.relocationWillingness;
  }
  if (parsed.experienceJson !== undefined) {
    data.experienceJson = parsed.experienceJson;
  }
  if (parsed.skills !== undefined) data.skills = parsed.skills;
  if (parsed.educationJson !== undefined) data.educationJson = parsed.educationJson;
  if (parsed.quizJson !== undefined) data.quizJson = parsed.quizJson;
  if (parsed.cvFileUrl !== undefined) data.cvFileUrl = parsed.cvFileUrl;
  if (parsed.lastImportSourceUrl !== undefined) {
    data.lastImportSourceUrl = parsed.lastImportSourceUrl;
    if (parsed.lastImportSourceUrl) {
      data.lastImportedAt = new Date();
    }
  }
  if (parsed.importMetaJson !== undefined) {
    data.importMetaJson =
      parsed.importMetaJson === null
        ? Prisma.JsonNull
        : parsed.importMetaJson;
  }

  

  if (parsed.displayName !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { displayName: parsed.displayName },
    });
  }

  const profile = await prisma.profile.update({
    where: { userId },
    data,
    include: profileWithUserInclude,
  });

  return toDto(profile);
}

export const profileService = {
  getOrCreateForUser,
  getByUserId,
  update,
  computeCompleteness,
};
