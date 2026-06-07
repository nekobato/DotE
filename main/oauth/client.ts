import {
  oauthClientIdDiscoverableSchema,
  requestLocalLock,
  TokenInvalidError,
  TokenRefreshError,
  TokenRevokedError,
  type Session,
} from "@atproto/oauth-client";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import log from "electron-log";
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

type ErrorSummary = {
  name: string;
  message?: string;
  sub?: unknown;
  status?: unknown;
  oauthError?: unknown;
  oauthErrorDescription?: unknown;
  cause?: ErrorSummary;
};

/**
 * Record 型として扱える値か判定いたします。
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * OAuth セッション削除原因を、秘密情報を含まない短いログ用オブジェクトに整えます。
 */
const summarizeOAuthError = (error: unknown, depth = 0): ErrorSummary => {
  if (!isRecord(error)) {
    return {
      name: typeof error,
      message: typeof error === "string" ? error : undefined,
    };
  }

  const summary: ErrorSummary = {
    name: error instanceof Error ? error.name || error.constructor.name : String(error.constructor?.name ?? "Object"),
  };

  if (error instanceof Error) {
    summary.message = error.message;
  }

  if ("sub" in error) {
    summary.sub = error.sub;
  }

  if ("status" in error) {
    summary.status = error.status;
  }

  if ("error" in error) {
    summary.oauthError = error.error;
  }

  if ("errorDescription" in error) {
    summary.oauthErrorDescription = error.errorDescription;
  }

  if (depth < 2 && "cause" in error && error.cause !== undefined) {
    summary.cause = summarizeOAuthError(error.cause, depth + 1);
  }

  return summary;
};

/**
 * セッション削除原因に応じたログレベルを選びます。
 */
const oauthDeletionLogLevel = (cause: unknown): "info" | "warn" => {
  return cause instanceof TokenRevokedError ? "info" : "warn";
};

/**
 * Bluesky OAuth セッションの更新・削除イベントを安全にログへ記録します。
 */
const logBlueskyOAuthSessionUpdated = (sub: string, session: Session): void => {
  const { authMethod, tokenSet } = session;
  const payload = {
    sub,
    authMethod: authMethod.method,
    keyId: "kid" in authMethod ? authMethod.kid : undefined,
    issuer: tokenSet.iss,
    audience: tokenSet.aud,
    scope: tokenSet.scope,
    expiresAt: tokenSet.expires_at,
    hasRefreshToken: Boolean(tokenSet.refresh_token),
  };

  log.info("[oauth][bluesky] session updated", payload);
  console.info("[oauth][bluesky] session updated", payload);
};

/**
 * Bluesky OAuth セッション削除イベントを安全にログへ記録します。
 */
const logBlueskyOAuthSessionDeleted = (sub: string, cause: unknown): void => {
  const payload = {
    sub,
    cause: summarizeOAuthError(cause),
    category:
      cause instanceof TokenRefreshError
        ? "refresh"
        : cause instanceof TokenInvalidError
          ? "invalid"
          : cause instanceof TokenRevokedError
            ? "revoked"
            : "unknown",
  };

  if (oauthDeletionLogLevel(cause) === "info") {
    log.info("[oauth][bluesky] session deleted", payload);
    console.info("[oauth][bluesky] session deleted", payload);
    return;
  }

  log.warn("[oauth][bluesky] session deleted", payload);
  console.warn("[oauth][bluesky] session deleted", payload);
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
      onUpdate: logBlueskyOAuthSessionUpdated,
      onDelete: logBlueskyOAuthSessionDeleted,
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
