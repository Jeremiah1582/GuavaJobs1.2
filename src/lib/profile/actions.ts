"use server"

import {
  profileService,
  profileUpdateSchema,
  usersService,
} from "@guavajobs/core"
import { revalidatePath } from "next/cache"

import { getSession } from "@/lib/auth/get-session"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env"

export type ProfileActionState = {
  error?: string
  success?: boolean
} | null

const CV_BUCKET = "cv-uploads"

function formNullableString(
  raw: FormDataEntryValue | null,
): string | null | undefined {
  if (raw === null) return undefined
  const value = String(raw).trim()
  return value === "" ? null : value
}

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await getSession()
  if (!session) {
    return { error: "Not authenticated" }
  }

  await usersService.ensureUser(session)

  try {
    const input: Record<string, unknown> = {}

    const nullableFields = [
      "displayName",
      "summary",
      "headline",
      "location",
      "avatarUrl",
      "phone",
      "addressLine1",
      "addressLine2",
      "city",
      "region",
      "postalCode",
      "country",
      "websiteUrl",
      "linkedInUrl",
      "githubUrl",
      "aspiringRole",
      "personalityType",
      "salaryCurrency",
      "rightToWorkNote",
      "lastImportSourceUrl",
      "rightToWork",
      "targetSeniority",
      "employmentTypePreference",
      "relocationWillingness",
      "salaryPeriod",
    ] as const

    for (const field of nullableFields) {
      const value = formNullableString(formData.get(field))
      if (value !== undefined) {
        input[field] = value
      }
    }

    const experienceRaw = formData.get("experienceJson")
    const educationRaw = formData.get("educationJson")
    const quizRaw = formData.get("quizJson")
    const languagesRaw = formData.get("languagesJson")
    const skillsRaw = formData.get("skills")
    const importMetaRaw = formData.get("importMetaJson")
    const salaryNegotiableRaw = formData.get("salaryNegotiable")
    const salaryMinRaw = formData.get("salaryMin")
    const salaryMaxRaw = formData.get("salaryMax")
    const noticePeriodRaw = formData.get("noticePeriodWeeks")
    const availableFromRaw = formData.get("availableFrom")

    if (typeof experienceRaw === "string" && experienceRaw.length > 0) {
      input.experienceJson = JSON.parse(experienceRaw)
    }

    if (typeof educationRaw === "string" && educationRaw.length > 0) {
      input.educationJson = JSON.parse(educationRaw)
    }

    if (typeof quizRaw === "string" && quizRaw.length > 0) {
      input.quizJson = JSON.parse(quizRaw)
    }

    if (typeof languagesRaw === "string" && languagesRaw.length > 0) {
      input.languagesJson = JSON.parse(languagesRaw)
    }

    if (typeof salaryNegotiableRaw === "string") {
      input.salaryNegotiable = salaryNegotiableRaw === "true"
    }

    function parseOptionalInt(raw: FormDataEntryValue | null): number | null | undefined {
      if (raw === null) return undefined
      const value = String(raw).trim()
      if (value === "") return null
      const n = Number.parseInt(value, 10)
      return Number.isNaN(n) ? null : n
    }

    const salaryMin = parseOptionalInt(salaryMinRaw)
    if (salaryMin !== undefined) input.salaryMin = salaryMin

    const salaryMax = parseOptionalInt(salaryMaxRaw)
    if (salaryMax !== undefined) input.salaryMax = salaryMax

    const noticePeriodWeeks = parseOptionalInt(noticePeriodRaw)
    if (noticePeriodWeeks !== undefined) {
      input.noticePeriodWeeks = noticePeriodWeeks
    }

    if (typeof availableFromRaw === "string") {
      const value = availableFromRaw.trim()
      input.availableFrom = value === "" ? null : value
    }

    if (typeof skillsRaw === "string") {
      const skills = skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      input.skills = skills
    }

    if (typeof importMetaRaw === "string" && importMetaRaw.trim().length > 0) {
      input.importMetaJson = JSON.parse(importMetaRaw)
    }

    const parsed = profileUpdateSchema.parse(input)
    await profileService.update(session.id, parsed)
    revalidatePath("/profile")
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save profile"
    return { error: message }
  }
}

export async function uploadCvAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await getSession()
  if (!session) {
    return { error: "Not authenticated" }
  }

  if (!isSupabaseBrowserConfigured()) {
    return { error: "Storage is not configured." }
  }

  const file = formData.get("cvFile")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "File must be 5 MB or smaller." }
  }

  const allowed = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (file.type && !allowed.includes(file.type)) {
    return { error: "Upload PDF, Word, or plain text files only." }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const ext = file.name.split(".").pop() ?? "bin"
    const path = `${session.id}/${Date.now()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from(CV_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      })

    if (uploadError) {
      return {
        error:
          uploadError.message.includes("Bucket not found")
            ? "CV storage bucket is not set up in Supabase (cv-uploads)."
            : uploadError.message,
      }
    }

    await usersService.ensureUser(session)
    await profileService.update(session.id, { cvFileUrl: path })
    revalidatePath("/profile")
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload CV"
    return { error: message }
  }
}
