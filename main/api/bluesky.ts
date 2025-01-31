import { AtpAgent, type AtpSessionData } from "@atproto/api";

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

export const blueskyGetAuthorFeed = async ({
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

  const res = await agent.getAuthorFeed();

  return res.data;
};
