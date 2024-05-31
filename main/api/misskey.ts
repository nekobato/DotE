const fetch = require("electron-fetch").default;
import { Response } from "electron-fetch";
// import fetch from "electron-fetch";
import { baseHeader } from "./request";

export const misskeyCheckMiAuth = async ({ instanceUrl, sessionId }: { instanceUrl: string; sessionId: string }) => {
  return fetch(new URL(`/api/miauth/${sessionId}/check`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({ sessionId }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const missekyGetI = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  return fetch(new URL(`/api/i`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({ i: token }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetEmojis = async ({ instanceUrl }: { instanceUrl: string }) => {
  return fetch(new URL("/api/emojis", instanceUrl).toString(), {
    headers: baseHeader,
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineHome = async ({
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
  return fetch(new URL(`/api/notes/timeline`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineLocal = async ({
  instanceUrl,
  token,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  sinceId?: string;
  untilId?: string;
  limit: number;
}) => {
  return fetch(new URL(`/api/notes/local-timeline`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineGlobal = async ({
  instanceUrl,
  token,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  sinceId?: string;
  untilId?: string;
  limit: number;
}) => {
  return fetch(new URL(`/api/notes/global-timeline`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineChannel = async ({
  instanceUrl,
  token,
  channelId,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  channelId: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  return fetch(new URL(`/api/channels/timeline`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      channelId,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineUserList = async ({
  instanceUrl,
  token,
  listId,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  listId: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  return fetch(new URL(`/api/notes/user-list-timeline`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      listId,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineHashtag = async ({
  instanceUrl,
  token,
  tag,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  tag: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  return fetch(new URL(`/api/notes/search-by-tag`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      tag,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineAntenna = async ({
  instanceUrl,
  token,
  antennaId,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  antennaId: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  return fetch(new URL(`/api/antennas/notes`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      antennaId,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetTimelineSearch = async ({
  instanceUrl,
  token,
  query,
  sinceId,
  untilId,
  limit,
}: {
  instanceUrl: string;
  token: string;
  query: string;
  limit: number;
  sinceId?: string;
  untilId?: string;
}) => {
  return fetch(new URL(`/api/notes/search`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      query,
      sinceId,
      untilId,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetNotifications = async ({
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
  return fetch(new URL(`/api/i/notifications`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      limit,
      sinceId,
      untilId,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyCreateReaction = async ({
  instanceUrl,
  token,
  noteId,
  reaction,
}: {
  instanceUrl: string;
  token: string;
  noteId: string;
  reaction: string;
}) => {
  return fetch(new URL(`/api/notes/reactions/create`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
      reaction,
    }),
  }).then((res: Response) => {
    return res.text();
  });
};

export const misskeyDeleteReaction = async ({
  instanceUrl,
  token,
  noteId,
}: {
  instanceUrl: string;
  token: string;
  noteId: string;
}) => {
  return fetch(new URL(`/api/notes/reactions/delete`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
    }),
  }).then((res: Response) => {
    return res.text();
  });
};

export const misskeyCreateNote = async ({
  instanceUrl,
  token,
  text,
  cw,
  visibility,
  replyId,
  renoteId,
  poll,
  files,
}: {
  instanceUrl: string;
  token: string;
  text: string;
  cw: string | null;
  visibility?: string;
  replyId?: string;
  renoteId?: string;
  poll?: any;
  files?: any;
}) => {
  return fetch(new URL(`/api/notes/create`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      text,
      cw,
      visibility,
      replyId,
      renoteId,
      poll,
      files,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetNoteReactions = async ({
  instanceUrl,
  token,
  noteId,
}: {
  instanceUrl: string;
  token: string;
  noteId: string;
}) => {
  return fetch(new URL(`/api/notes/reactions`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetNote = async ({
  instanceUrl,
  token,
  noteId,
}: {
  instanceUrl: string;
  token: string;
  noteId: string;
}) => {
  return fetch(new URL(`/api/notes/show`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetMeta = async ({ instanceUrl }: { instanceUrl: string }) => {
  return fetch(new URL(`/api/meta`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({}),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetFollowedChannels = async ({
  instanceUrl,
  token,
  limit,
  sinceId,
}: {
  instanceUrl: string;
  token: string;
  limit?: number;
  sinceId?: string;
}) => {
  return fetch(new URL(`/api/channels/followed`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      limit: limit || 100,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetMyAntennas = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  return fetch(new URL(`/api/antennas/list`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetUserLists = async ({
  instanceUrl,
  token,
}: {
  instanceUrl: string;
  token: string;
  userId: string;
}) => {
  return fetch(new URL(`/api/users/lists/list`, instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const misskeyGetAnnouncements = async ({ instanceUrl }: { instanceUrl: string }) => {
  return fetch(new URL(`/api/announcements`, instanceUrl).toString(), {
    headers: baseHeader,
  }).then((res: Response) => {
    return res.json();
  });
};
