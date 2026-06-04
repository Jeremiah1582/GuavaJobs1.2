export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  error: ApiErrorBody;
};

export type ApiSuccessResponse<T> = {
  data: T;
};
