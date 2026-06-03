import type { EducationEntry, ExperienceEntry } from "@guavajobs/core"

/**
 * Simple heuristic: split on blank lines; lines with " at " or " | " become roles.
 */
export function parseCvTextToExperience(text: string): ExperienceEntry[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  const entries: ExperienceEntry[] = []

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) continue

    const header = lines[0]
    let role = header
    let company = "Company"

    const atMatch = header.match(/^(.+?)\s+at\s+(.+)$/i)
    const pipeMatch = header.match(/^(.+?)\s*\|\s*(.+)$/)
    const dashMatch = header.match(/^(.+?)\s+[-–—]\s+(.+)$/)

    if (atMatch) {
      role = atMatch[1].trim()
      company = atMatch[2].trim()
    } else if (pipeMatch) {
      role = pipeMatch[1].trim()
      company = pipeMatch[2].trim()
    } else if (dashMatch) {
      role = dashMatch[1].trim()
      company = dashMatch[2].trim()
    }

    const bullets = lines
      .slice(1)
      .map((l) => l.replace(/^[-•*]\s*/, ""))
      .filter(Boolean)

    entries.push({
      role,
      company,
      startDate: "",
      bullets,
    })
  }

  return entries
}

export function extractSkillsFromText(text: string): string[] {
  const skillsLine = text
    .split("\n")
    .find((l) => /^skills?:/i.test(l.trim()))
  if (!skillsLine) return []

  return skillsLine
    .replace(/^skills?:/i, "")
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 100)
    .slice(0, 50)
}

export function parseCvTextToEducation(text: string): EducationEntry[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const eduLines = lines.filter((l) =>
    /university|college|bachelor|master|phd|b\.?sc|m\.?sc|degree/i.test(l),
  )

  return eduLines.slice(0, 10).map((line) => ({
    institution: line.replace(/^[-•*]\s*/, "").slice(0, 200),
  }))
}
