export type ChannelName =
  | "misskey:homeTimeline"
  | "misskey:localTimeline"
  | "misskey:socialTimeline"
  | "misskey:globalTimeline"
  | "misskey:listTimeline"
  | "misskey:antennaTimeline"
  | "misskey:channelTimeline";

export type Timeline = {
  id: string; // uuid
  userId: string;
  channel: ChannelName;
  options: {
    query?: string;
  };
  available: boolean;
};

export type Instance = {
  id: string; // uuid
  type: "misskey" | "mastodon";
  name: string;
  url: string;
  iconUrl: string;
};

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
  postStyle: "default" | "simple" | "oneline";
  shortcuts: {
    toggleTimeline: string;
  };
  shouldAppUpdate: boolean;
  misskey: {
    hideCw: boolean;
  };
};
