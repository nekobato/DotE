import { baseHeader } from "./request";
import { requestJson } from "./helpers";

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
  return requestJson(url);
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
