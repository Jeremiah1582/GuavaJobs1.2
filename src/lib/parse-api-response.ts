/** Parse JSON from a fetch Response; surface HTML/error pages as readable errors. */
export async function parseApiResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  const body = (await res.text()).trim();
  const snippet = body.replace(/\s+/g, " ").slice(0, 120);

  if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
    throw new Error(
      res.status === 500
        ? "Server error while uploading. Restart the dev server. If it persists, run: npm rebuild better-sqlite3"
        : `Unexpected server response (${res.status}). ${snippet}`,
    );
  }

  throw new Error(snippet || `Request failed (${res.status})`);
}
