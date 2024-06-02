import { MisskeyEntities } from "misskey-js";

export type MisskeyChannelName =
  | "misskey:homeTimeline"
  | "misskey:localTimeline"
  | "misskey:socialTimeline"
  | "misskey:globalTimeline"
  | "misskey:userList"
  | "misskey:hashtag"
  | "misskey:antenna"
  | "misskey:channel"
  | "misskey:search"
  | "misskey:notifications";

export type MastodonChannelName =
  | "mastodon:homeTimeline"
  | "mastodon:localTimeline"
  | "mastodon:publicTimeline"
  | "mastodon:hashtag"
  | "mastodon:list"
  | "mastodon:notifications";

export type ChannelName = MisskeyChannelName | MastodonChannelName;

export type Timeline = {
  id: string; // uuid
  userId: string;
  channel: ChannelName;
  options: {
    query?: string;
    channelId?: string;
    listId?: string;
    antennaId?: string;
    tag?: string;
  };
  updateInterval: number;
  available: boolean;
};

type InsranceBase = {
  id: string; // uuid
  name: string;
  url: string;
  iconUrl: string;
};

export type InstanceMisskey = InsranceBase & {
  type: "misskey";
};

export type InstanceMisskeyStore = InstanceMisskey & {
  misskey: {
    meta: MisskeyEntities.DetailedInstanceMetadata | null;
    emojis: MisskeyEntities.CustomEmoji[];
  };
};

export type InstanceMastodon = InsranceBase & {
  type: "mastodon";
  mastodon: {
    clientName: string;
    meta: MastodonMeta;
  };
};

export type Instance = InstanceMisskey | InstanceMastodon;
export type InstanceStore = InstanceMisskeyStore | InstanceMastodon;

export type User = {
  id: string; // uuid
  instanceId: string; // uuid
  name: string;
  token: string;
  avatarUrl: string;
};

export type Settings = {
  opacity: number;
  mode: "show" | "haze" | "hide" | "settings" | "tutorial";
  windowSize: {
    width: number;
    height: number;
  };
  maxPostCount: number;
  postStyle: "all" | "line-1" | "line-2" | "line-3";
  shortcuts: {
    toggleTimeline: string;
  };
  misskey: {
    hideCw: boolean;
    showReactions: boolean;
  };
};
