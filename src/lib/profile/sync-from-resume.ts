import "server-only"

import { prisma } from "@/db"
import type {
  EducationEntry,
  ExperienceEntry,
  ProfileUpdateInput,
} from "@/lib/validators/profile"

import { profileService, type ProfileDto } from "./service"

export type SyncMode = "merge" | "overwrite"

type ResumeExperienceRow = {
  title?: string
  company?: string
  duration?: string
}

type ResumeEducationRow = {
  degree?: string
  institution?: string
  year?: string
  gpa?: string
}

function parseJsonArray<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function parseDuration(duration: string): {
  startDate: string
  endDate?: string
} {
  const trimmed = duration.trim()
  if (!trimmed) return { startDate: "—" }

  const parts = trimmed.split(/\s*(?:-|–|—|\bto\b)\s*/i).map((p) => p.trim())
  if (parts.length >= 2 && parts[0]) {
    return {
      startDate: parts[0].slice(0, 50),
      endDate: parts.slice(1).join(" - ").slice(0, 50) || undefined,
    }
  }

  return { startDate: trimmed.slice(0, 50) }
}

function mapExperience(rows: ResumeExperienceRow[]): ExperienceEntry[] {
  return rows
    .filter((row) => row.title?.trim() || row.company?.trim())
    .map((row) => {
      const { startDate, endDate } = parseDuration(row.duration ?? "")
      return {
        role: (row.title?.trim() || "Role").slice(0, 200),
        company: (row.company?.trim() || "Company").slice(0, 200),
        startDate,
        endDate,
        bullets: [""],
      }
    })
    .slice(0, 30)
}

function mapEducation(rows: ResumeEducationRow[]): EducationEntry[] {
  return rows
    .filter((row) => row.institution?.trim())
    .map((row) => ({
      institution: row.institution!.trim().slice(0, 200),
      degree: row.degree?.trim().slice(0, 200),
      endDate: row.year?.trim().slice(0, 50),
    }))
    .slice(0, 20)
}

function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const skill of skills) {
    const s = skill.trim()
    if (!s || s.length > 100) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= 100) break
  }
  return out
}

function hasExperience(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function hasEducation(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function buildProfileUpdateFromResume(resume: {
  summary: string | null
  skills: string
  experience: string
  education: string
}): ProfileUpdateInput {
  const update: ProfileUpdateInput = {}

  const summary = resume.summary?.trim()
  if (summary) update.summary = summary

  const skills = normalizeSkills(parseJsonArray<string>(resume.skills))
  if (skills.length > 0) update.skills = skills

  const experience = mapExperience(
    parseJsonArray<ResumeExperienceRow>(resume.experience),
  )
  if (experience.length > 0) update.experienceJson = experience

  const education = mapEducation(
    parseJsonArray<ResumeEducationRow>(resume.education),
  )
  if (education.length > 0) update.educationJson = education

  return update
}

function mergeUpdates(
  current: ProfileDto,
  fromResume: ProfileUpdateInput,
): ProfileUpdateInput {
  const merged: ProfileUpdateInput = {}

  if (fromResume.summary && !current.summary?.trim()) {
    merged.summary = fromResume.summary
  }
  if (fromResume.skills?.length && current.skills.length === 0) {
    merged.skills = fromResume.skills
  }
  if (
    fromResume.experienceJson?.length &&
    !hasExperience(current.experienceJson)
  ) {
    merged.experienceJson = fromResume.experienceJson
  }
  if (
    fromResume.educationJson?.length &&
    !hasEducation(current.educationJson)
  ) {
    merged.educationJson = fromResume.educationJson
  }

  return merged
}

function overwriteUpdates(fromResume: ProfileUpdateInput): ProfileUpdateInput {
  const out: ProfileUpdateInput = {}
  if (fromResume.summary !== undefined) out.summary = fromResume.summary
  if (fromResume.skills !== undefined) out.skills = fromResume.skills
  if (fromResume.experienceJson !== undefined) {
    out.experienceJson = fromResume.experienceJson
  }
  if (fromResume.educationJson !== undefined) {
    out.educationJson = fromResume.educationJson
  }
  return out
}

export async function syncFromResume(
  userId: string,
  resumeId: string,
  mode: SyncMode,
): Promise<boolean> {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId, isActive: 1 },
  })
  if (!resume) {
    throw new Error("Resume not found or no longer active.")
  }

  const fromResume = buildProfileUpdateFromResume(resume)
  if (Object.keys(fromResume).length === 0) {
    return false
  }

  await profileService.getOrCreateForUser(userId)
  const current = await profileService.getByUserId(userId)
  if (!current) {
    throw new Error("Profile could not be loaded.")
  }

  const update =
    mode === "overwrite"
      ? overwriteUpdates(fromResume)
      : mergeUpdates(current, fromResume)

  if (Object.keys(update).length === 0) {
    return false
  }

  await profileService.update(userId, update)
  return true
}
