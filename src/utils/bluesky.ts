import { BlueskyChannelName, MisskeyChannelName } from "@shared/types/store";

export const blueskyChannelsMap: Record<BlueskyChannelName, string> = {
  "bluesky:homeTimeline": "ホーム",
};

export const blueskyChannels: MisskeyChannelName[] = Object.keys(blueskyChannelsMap) as MisskeyChannelName[];
