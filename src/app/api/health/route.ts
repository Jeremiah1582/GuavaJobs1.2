import { API_VERSION, getDb, isDatabaseConfigured } from "@guavajobs/core"

import { jsonSuccess } from "@/lib/api/response"
import { withErrorHandler } from "@/lib/api/with-error-handler"

export const GET = withErrorHandler(async () => {
  const payload: {
    status: string
    version: string
    db?: string
  } = {
    status: "ok",
    version: API_VERSION,
  }

  if (isDatabaseConfigured()) {
    try {
      await getDb().$queryRaw`SELECT 1`
      payload.db = "connected"
    } catch {
      payload.db = "error"
    }
  }

  return jsonSuccess(payload)
})
