import { NextResponse } from "next/server"
import {
  ProfileUrlImportError,
  importProfileFromUrl,
} from "@guavajobs/core/profile-url-import"

import { getSession } from "@/lib/auth/get-session"
import { devErrorDetails, isDevMode } from "@/lib/dev-mode"

export const runtime = "nodejs"
export const maxDuration = 60

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

    const body = (await request.json()) as {
      url?: string
      additionalPaths?: string[]
    }

    if (!body.url || typeof body.url !== "string") {
      return jsonError(400, { error: "URL is required", code: "INVALID_REQUEST" })
    }

    const additionalPaths = Array.isArray(body.additionalPaths)
      ? body.additionalPaths.filter((p): p is string => typeof p === "string")
      : undefined

    const data = await importProfileFromUrl(body.url, { additionalPaths })

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof ProfileUrlImportError) {
      return jsonError(error.status, {
        error: error.userMessage ?? error.message,
        code: error.code,
        ...(isDevMode() && {
          devMessage: error.message,
          details: { code: error.code, message: error.message },
        }),
      })
    }

    console.error("Profile parse error:", error)

    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError(408, {
        error:
          "Request timed out — try linking directly to your CV or About page.",
        code: "TIMEOUT",
        ...(isDevMode() && devErrorDetails(error)
          ? { details: devErrorDetails(error) }
          : {}),
      })
    }

    return jsonError(500, {
      error: "Failed to process profile URL",
      code: "INTERNAL_ERROR",
      ...(isDevMode() && {
        devMessage: error instanceof Error ? error.message : String(error),
        details: devErrorDetails(error) ?? { value: String(error) },
      }),
    })
  }
}
