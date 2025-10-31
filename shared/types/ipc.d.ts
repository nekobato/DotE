export type ApiErrorType = "http" | "network" | "parse" | "unknown";

export type ApiErrorPayload = {
  type: ApiErrorType;
  message: string;
  status?: number;
  url?: string;
  bodyPreview?: string;
  headers?: Record<string, string>;
};

export type ApiInvokeSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiInvokeFailure = {
  ok: false;
  error: ApiErrorPayload;
};

export type ApiInvokeResult<T> = ApiInvokeSuccess<T> | ApiInvokeFailure;
