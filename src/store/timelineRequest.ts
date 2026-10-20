import type { useStore } from ".";
import type { useTimelineStore } from "./timeline";

/** Bind every response to the original timeline object, account, provider and query. */
export const captureTimelineRequest = (
  store: ReturnType<typeof useStore>,
  timeline: ReturnType<typeof useTimelineStore>,
) => {
  const target = timeline.current;
  const fingerprint = (): string | undefined => {
    if (!target || !store.timelines.includes(target)) return undefined;
    const user = store.users.find((candidate) => candidate.id === target.userId);
    const instance = store.instances.find((candidate) => candidate.id === user?.instanceId);
    if (!user || !instance) return undefined;
    return JSON.stringify({
      timelineId: target.id,
      channel: target.channel,
      options: target.options,
      userId: user.id,
      instanceId: user.instanceId,
      token: user.token,
      did: user.blueskySession?.did,
      pds: user.blueskySession?.pdsUrl,
      authorizationServer: user.blueskySession?.authorizationServer,
      active: user.blueskySession?.active,
      providerId: instance.id,
      providerType: instance.type,
      origin: instance.url,
    });
  };
  const identity = fingerprint();
  const isValid = () => identity !== undefined && fingerprint() === identity;
  return {
    isValid,
    isCurrent: () => timeline.current === target && isValid(),
  };
};
