import "server-only"

import { createSupabaseAdmin } from "@/lib/supabase/admin"
import { extractTextFromPdfBuffer } from "@/lib/pdf-extract.server"
import { ProfileUrlImportError } from "@/lib/profile/url-import/errors"
import { profileService } from "@/lib/profile/service"

import { importProfileFromCvText } from "./extract"

const CV_BUCKET = "cv-uploads"

export async function importProfileFromStoredCv(
  userId: string,
): Promise<import("@/lib/validators/profile-import").ProfileUrlImportResult> {
  await profileService.getOrCreateForUser(userId)
  const profile = await profileService.getByUserId(userId)
  const path = profile?.cvFileUrl?.trim()

  if (!path) {
    throw new ProfileUrlImportError(
      "No CV on file",
      "INVALID_REQUEST",
      400,
      "Upload a CV in the section below first, then populate your profile from it.",
    )
  }

  const supabase = createSupabaseAdmin()
  const { data, error } = await supabase.storage.from(CV_BUCKET).download(path)

  if (error || !data) {
    throw new ProfileUrlImportError(
      error?.message ?? "Download failed",
      "FETCH_FAILED",
      400,
      "We could not read your uploaded CV. Try uploading again.",
    )
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  const filename = path.split("/").pop() ?? "cv"
  const mime = data.type || guessMime(filename)

  let text: string
  const isPdf =
    mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf")
  if (isPdf) {
    const extracted = await extractTextFromPdfBuffer(buffer)
    text = extracted.text
  } else if (mime.startsWith("text/") || filename.endsWith(".txt")) {
    text = buffer.toString("utf-8")
  } else {
    throw new ProfileUrlImportError(
      "Unsupported CV format",
      "INVALID_REQUEST",
      400,
      "Use PDF or plain text for profile import. Word import is not supported yet.",
    )
  }

  const label = filename || "Uploaded CV"
  return importProfileFromCvText(text, label)
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".txt")) return "text/plain"
  return "application/octet-stream"
}
