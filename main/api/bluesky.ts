import { AtpAgent, type AtpSessionData } from "@atproto/api";
import { getUserAll, upsertUser } from "../db";

export const blueskyLogin = async ({
  instanceUrl,
  identifier,
  password,
}: {
  instanceUrl: string;
  identifier: string;
  password: string;
}) => {
  const agent = new AtpAgent({
    service: instanceUrl,
  });

  const res = await agent.login({
    identifier,
    password,
  });

  return res.data;
};

export const blueskyGetProfile = async ({ instanceUrl, session }: { instanceUrl: string; session: AtpSessionData }) => {
  const agent = new AtpAgent({
    service: instanceUrl,
  });

  await agent.resumeSession(session);

  const res = await agent.getProfile({
    actor: session.did,
  });

  return res.data;
};

export const blueskyGetTimeline = async ({
  instanceUrl,
  session,
  untilId,
  limit = 30,
}: {
  instanceUrl: string;
  session: AtpSessionData;
  untilId?: string;
  limit?: number;
}) => {
  const agent = new AtpAgent({
    service: instanceUrl,
    session,
  });

  if (!validateJwtExp(session.accessJwt)) {
    const { accessJwt, refreshJwt } = await refreshSession(instanceUrl, session.refreshJwt);
    if (accessJwt && refreshJwt) {
      agent.sessionManager.session = { ...session, accessJwt, refreshJwt };
      const user = getUserAll().find((user) => user.blueskySession?.did === session.did);
      if (user) {
        user.blueskySession = { ...session, accessJwt, refreshJwt };
        upsertUser(user);
      }
    } else {
      throw new Error("Failed to refresh session.");
    }
  }

  await agent.resumeSession(session);

  const res = await agent.getTimeline();
  agent.getTimeline({
    cursor: untilId,
    limit,
  });
  return res.data;
};

async function refreshSession(
  instanceUrl: string,
  refreshJwt: string,
): Promise<{
  accessJwt: string | null;
  refreshJwt: string | null;
  message: string | null;
}> {
  const url = `${instanceUrl}/xrpc/com.atproto.server.refreshSession`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshJwt}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const data: AtpSessionData = await response.json();

    return {
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
      message: null,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "不明なエラー [refreshSession]";
    console.error(error);
    return {
      accessJwt: null,
      refreshJwt: null,
      message: error,
    };
  }
}

function validateJwtExp(jwt: string): boolean {
  // 1h
  const expMarginMinute = 60;
  try {
    const decodedToken = JSON.parse(atob(jwt.split(".")[1]));
    const expirationTime = decodedToken.exp * 1000;
    const currentTime = Date.now();

    return expirationTime - currentTime > expMarginMinute * 60 * 1000;
  } catch (e) {
    const error = e instanceof Error ? e.message : "不明なエラー [validateJwtExp]";
    console.error(error);
    return false;
  }
}

export async function blueskyLike({
  instanceUrl,
  session,
  uri,
  cid,
}: {
  instanceUrl: string;
  session: AtpSessionData;
  uri: string;
  cid: string;
}) {
  const agent = new AtpAgent({
    service: instanceUrl,
    session,
  });

  await agent.resumeSession(session);

  const res = await agent.like(uri, cid);

  return res;
}

export async function blueskyDeleteLike({
  instanceUrl,
  session,
  uri,
}: {
  instanceUrl: string;
  session: AtpSessionData;
  uri: string;
}) {
  const agent = new AtpAgent({
    service: instanceUrl,
    session,
  });

  await agent.resumeSession(session);

  await agent.deleteLike(uri);

  return;
}
