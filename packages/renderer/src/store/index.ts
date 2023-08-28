import { Post } from "@/types/Post";
import { MisskeyEntities } from "@/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { Instance, User } from "@@/types/Store";
import { gotoHazyRoute } from "@/utils/hazy";

export type ChannelName =
  | "misskey:homeTimeline"
  | "misskey:localTimeline"
  | "misskey:socialTimeline"
  | "misskey:globalTimeline"
  | "misskey:listTimeline"
  | "misskey:antennaTimeline"
  | "misskey:channelTimeline";

export const methodOfChannel = {
  "misskey:homeTimeline": "misskey:getTimelineHome",
  "misskey:localTimeline": "misskey:getTimelineLocal",
  "misskey:socialTimeline": "misskey:getTimelineSocial",
  "misskey:globalTimeline": "misskey:getTimelineGlobal",
  "misskey:listTimeline": "misskey:getTimelineList",
  "misskey:antennaTimeline": "misskey:getTimelineAntenna",
  "misskey:channelTimeline": "misskey:getTimelineChannel",
};

export type TimelineSetting = {
  id: string;
  userId: string;
  channel: ChannelName;
  options: {
    search?: string;
    antenna?: string;
    list?: string;
  };
};

export type Timeline = TimelineSetting & {
  posts: Post[];
};

export type InstanceStore = Instance & {
  misskey?: {
    emojis: MisskeyEntities.CustomEmoji[];
  };
};

export type ErrorItem = {
  message: string;
};

// DBから取得した生データ全て
export const useStore = defineStore({
  id: "store",
  state: () => ({
    hasInit: false,
    users: [] as User[],
    instances: [] as InstanceStore[],
    timelines: [] as Timeline[],
    settings: {
      opacity: undefined as number | undefined,
      hazyMode: "show" as "show" | "haze" | "hide" | "settings" | "tutorial",
      windowSize: {
        width: 0,
        height: 0,
      },
      maxPostCount: 1000,
    },
    errors: [] as ErrorItem[],
  }),
  actions: {
    async init() {
      await this.initUsers();
      await this.initInstances();
      await this.initMisskeyEmojis();
      await this.initTimelines();
      await this.initSettings();
      this.$state.hasInit = true;
      console.log("store init", this.$state);
      gotoHazyRoute(this.$state.settings.hazyMode);
    },
    async initUsers() {
      this.$state.users = await ipcInvoke("db:get-users");
    },
    async initInstances() {
      const instances = await ipcInvoke("db:get-instance-all");
      this.$state.instances = instances.map((instance) => {
        if (instance.type === "misskey") {
          return {
            ...instance,
            misskey: {
              emojis: [],
            },
          };
        }
        return instance;
      });
    },
    async initMisskeyEmojis() {
      return Promise.all(
        this.$state.instances.map(async (instance) => {
          if (instance.type === "misskey") {
            const result = await ipcInvoke("api", {
              method: "misskey:getEmojis",
              instanceUrl: instance.url,
            }).catch(() => {
              this.$state.errors.push({
                message: `${instance.name}のemojiがうまく取得できませんでした インターネット接続またはデータがおかしいです`,
              });
            });
            console.log(result);
            instance.misskey!.emojis = result?.emojis || [];
          }
          return instance;
        }),
      );
    },
    async initTimelines() {
      const timelines = await ipcInvoke("db:get-timeline-all");
      this.$state.timelines = timelines.map((timeline) => {
        return {
          ...timeline,
          channel: timeline.channel as ChannelName,
          options: JSON.parse(timeline.options),
          posts: [],
        };
      });
      console.log(this.$state.timelines);
    },
    async initSettings() {
      this.$state.settings = await ipcInvoke("settings:all");
    },
  },
});
