import fetch, { Response } from "electron-fetch";
import type { ApiErrorPayload } from "@shared/types/ipc";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly details: ApiErrorPayload,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const buildMessage = (cause: unknown, fallback: string): string => {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === "string") {
    return cause;
  }
  return fallback;
};

const sanitizeHeaders = (headers: Response["headers"]) => {
  const sanitized: Record<string, string> = {};
  headers.forEach((value, key) => {
    sanitized[key] = value;
  });
  return sanitized;
};

const readBodyIfNeeded = async (response: Response, shouldRead: boolean): Promise<string | undefined> => {
  if (!shouldRead) {
    return undefined;
  }
  try {
    return await response.clone().text();
  } catch (error) {
    return `Failed to read body: ${buildMessage(error, "Unknown body read error")}`;
  }
};

type RequestJsonOptions = {
  allowEmpty?: boolean;
};

/**
 * JSON 応答を要求する共通リクエスト関数です。
 */
const requestJsonInternal = async <T>(
  url: string,
  init: Parameters<typeof fetch>[1] | undefined,
  options: RequestJsonOptions,
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new ApiError("Network request failed", {
      type: "network",
      url,
      message: buildMessage(error, "Unknown network error"),
    });
  }

  const status = response.status;
  const responseUrl = response.url || url;
  const isSuccess = response.ok;
  const contentType = response.headers.get("content-type") ?? "";

  if (isSuccess && options.allowEmpty && (status === 204 || status === 205)) {
    return undefined as T;
  }

  const bodySnapshot = await readBodyIfNeeded(response, !isSuccess);

  if (!contentType.includes("application/json")) {
    throw new ApiError("Response is not JSON", {
      type: "parse",
      status,
      url: responseUrl,
      bodyPreview: bodySnapshot,
      headers: sanitizeHeaders(response.headers),
      message: `Expected JSON but received ${contentType || "unknown"}`,
    });
  }

  if (!isSuccess) {
    throw new ApiError(`HTTP ${status} ${response.statusText}`, {
      type: "http",
      status,
      url: responseUrl,
      bodyPreview: bodySnapshot,
      headers: sanitizeHeaders(response.headers),
      message: response.statusText,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError("Failed to parse JSON response", {
      type: "parse",
      status,
      url: responseUrl,
      bodyPreview: bodySnapshot,
      headers: sanitizeHeaders(response.headers),
      message: buildMessage(error, "JSON parse error"),
    });
  }
};

/**
 * JSON 応答を要求する共通リクエスト関数です。
 */
export const requestJson = async <T>(url: string, init?: Parameters<typeof fetch>[1]): Promise<T> => {
  return requestJsonInternal(url, init, { allowEmpty: false });
};

/**
 * 204/205 の空응答を許容する JSON リクエストです。
 */
export const requestJsonAllowEmpty = async <T>(url: string, init?: Parameters<typeof fetch>[1]): Promise<T> => {
  return requestJsonInternal(url, init, { allowEmpty: true });
};

export type { ApiErrorPayload };

type MultipartField = {
  name: string;
  value: string | number | boolean;
};

type MultipartFile = {
  name: string;
  filename: string;
  data: Buffer;
  contentType?: string;
};

const CRLF = "\r\n";

const appendField = (buffers: Buffer[], boundary: string, field: MultipartField) => {
  buffers.push(Buffer.from(`--${boundary}${CRLF}`));
  buffers.push(Buffer.from(`Content-Disposition: form-data; name="${field.name}"${CRLF}${CRLF}`));
  buffers.push(Buffer.from(String(field.value)));
  buffers.push(Buffer.from(CRLF));
};

const appendFile = (buffers: Buffer[], boundary: string, file: MultipartFile) => {
  buffers.push(Buffer.from(`--${boundary}${CRLF}`));
  buffers.push(
    Buffer.from(`Content-Disposition: form-data; name="${file.name}"; filename="${file.filename}"${CRLF}`),
  );
  buffers.push(Buffer.from(`Content-Type: ${file.contentType || "application/octet-stream"}${CRLF}${CRLF}`));
  buffers.push(file.data);
  buffers.push(Buffer.from(CRLF));
};

export const buildMultipartFormData = ({
  fields,
  file,
}: {
  fields: MultipartField[];
  file: MultipartFile;
}): { body: Buffer; contentType: string } => {
  const boundary = `----DotEFormBoundary${Math.random().toString(16).slice(2)}`;
  const buffers: Buffer[] = [];
  fields.forEach((field) => appendField(buffers, boundary, field));
  appendFile(buffers, boundary, file);
  buffers.push(Buffer.from(`--${boundary}--${CRLF}`));

  return {
    body: Buffer.concat(buffers),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
};

export const requestFormData = async <T>(
  url: string,
  options: {
    body: Buffer;
    contentType: string;
    headers?: Record<string, string>;
    method?: string;
  },
): Promise<T> => {
  return requestJsonInternal(
    url,
    {
      method: options.method ?? "POST",
      headers: {
        ...(options.headers ?? {}),
        "content-type": options.contentType,
        "content-length": options.body.length.toString(),
      },
      body: options.body,
    },
    { allowEmpty: false },
  );
};
