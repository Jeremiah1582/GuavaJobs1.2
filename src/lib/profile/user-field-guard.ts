import type { ProfileImportMeta } from "@/lib/validators/profile"

export type ImportConflict = {
  field: string
  label: string
  current: string
  incoming: string
}

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  displayName: "Full name",
  headline: "Headline",
  location: "Location",
  websiteUrl: "Website",
  phone: "Phone",
  addressLine1: "Address line 1",
  addressLine2: "Address line 2",
  city: "City",
  region: "Region",
  postalCode: "Postcode",
  country: "Country",
  summary: "Summary",
  skills: "Skills",
  avatarUrl: "Profile photo",
  experience: "Experience",
  education: "Education",
  quiz: "Job preferences",
}

export function getUserEditedFields(meta: ProfileImportMeta | null | undefined): Set<string> {
  return new Set(meta?.userEditedFields ?? [])
}

export function mergeUserEditedFields(
  meta: ProfileImportMeta | null,
  fields: Iterable<string>,
): ProfileImportMeta {
  const merged = new Set([...(meta?.userEditedFields ?? []), ...fields])
  return {
    ...meta,
    userEditedFields: [...merged],
  }
}

export function collectStringImportConflict(
  field: string,
  current: string,
  incoming: string | null | undefined,
  userEditedFields: Set<string>,
): ImportConflict | null {
  const next = incoming?.trim()
  if (!next) return null
  const cur = current.trim()
  if (!cur) return null
  if (cur === next) return null
  if (!userEditedFields.has(field)) return null
  return {
    field,
    label: PROFILE_FIELD_LABELS[field] ?? field,
    current: cur,
    incoming: next,
  }
}
