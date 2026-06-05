export const dynamic = "force-dynamic";

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/db"
import {
  importProfileFromStoredCv,
  profileImportFromResumeRecord,
} from "@/lib/profile/cv-import"
import { ProfileUrlImportError } from "@/lib/profile/url-import/errors"
import { getSession } from "@/lib/auth/get-session"
import { devErrorDetails, isDevMode } from "@/lib/dev-mode"
import { usersService } from "@/lib/users"

export const runtime = "nodejs"
export const maxDuration = 60

const bodySchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("profileCv") }),
  z.object({
    source: z.literal("resume"),
    resumeId: z.string().uuid().optional(),
  }),
])

function jsonError(
  status: number,
  body: {
    error: string
    code?: string
    details?: unknown
    devMessage?: string
  },
) {
  return NextResponse.json(body, { status })
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" })
    }

    await usersService.ensureUser(session)

    let json: unknown
    try {
      json = await request.json()
    } catch {
      return jsonError(400, {
        error: "Invalid JSON body",
        code: "INVALID_REQUEST",
      })
    }

    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return jsonError(400, {
        error: "Invalid request",
        code: "INVALID_REQUEST",
        details: parsed.error.flatten(),
      })
    }

    if (parsed.data.source === "profileCv") {
      const data = await importProfileFromStoredCv(session.id)
      return NextResponse.json({ data })
    }

    const resumeId = parsed.data.resumeId
    const resume = resumeId
      ? await prisma.resume.findFirst({
          where: { id: resumeId, userId: session.id, isActive: 1 },
        })
      : await prisma.resume.findFirst({
          where: { userId: session.id, isActive: 1 },
          orderBy: { uploadedAt: "desc" },
        })

    if (!resume) {
      return jsonError(404, {
        error:
          "No resume scan found. Run the ATS analyzer first, or upload a CV below.",
        code: "NOT_FOUND",
      })
    }

    const data = profileImportFromResumeRecord(resume)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof ProfileUrlImportError) {
      return jsonError(error.status, {
        error: error.userMessage ?? error.message,
        code: error.code,
        ...(isDevMode() && {
          devMessage: error.message,
          details: devErrorDetails(error) ?? { code: error.code, message: error.message },
        }),
      })
    }

    const message =
      error instanceof Error ? error.message : "Failed to parse resume"
    return jsonError(500, {
      error: message,
      code: "INTERNAL_ERROR",
      devMessage: isDevMode() ? message : undefined,
    })
  }
}
