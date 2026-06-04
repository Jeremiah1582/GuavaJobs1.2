import { ApiErrorCode } from "../../api/errors";

export class CoverLettersServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly userMessage?: string,
  ) {
    super(message);
    this.name = "CoverLettersServiceError";
  }
}
