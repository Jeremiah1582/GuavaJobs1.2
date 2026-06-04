/** True when running Next.js in development. */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Optional error payload for API responses in development. */
export function devErrorDetails(error: unknown): Record<string, unknown> | null {
  if (!isDevMode()) return null;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}
