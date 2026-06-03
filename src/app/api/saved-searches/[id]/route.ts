import { ApiErrorCode, savedJobSearchesService, usersService } from "@guavajobs/core"

import { getSession } from "@/lib/auth/get-session"
import { handleServiceError } from "@/lib/api/handle-service-error"
import { jsonError, jsonSuccess } from "@/lib/api/response"
import { withErrorHandler } from "@/lib/api/with-error-handler"

export const DELETE = withErrorHandler(async (_request, context) => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  const { id } = await context.params
  await usersService.ensureUser(session)

  try {
    await savedJobSearchesService.remove(session.id, id)
    return jsonSuccess({ ok: true })
  } catch (err) {
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})
