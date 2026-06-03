import { ApiErrorCode, coverLettersService, usersService } from "@guavajobs/core"

import { getSession } from "@/lib/auth/get-session"
import { handleServiceError } from "@/lib/api/handle-service-error"
import { jsonError, jsonSuccess } from "@/lib/api/response"
import { withErrorHandler } from "@/lib/api/with-error-handler"

export const PATCH = withErrorHandler(async (request, context) => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  const { id, letterId } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(ApiErrorCode.VALIDATION_ERROR, "Invalid JSON body", 400)
  }

  await usersService.ensureUser(session)
  try {
    const parsed = body as { content?: string }
    const data = await coverLettersService.updateLetter(
      session.id,
      id,
      letterId,
      { content: String(parsed.content ?? "") },
    )
    return jsonSuccess(data)
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      const issues = (err as { issues: { message: string }[] }).issues
      return jsonError(
        ApiErrorCode.VALIDATION_ERROR,
        issues.map((e) => e.message).join("; "),
        400,
      )
    }
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})
