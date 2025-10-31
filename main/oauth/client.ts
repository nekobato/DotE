import { requestLocalLock } from "@atproto/oauth-client";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { oauthClientIdDiscoverableSchema } from "@atproto/oauth-types";
import { blueskySessionStore, blueskyStateStore } from "./store";
import { getBlueskyLoopbackRedirectUri, getBlueskyOAuthConfig } from "../db";

let cachedClient: NodeOAuthClient | null = null;
let cachedClientId: string | null = null;

export type BlueskyOAuthEnvironment = {
  clientId: string;
  redirectUri: string;
  scope: string;
  loopbackRedirectUri: string;
};

export const getBlueskyOAuthEnvironment = (): BlueskyOAuthEnvironment => {
  const config = getBlueskyOAuthConfig();
  return {
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    scope: config.scope,
    loopbackRedirectUri: getBlueskyLoopbackRedirectUri(),
  };
};

export const getBlueskyOAuthClient = async (clientId?: string): Promise<NodeOAuthClient> => {
  const resolvedClientId = clientId ?? getBlueskyOAuthEnvironment().clientId;
  if (!resolvedClientId) {
    throw new Error("Bluesky OAuth clientId is not configured");
  }

  const clientIdResult = oauthClientIdDiscoverableSchema.safeParse(resolvedClientId);
  if (!clientIdResult.success) {
    throw new Error("Bluesky OAuth clientId is invalid");
  }
  const validatedClientId = clientIdResult.data;

  if (!cachedClient || cachedClientId !== validatedClientId) {
    const clientMetadata = await NodeOAuthClient.fetchMetadata({ clientId: validatedClientId });
    cachedClient = new NodeOAuthClient({
      clientMetadata,
      stateStore: blueskyStateStore,
      sessionStore: blueskySessionStore,
      requestLock: requestLocalLock,
      allowHttp: true,
    });
    cachedClientId = validatedClientId;
  }

  if (!cachedClient) {
    throw new Error("Failed to initialize Bluesky OAuth client");
  }

  return cachedClient;
};

export const resetCachedBlueskyClient = () => {
  cachedClient = null;
  cachedClientId = null;
};
