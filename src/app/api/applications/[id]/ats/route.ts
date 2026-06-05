import { ApiErrorCode } from "@/lib/api/errors"
import { getReportForApplication } from "@/lib/applications/ats"
import { usersService } from "@/lib/users"

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
    const report = await getReportForApplication(session.id, id)
    if (!report) {
      return jsonError(ApiErrorCode.NOT_FOUND, "ATS report not available yet", 404)
    }
    return jsonSuccess({
      report,
      icp: report.icp,
      icpMatch: report.icpMatch,
    })
  } catch (err) {
    const handled = handleServiceError(err)
    if (handled) return handled
    throw err
  }
})
