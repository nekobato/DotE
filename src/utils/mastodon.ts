import { MastodonChannelName } from "@shared/types/store";

export const mastodonChannels: MastodonChannelName[] = [
  "mastodon:homeTimeline",
  "mastodon:localTimeline",
  "mastodon:publicTimeline",
  "mastodon:hashtag",
  "mastodon:list",
  "mastodon:notifications",
];

export const mastodonStreamChannels = [
  "homeTimeline",
  "localTimeline",
  "publicTimeline",
  "hashtag",
  "list",
  "notifications",
];
