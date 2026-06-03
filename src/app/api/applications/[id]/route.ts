import { ApiErrorCode, applicationsService, usersService } from "@guavajobs/core"

import { getSession } from "@/lib/auth/get-session"
import { handleServiceError } from "@/lib/api/handle-service-error"
import { jsonError, jsonSuccess } from "@/lib/api/response"
import { withErrorHandler } from "@/lib/api/with-error-handler"

export const GET = withErrorHandler(async (_request, context) => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  const { id } = await context.params
  await usersService.ensureUser(session)

  try {
    const data = await applicationsService.getBundleForUser(session.id, id)
    return jsonSuccess(data)
  } catch (err) {
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})

export const PATCH = withErrorHandler(async (request, context) => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(ApiErrorCode.VALIDATION_ERROR, "Invalid JSON body", 400)
  }

  await usersService.ensureUser(session)
  try {
    const data = await applicationsService.update(session.id, id, body as never)
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

export const DELETE = withErrorHandler(async (_request, context) => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  const { id } = await context.params
  await usersService.ensureUser(session)

  try {
    await applicationsService.remove(session.id, id)
    return jsonSuccess({ ok: true })
  } catch (err) {
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})
