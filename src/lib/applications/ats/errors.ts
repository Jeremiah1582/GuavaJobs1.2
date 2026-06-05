import { ApiErrorCode } from "@/lib/api/errors";

export class AtsServiceError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
    public readonly userMessage?: string,
  ) {
    super(message);
    this.name = "AtsServiceError";
  }
}
