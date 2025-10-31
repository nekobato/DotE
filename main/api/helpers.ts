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

export const requestJson = async <T>(url: string, init?: Parameters<typeof fetch>[1]): Promise<T> => {
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

export type { ApiErrorPayload };
