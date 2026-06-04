export class ProfileUrlImportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_URL"
      | "BLOCKED_HOST"
      | "FETCH_FAILED"
      | "CONTENT_TOO_SHORT"
      | "AI_PARSE_FAILED"
      | "AI_UNAVAILABLE"
      | "AI_CONFIG_ERROR"
      | "TIMEOUT",
    public readonly status: number = 400,
    public readonly userMessage?: string,
  ) {
    super(message);
    this.name = "ProfileUrlImportError";
  }
}
