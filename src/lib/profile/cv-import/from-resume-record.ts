import "server-only"

import type { ProfileUrlImportResult } from "@/lib/validators/profile-import"

import {
  mapEducationFromResume,
  mapExperienceFromResume,
  normalizeSkillsFromResume,
  parseJsonArray,
} from "./resume-mappers"

type ResumeRow = {
  summary: string | null
  skills: string
  experience: string
  education: string
  filename: string
}

export function profileImportFromResumeRecord(
  resume: ResumeRow,
): ProfileUrlImportResult {
  const skills = normalizeSkillsFromResume(parseJsonArray<string>(resume.skills))
  const experience = mapExperienceFromResume(
    parseJsonArray<{ title?: string; company?: string; duration?: string }>(
      resume.experience,
    ),
  )
  const education = mapEducationFromResume(
    parseJsonArray<{
      degree?: string
      institution?: string
      year?: string
    }>(resume.education),
  )

  const summary = resume.summary?.trim() || null
  let confidence: ProfileUrlImportResult["confidence"] = "low"
  let score = 0
  if (summary) score += 2
  if (experience.length > 0) score += 2
  if (skills.length >= 3) score += 1
  if (education.length > 0) score += 1
  if (score >= 5) confidence = "high"
  else if (score >= 2) confidence = "medium"

  return {
    name: null,
    headline: null,
    summary,
    location: null,
    phone: null,
    avatarUrl: null,
    websiteUrl: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    country: null,
    skills,
    experience,
    education,
    quiz: undefined,
    confidence,
    pagesScanned: [
      {
        url: "https://internhunt.local/resume-scan",
        path: `Resume scan (${resume.filename})`,
        ok: true,
      },
    ],
  }
}
