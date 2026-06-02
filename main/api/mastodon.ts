import { baseHeader } from "./request";
import fetch from "electron-fetch";
import { ApiError, buildMultipartFormData, requestFormData, requestJson, resolveUploadFileData } from "./helpers";
import { getInstanceMetaCache, setInstanceMetaCache } from "../db";

const INSTANCE_META_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type MastodonGetMediaResult =
  | {
      state: "processed";
      media: unknown;
    }
  | {
      state: "processing";
      media?: unknown;
    };

/**
 * Check whether cached instance metadata is fresh enough to skip a network request.
 */
const isFreshInstanceMetaCache = (cachedAt: number, now = Date.now()): boolean => {
  return now - cachedAt < INSTANCE_META_CACHE_TTL_MS;
};

export const mastodonRegisterApp = async ({ instanceUrl, clientName }: { instanceUrl: string; clientName: string }) => {
  const url = new URL(`/api/v1/apps`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: "urn:ietf:wg:oauth:2.0:oob",
      scopes: "read write follow",
    }),
  });
};

export const mastodonGetAccessToken = async ({
  instanceUrl,
  clientId,
  clientSecret,
  code,
}: {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
}) => {
  const url = new URL(`/oauth/token`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
    }),
  });
};

export const mastodonGetAccount = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  const url = new URL(`/api/v1/accounts/verify_credentials`, instanceUrl).toString();
  return requestJson(url, {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetInstance = async ({ instanceUrl }: { instanceUrl: string }) => {
  const url = new URL(`/api/v2/instance`, instanceUrl).toString();
  const cached = getInstanceMetaCache("mastodon", instanceUrl);
  if (cached && isFreshInstanceMetaCache(cached.cachedAt)) {
    return cached.data;
  }

  try {
    const meta = await requestJson(url);
    setInstanceMetaCache("mastodon", instanceUrl, meta);
    return meta;
  } catch (error) {
    if (cached) {
      console.warn("[mastodon] getInstance:using-stale-cache", {
        instanceUrl,
        cachedAt: new Date(cached.cachedAt).toISOString(),
      });
      return cached.data;
    }
    throw error;
  }
};

export const mastodonGetTimelinePublic = async ({
  instanceUrl,
  token,
  limit,
  sinceId,
  untilId,
}: {
  instanceUrl: string;
  token: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  const url = new URL(`/api/v1/timelines/public`, instanceUrl);
  url.searchParams.append("limit", limit.toString());
  if (sinceId) {
    url.searchParams.append("since_id", sinceId);
  }
  if (untilId) {
    url.searchParams.append("max_id", untilId);
  }
  return requestJson(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetTimelineHome = async ({
  instanceUrl,
  token,
  limit,
  sinceId,
  untilId,
}: {
  instanceUrl: string;
  token: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  const url = new URL(`/api/v1/timelines/home`, instanceUrl);
  url.searchParams.append("limit", limit.toString());
  if (sinceId) {
    url.searchParams.append("since_id", sinceId);
  }
  if (untilId) {
    url.searchParams.append("max_id", untilId);
  }
  return requestJson(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetTimelineLocal = async ({
  instanceUrl,
  token,
  limit,
  sinceId,
  untilId,
}: {
  instanceUrl: string;
  token: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  const url = new URL(`/api/v1/timelines/public`, instanceUrl);
  url.searchParams.append("limit", limit.toString());
  if (sinceId) {
    url.searchParams.append("since_id", sinceId);
  }
  if (untilId) {
    url.searchParams.append("max_id", untilId);
  }
  return requestJson(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetTimelineHashtag = async ({
  instanceUrl,
  token,
  limit,
  tag,
  sinceId,
  untilId,
}: {
  instanceUrl: string;
  token: string;
  limit: number;
  tag: string;
  sinceId?: string;
  untilId?: string;
}) => {
  const url = new URL(`/api/v1/timelines/tag/${tag}`, instanceUrl);
  url.searchParams.append("limit", limit.toString());
  if (sinceId) {
    url.searchParams.append("since_id", sinceId);
  }
  if (untilId) {
    url.searchParams.append("max_id", untilId);
  }
  return requestJson(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetTimelineList = async ({
  instanceUrl,
  token,
  limit,
  listId,
  sinceId,
  untilId,
}: {
  instanceUrl: string;
  token: string;
  limit: number;
  listId: string;
  sinceId?: string;
  untilId?: string;
}) => {
  const url = new URL(`/api/v1/timelines/list/${listId}`, instanceUrl);
  url.searchParams.append("limit", limit.toString());
  if (sinceId) {
    url.searchParams.append("since_id", sinceId);
  }
  if (untilId) {
    url.searchParams.append("max_id", untilId);
  }
  return requestJson(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetNotifications = async ({
  instanceUrl,
  token,
  limit,
  sinceId,
  untilId,
}: {
  instanceUrl: string;
  token: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  const url = new URL(`/api/v1/notifications`, instanceUrl);
  url.searchParams.append("limit", limit.toString());
  if (sinceId) {
    url.searchParams.append("since_id", sinceId);
  }
  if (untilId) {
    url.searchParams.append("max_id", untilId);
  }
  return requestJson(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonUploadMedia = async ({
  instanceUrl,
  token,
  filePath,
  fileDataBase64,
  fileName,
  fileType,
  description,
}: {
  instanceUrl: string;
  token: string;
  filePath?: string;
  fileDataBase64?: string;
  fileName?: string;
  fileType?: string;
  description?: string;
}) => {
  const url = new URL(`/api/v2/media`, instanceUrl).toString();
  const { data, filename } = await resolveUploadFileData({
    filePath,
    fileDataBase64,
    fileName,
    fallbackFileName: "upload",
  });
  const fields = [] as { name: string; value: string | number | boolean }[];
  if (description) {
    fields.push({ name: "description", value: description });
  }
  const { body, contentType } = buildMultipartFormData({
    fields,
    file: {
      name: "file",
      filename,
      data,
      contentType: fileType || "application/octet-stream",
    },
  });
  return requestFormData(url, {
    body,
    contentType,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Read a response body for diagnostics without letting body read failures hide the original request state.
 */
const readResponseBody = async (response: Awaited<ReturnType<typeof fetch>>): Promise<string> => {
  try {
    return await response.text();
  } catch (error) {
    return error instanceof Error ? `Failed to read body: ${error.message}` : "Failed to read body";
  }
};

/**
 * Convert fetch response headers into serializable metadata for IPC error payloads.
 */
const sanitizeResponseHeaders = (response: Awaited<ReturnType<typeof fetch>>): Record<string, string> => {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
};

/**
 * Parse a Mastodon JSON response body and report invalid responses as API errors.
 */
const parseMastodonJsonBody = <T>({
  body,
  status,
  url,
  headers,
}: {
  body: string;
  status: number;
  url: string;
  headers: Record<string, string>;
}): T => {
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new ApiError("Failed to parse JSON response", {
      type: "parse",
      status,
      url,
      bodyPreview: body,
      headers,
      message: error instanceof Error ? error.message : "JSON parse error",
    });
  }
};

/**
 * Get a Mastodon media attachment processing state before attaching it to a status.
 */
export const mastodonGetMedia = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}): Promise<MastodonGetMediaResult> => {
  const url = new URL(`/api/v1/media/${id}`, instanceUrl).toString();
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(url, {
      headers: {
        ...baseHeader,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new ApiError("Network request failed", {
      type: "network",
      url,
      message: error instanceof Error ? error.message : "Unknown network error",
    });
  }

  const status = response.status;
  const responseUrl = response.url || url;
  const headers = sanitizeResponseHeaders(response);
  const body = await readResponseBody(response);

  if (status === 206) {
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json") && body
      ? { state: "processing", media: parseMastodonJsonBody({ body, status, url: responseUrl, headers }) }
      : { state: "processing" };
  }

  if (!response.ok) {
    throw new ApiError(`HTTP ${status} ${response.statusText}`, {
      type: "http",
      status,
      url: responseUrl,
      bodyPreview: body,
      headers,
      message: response.statusText,
    });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError("Response is not JSON", {
      type: "parse",
      status,
      url: responseUrl,
      bodyPreview: body,
      headers,
      message: `Expected JSON but received ${contentType || "unknown"}`,
    });
  }

  return {
    state: "processed",
    media: parseMastodonJsonBody({ body, status, url: responseUrl, headers }),
  };
};

export const mastodonPostStatus = async ({
  instanceUrl,
  token,
  status,
  inReplyToId,
  mediaIds,
  sensitive,
  spoilerText,
  visibility,
}: {
  instanceUrl: string;
  token: string;
  status: string;
  inReplyToId?: string;
  mediaIds?: string[];
  sensitive?: boolean;
  spoilerText?: string;
  visibility?: "public" | "unlisted" | "private" | "direct";
}) => {
  const url = new URL(`/api/v1/statuses`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status,
      in_reply_to_id: inReplyToId,
      media_ids: mediaIds,
      sensitive,
      spoiler_text: spoilerText,
      visibility,
    }),
  });
};

export const mastodonDeleteStatus = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}) => {
  const url = new URL(`/api/v1/statuses/${id}`, instanceUrl).toString();
  return requestJson(url, {
    method: "DELETE",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonFavourite = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}) => {
  const url = new URL(`/api/v1/statuses/${id}/favourite`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonUnFavourite = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}) => {
  const url = new URL(`/api/v1/statuses/${id}/unfavourite`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonReblog = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}) => {
  const url = new URL(`/api/v1/statuses/${id}/reblog`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonUnReblog = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}) => {
  const url = new URL(`/api/v1/statuses/${id}/unreblog`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetStatus = async ({
  instanceUrl,
  token,
  id,
}: {
  instanceUrl: string;
  token: string;
  id: string;
}) => {
  const url = new URL(`/api/v1/statuses/${id}`, instanceUrl).toString();
  return requestJson(url, {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};

export const mastodonGetList = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  const url = new URL(`/api/v1/lists`, instanceUrl).toString();
  return requestJson(url, {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  });
};
