/** Extract a human-readable message from API error JSON shapes. */
export function apiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const row = payload as Record<string, unknown>;
  const err = row.error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof row.message === "string" && row.message.trim()) return row.message;
  return undefined;
}

function unwrapApiPayload<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in body) {
    const row = body as { data?: unknown };
    if (row.data !== undefined) {
      return row.data as T;
    }
  }
  return body as T;
}

/** Parse JSON from a fetch Response; surface HTML/error pages as readable errors. */
export async function parseApiResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await res.json();
    return unwrapApiPayload<T>(body);
  }

  const body = (await res.text()).trim();
  const snippet = body.replace(/\s+/g, " ").slice(0, 120);

  if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
    throw new Error(
      res.status === 500
        ? "Server error while uploading. Restart the dev server and check DATABASE_URL in .env.local."
        : `Unexpected server response (${res.status}). ${snippet}`,
    );
  }

  throw new Error(snippet || `Request failed (${res.status})`);
}
