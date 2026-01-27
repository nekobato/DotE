import { app, shell } from "electron";
import crypto from "node:crypto";
import type { AppBskyActorGetProfile } from "@atproto/api";
import { oauthRedirectUriSchema } from "@atproto/oauth-types";
import { getBlueskyOAuthClient, getBlueskyOAuthEnvironment } from "../oauth/client";
import { waitForOAuthCallback } from "../oauth/callback-router";
import { APP_PROTOCOL_PREFIX, APP_PROTOCOL_SCHEME } from "../oauth/constants";
import { createBlueskyAgent } from "../oauth/agent";

const DEFAULT_BSKY_INSTANCE_URL = "https://bsky.social";

const normalizeInstanceUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const candidate = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
};

type BlueskyOAuthUser = {
  name: string;
  avatarUrl: string;
  instanceUrl: string;
  instanceType: "bluesky";
  token: string;
  blueskySession: {
    did: string;
    handle: string;
    pdsUrl: string;
    authorizationServer: string;
    scope: string;
    tokenType: "DPoP";
    expiresAt?: string;
    active: boolean;
  };
};

export type BlueskyOAuthLoginParams = {
  handle: string;
  instanceUrl?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
};

export const blueskyStartOAuth = async ({
  handle,
  instanceUrl,
  clientId,
  redirectUri,
  scope,
}: BlueskyOAuthLoginParams): Promise<BlueskyOAuthUser> => {
  if (!handle) {
    throw new Error("Bluesky handle is required");
  }

  const fallbackInstanceUrl = normalizeInstanceUrl(instanceUrl);

  const env = getBlueskyOAuthEnvironment();
  const resolvedClientId = clientId ?? env.clientId;

  const isCustomSchemeRegistered =
    typeof app.isDefaultProtocolClient === "function"
      ? app.isDefaultProtocolClient(APP_PROTOCOL_SCHEME)
      : true;
  const isPackaged = app.isPackaged;

  let redirectUriCandidate = redirectUri ?? env.redirectUri;
  if (
    redirectUriCandidate.startsWith(APP_PROTOCOL_PREFIX) &&
    (!isPackaged || !isCustomSchemeRegistered) &&
    env.loopbackRedirectUri
  ) {
    console.warn("[oauth] Using loopback redirect URI in this environment", {
      isPackaged,
      isCustomSchemeRegistered,
    });
    redirectUriCandidate = env.loopbackRedirectUri;
  }
  const redirectUriParseResult = oauthRedirectUriSchema.safeParse(redirectUriCandidate);
  if (!redirectUriParseResult.success) {
    throw new Error("Bluesky OAuth redirect URI is invalid");
  }
  const resolvedRedirectUri = redirectUriParseResult.data;
  const resolvedScope = scope ?? env.scope;

  if (!resolvedClientId) {
    throw new Error("Bluesky OAuth clientId is not configured");
  }

  if (!resolvedRedirectUri) {
    throw new Error("Bluesky OAuth redirect URI is not configured");
  }

  const client = await getBlueskyOAuthClient(resolvedClientId);

  const state = crypto.randomUUID();
  const abortController = new AbortController();

  const authorizeUrl = await client.authorize(handle, {
    state,
    redirect_uri: resolvedRedirectUri,
    scope: resolvedScope,
  });

  await shell.openExternal(authorizeUrl.toString());

  const params = await waitForOAuthCallback(resolvedRedirectUri, abortController.signal);

  const { session, state: returnedState } = await client.callback(params, {
    redirect_uri: resolvedRedirectUri,
  });

  if (returnedState && returnedState !== state) {
    throw new Error("State mismatch detected during Bluesky OAuth callback");
  }

  const tokenInfo = await session.getTokenInfo();

  const agent = createBlueskyAgent(session);
  const profile = await agent.getProfile({ actor: session.did });
  const profileData = profile.data as AppBskyActorGetProfile.OutputSchema;

  const scopeValueRaw = (tokenInfo.scope ?? resolvedScope) || "";
  const scopeValue = Array.isArray(scopeValueRaw) ? scopeValueRaw.join(" ") : scopeValueRaw;

  const resolvedPdsOrigin = normalizeInstanceUrl(tokenInfo.aud) ?? fallbackInstanceUrl ?? DEFAULT_BSKY_INSTANCE_URL;

  return {
    name: profileData.handle,
    avatarUrl: profileData.avatar ?? "",
    instanceUrl: resolvedPdsOrigin,
    instanceType: "bluesky",
    token: "",
    blueskySession: {
      did: session.did,
      handle: profileData.handle,
      pdsUrl: String(tokenInfo.aud),
      authorizationServer: String(tokenInfo.iss),
      scope: scopeValue,
      tokenType: "DPoP",
      expiresAt: tokenInfo.expiresAt?.toISOString(),
      active: true,
    },
  };
};
