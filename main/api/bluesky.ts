import { AtpAgent, type AtpSessionData } from "@atproto/api";

const refreshToken = async (agent: AtpAgent) => {
  try {
    await agent.sessionManager.refreshSession();
  } catch (e) {
    console.log("Failed to refresh session. Logging in...");
    throw new Error("Failed to refresh session");
  }

  await agent.resumeSession(agent.session!);

  return agent.session;
};

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
}: {
  instanceUrl: string;
  session: AtpSessionData;
}) => {
  const agent = new AtpAgent({
    service: instanceUrl,
    session,
  });

  try {
    await agent.resumeSession(session);
  } catch (e) {
    console.log("Failed to resume session. Refreshing session...");
    agent.sessionManager.session = await refreshToken(agent);
  }

  const res = await agent.getTimeline();
  return res.data.feed;
};
