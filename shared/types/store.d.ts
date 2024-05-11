import { MisskeyEntities } from "misskey-js";

export type InstanceStore = Instance & {
  misskey?: {
    emojis: MisskeyEntities.CustomEmoji[];
    meta: MisskeyEntities.DetailedInstanceMetadata | null;
  };
  mastodon?: {
    meta: any; // TODO: Need Entity type
  };
};

export type ChannelName =
  | "misskey:homeTimeline"
  | "misskey:localTimeline"
  | "misskey:socialTimeline"
  | "misskey:globalTimeline"
  | "misskey:userList"
  | "misskey:hashtag"
  | "misskey:antenna"
  | "misskey:channel"
  | "misskey:search"
  | "mastodon:homeTimeline"
  | "mastodon:localTimeline"
  | "mastodon:publicTimeline"
  | "mastodon:hashtag"
  | "mastodon:list"
  | "mastodon:notifications";

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

export type Instance = {
  id: string; // uuid
  type: "mastodon" | "misskey" | "bluesky" | "threads";
  name: string;
  url: string;
  iconUrl: string;
  mastodon?: {
    clientName: string;
  };
};

type InsranceBase = {
  id: string; // uuid
  name: string;
  url: string;
  iconUrl: string;
};

type InstanceMisskey = InsranceBase;

type InstanceMastodon = InsranceBase & {
  type: "mastodon";
  mastodon: {
    clientName: string;
  };
};

type Instance = InstanceMisskey | InstanceMastodon;

export type User = {
  id: string; // uuid
  instanceId: string; // uuid
  name: string;
  token: string;
  avatarUrl: string;
};

export type Settings = {
  opacity: number;
  hazyMode: "show" | "haze" | "hide" | "settings" | "tutorial";
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
