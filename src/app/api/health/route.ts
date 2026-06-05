export const dynamic = "force-dynamic";

import { getPrisma } from "@/db";
import { API_VERSION } from "@/lib/api/version";
import { jsonSuccess } from "@/lib/api/response";
import { withErrorHandler } from "@/lib/api/with-error-handler";

export const GET = withErrorHandler(async () => {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return jsonSuccess({
      ok: true,
      status: "ok",
      version: API_VERSION,
      database: "postgres",
    });
  } catch {
    return jsonSuccess({
      ok: false,
      status: "degraded",
      version: API_VERSION,
      database: "error",
    });
  }
});
