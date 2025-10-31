import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client";

export const createBlueskyAgent = (session: OAuthSession) => {
  return new Agent({
    did: session.did,
    fetchHandler: (url, init) => session.fetchHandler(url, init),
  });
};
