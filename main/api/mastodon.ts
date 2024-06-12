const fetch = require("electron-fetch").default;
import { Response } from "electron-fetch";
// import fetch from "electron-fetch";
import { baseHeader } from "./request";

export const mastodonRegisterApp = async ({ instanceUrl, clientName }: { instanceUrl: string; clientName: string }) => {
  return fetch(new URL(`/api/v1/apps`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: "urn:ietf:wg:oauth:2.0:oob",
      scopes: "read write follow",
    }),
  }).then((res: Response) => {
    return res.json();
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
  return fetch(new URL(`/oauth/token`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const mastodonGetAccount = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  return fetch(new URL(`/api/v1/accounts/verify_credentials`, instanceUrl).toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
  });
};

export const mastodonGetInstance = async ({ instanceUrl }: { instanceUrl: string }) => {
  return fetch(new URL(`/api/v2/instance`, instanceUrl).toString()).then((res: Response) => {
    return res.json();
  });
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
  return fetch(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(url.toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(new URL(`/api/v1/statuses`, instanceUrl).toString(), {
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
  }).then((res: Response) => {
    return res.json();
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
  return fetch(new URL(`/api/v1/statuses/${id}`, instanceUrl).toString(), {
    method: "DELETE",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(new URL(`/api/v1/statuses/${id}/favourite`, instanceUrl).toString(), {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(new URL(`/api/v1/statuses/${id}/unfavourite`, instanceUrl).toString(), {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
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
  return fetch(new URL(`/api/v1/statuses/${id}`, instanceUrl).toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
  });
};

export const mastodonGetList = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  return fetch(new URL(`/api/v1/lists`, instanceUrl).toString(), {
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${token}`,
    },
  }).then((res: Response) => {
    return res.json();
  });
};
