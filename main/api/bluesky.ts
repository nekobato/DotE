import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client";
import { createBlueskyAgent } from "../oauth/agent";
import { getBlueskyOAuthClient } from "../oauth/client";

const restoreSession = async (did: string, refresh: boolean | "auto" = "auto"): Promise<OAuthSession> => {
  if (!did) throw new Error("Bluesky DID is required");
  const client = await getBlueskyOAuthClient();
  return client.restore(did, refresh);
};

const withAgent = async <T>(did: string, fn: (agent: Agent, session: OAuthSession) => Promise<T>): Promise<T> => {
  const session = await restoreSession(did);
  const agent = createBlueskyAgent(session);
  return fn(agent, session);
};

export const blueskyGetProfile = async ({ did }: { did: string }) => {
  return withAgent(did, async (agent) => {
    const res = await agent.getProfile({ actor: did });
    return res.data;
  });
};

export const blueskyGetTimeline = async ({
  did,
  cursor,
  limit = 30,
}: {
  did: string;
  cursor?: string;
  limit?: number;
}) => {
  return withAgent(did, async (agent) => {
    const res = await agent.getTimeline({ cursor, limit });
    return res.data;
  });
};

export const blueskyCreatePost = async ({
  did,
  text,
  replyTo,
  quote,
}: {
  did: string;
  text: string;
  replyTo?: { uri: string; cid: string };
  quote?: { uri: string; cid: string };
}) => {
  return withAgent(did, async (agent) => {
    const record: Record<string, unknown> = {
      text,
      createdAt: new Date().toISOString(),
    };

    if (replyTo) {
      record.reply = {
        root: { uri: replyTo.uri, cid: replyTo.cid },
        parent: { uri: replyTo.uri, cid: replyTo.cid },
      };
    }

    if (quote) {
      record.embed = {
        $type: "app.bsky.embed.record",
        record: {
          uri: quote.uri,
          cid: quote.cid,
        },
      };
    }

    const res = await agent.post(record);
    return res;
  });
};

export const blueskyLike = async ({
  did,
  uri,
  cid,
}: {
  did: string;
  uri: string;
  cid: string;
}) => {
  return withAgent(did, async (agent) => {
    const res = await agent.like(uri, cid);
    return res;
  });
};

export const blueskyDeleteLike = async ({
  did,
  uri,
}: {
  did: string;
  uri: string;
}) => {
  return withAgent(did, async (agent) => {
    await agent.deleteLike(uri);
    return;
  });
};
