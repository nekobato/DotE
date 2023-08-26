export type Timeline = {
  id: string; // uuid
  userId: string;
  channel: string;
  options: string;
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

export type Setting = {
  opacity: number;
  hazyMode: "show" | "haze" | "hide" | "settings" | "tutorial";
};
