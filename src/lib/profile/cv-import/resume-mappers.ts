import type { EducationEntry, ExperienceEntry } from "@/lib/validators/profile"

export function parseJsonArray<T>(raw: string): T[] {
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

export function mapExperienceFromResume(
  rows: { title?: string; company?: string; duration?: string }[],
): ExperienceEntry[] {
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

export function mapEducationFromResume(
  rows: { degree?: string; institution?: string; year?: string }[],
): EducationEntry[] {
  return rows
    .filter((row) => row.institution?.trim())
    .map((row) => ({
      institution: row.institution!.trim().slice(0, 200),
      degree: row.degree?.trim().slice(0, 200),
      endDate: row.year?.trim().slice(0, 50),
    }))
    .slice(0, 20)
}

export function normalizeSkillsFromResume(skills: string[]): string[] {
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
