const fetch = require("electron-fetch").default;
import { Response } from "electron-fetch";
import { baseHeader } from "./request";

export const blueskyCreateSession = async ({
  instanceUrl,
  identifier,
  password,
}: {
  instanceUrl: string;
  identifier: string;
  password: string;
}): Promise<{
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}> => {
  return fetch(new URL("/xrpc/com.atproto.server.createSession", instanceUrl).toString(), {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({
      identifier,
      password,
    }),
  }).then((res: Response) => {
    console.log(res.status);
    return res.json();
  });
};

export const blueskyRefreshToken = async ({
  instanceUrl,
  refreshJwt,
}: {
  instanceUrl: string;
  refreshJwt: string;
}): Promise<{
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}> => {
  return fetch(new URL("/xrpc/com.atproto.server.refreshSession", instanceUrl).toString(), {
    method: "POST",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${refreshJwt}`,
    },
  }).then((res: Response) => {
    return res.json();
  });
};

export const blueskyGetProfile = async ({
  instanceUrl,
  actor,
  accessJwt,
}: {
  instanceUrl: string;
  actor: string;
  accessJwt: string;
}): Promise<{
  did: string;
  handle: string;
  displayName: string;
  description: string;
  avatar: string;
  banner: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  associated: any;
  joinedViaStarterPack: any;
  indexedAt: string;
  createdAt: string;
  viewer: any;
  labels: any[];
  pinnedPosts: any[];
}> => {
  return fetch(new URL("/xrpc/app.bsky.actor.getProfile", instanceUrl).toString(), {
    method: "GET",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${accessJwt}`,
    },
    body: JSON.stringify({
      actor,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};

export const blueskyGetAuthorFeed = async ({
  instanceUrl,
  actor,
  accessJwt,
  limit,
}: {
  instanceUrl: string;
  actor: string;
  accessJwt: string;
  limit: number;
  cursor?: string;
  filter?: "posts_with_replies" | "posts_no_replies" | "posts_with_media" | "posts_and_author_threads";
  includePins?: boolean;
}): Promise<{
  cursor: string;
  feed: {
    post: any;
    reply: any;
    reason: any;
  }[];
}> => {
  return fetch(new URL("/xrpc/app.bsky.feed.getAuthorFeed", instanceUrl).toString(), {
    method: "GET",
    headers: {
      ...baseHeader,
      Authorization: `Bearer ${accessJwt}`,
    },
    body: JSON.stringify({
      actor,
      limit,
    }),
  }).then((res: Response) => {
    return res.json();
  });
};
