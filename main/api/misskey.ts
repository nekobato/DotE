import { baseHeader } from "./request";
import { requestJson } from "./helpers";

export const misskeyCheckMiAuth = async ({ instanceUrl, sessionId }: { instanceUrl: string; sessionId: string }) => {
  const url = new URL(`/api/miauth/${sessionId}/check`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({ sessionId }),
  });
};

export const missekyGetI = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  const url = new URL(`/api/i`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({ i: token }),
  });
};

export const misskeyGetEmojis = async ({ instanceUrl }: { instanceUrl: string }) => {
  const url = new URL("/api/emojis", instanceUrl).toString();
  console.info("[api][misskey:getEmojis] request:start", { url });
  const startedAt = Date.now();
  try {
    const response = await requestJson(url, {
      headers: baseHeader,
    });
    console.info("[api][misskey:getEmojis] request:done", {
      url,
      emojiCount: Array.isArray((response as any)?.emojis) ? (response as any).emojis.length : undefined,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    console.error("[api][misskey:getEmojis] request:failed", {
      url,
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
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
  const url = new URL(`/api/notes/timeline`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/notes/local-timeline`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/notes/global-timeline`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/channels/timeline`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      channelId,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/notes/user-list-timeline`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      listId,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/notes/search-by-tag`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      tag,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/antennas/notes`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      antennaId,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/notes/search`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      query,
      sinceId,
      untilId,
      limit,
    }),
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
  const url = new URL(`/api/i/notifications`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      limit,
      sinceId,
      untilId,
    }),
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
  const url = new URL(`/api/notes/reactions/create`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
      reaction,
    }),
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
  const url = new URL(`/api/notes/reactions/delete`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
    }),
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
  const url = new URL(`/api/notes/create`, instanceUrl).toString();
  return requestJson(url, {
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
  const url = new URL(`/api/notes/reactions`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
    }),
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
  const url = new URL(`/api/notes/show`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      noteId,
    }),
  });
};

export const misskeyGetMeta = async ({ instanceUrl }: { instanceUrl: string }) => {
  const url = new URL(`/api/meta`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({}),
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
  const url = new URL(`/api/channels/followed`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
      sinceId,
      limit: limit || 100,
    }),
  });
};

export const misskeyGetMyAntennas = async ({ instanceUrl, token }: { instanceUrl: string; token: string }) => {
  const url = new URL(`/api/antennas/list`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
    }),
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
  const url = new URL(`/api/users/lists/list`, instanceUrl).toString();
  return requestJson(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      i: token,
    }),
  });
};

export const misskeyGetAnnouncements = async ({ instanceUrl }: { instanceUrl: string }) => {
  const url = new URL(`/api/announcements`, instanceUrl).toString();
  return requestJson(url, {
    headers: baseHeader,
  });
};
