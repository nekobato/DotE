import { BlueskyChannelName } from "@shared/types/store";

export const blueskyChannelsMap: Record<BlueskyChannelName, string> = {
  "bluesky:homeTimeline": "ホーム",
};

export const blueskyChannels: BlueskyChannelName[] = Object.keys(blueskyChannelsMap) as BlueskyChannelName[];
