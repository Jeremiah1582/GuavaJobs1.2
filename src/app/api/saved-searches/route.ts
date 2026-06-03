import {
  ApiErrorCode,
  savedJobSearchesService,
  usersService,
} from "@guavajobs/core"

import { getSession } from "@/lib/auth/get-session"
import { handleServiceError } from "@/lib/api/handle-service-error"
import { jsonError, jsonSuccess } from "@/lib/api/response"
import { withErrorHandler } from "@/lib/api/with-error-handler"

export const GET = withErrorHandler(async () => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  await usersService.ensureUser(session)
  try {
    const data = await savedJobSearchesService.listByUser(session.id)
    return jsonSuccess(data)
  } catch (err) {
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})

export const POST = withErrorHandler(async (request) => {
  const session = await getSession()
  if (!session) {
    return jsonError(ApiErrorCode.UNAUTHORIZED, "Authentication required", 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(ApiErrorCode.VALIDATION_ERROR, "Invalid JSON body", 400)
  }

  await usersService.ensureUser(session)
  try {
    const data = await savedJobSearchesService.create(session.id, body as never)
    return jsonSuccess(data, 201)
  } catch (err) {
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})
