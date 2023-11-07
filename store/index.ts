import { MisskeyEntities, MisskeyNote } from "@/types/misskey";
import { ChannelName, Instance, Settings, Timeline, User } from "@/types/store";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";

export const methodOfChannel = {
  "misskey:homeTimeline": "misskey:getTimelineHome",
  "misskey:localTimeline": "misskey:getTimelineLocal",
  "misskey:socialTimeline": "misskey:getTimelineSocial",
  "misskey:globalTimeline": "misskey:getTimelineGlobal",
  "misskey:listTimeline": "misskey:getTimelineList",
  "misskey:antennaTimeline": "misskey:getTimelineAntenna",
  "misskey:channelTimeline": "misskey:getTimelineChannel",
};

export type TimelineStore = Timeline & {
  posts: MisskeyNote[];
};

export type InstanceStore = Instance & {
  misskey?: {
    emojis: MisskeyEntities.CustomEmoji[];
    meta: MisskeyEntities.DetailedInstanceMetadata | null;
  };
};

export type ErrorItem = {
  message: string;
};

// DBから取得した生データ全て
export const useStore = defineStore({
  id: "store",
  state: () => ({
    users: [] as User[],
    instances: [] as InstanceStore[],
    timelines: [] as TimelineStore[],
    settings: {
      opacity: 0,
      hazyMode: "show",
      windowSize: {
        width: 0,
        height: 0,
      },
      maxPostCount: 1000,
      postStyle: "all",
      shortcuts: {} as Settings["shortcuts"],
    } as Settings,
    errors: [] as ErrorItem[],
  }),
  actions: {
    async init() {
      await this.initUsers();
      await this.initInstances();
      await this.initMisskeyEmojis();
      await this.initMisskeyMeta();
      await this.initTimelines();
      await this.initSettings();
      console.info("store init", this.$state);
    },
    async initUsers() {
      this.$state.users = await ipcInvoke("db:get-users");
      console.info("users initted", this.$state.users);
    },
    async initInstances() {
      const instances = await ipcInvoke("db:get-instance-all");
      this.$state.instances = instances.map((instance) => {
        if (instance.type === "misskey") {
          return {
            ...instance,
            misskey: {
              meta: null as MisskeyEntities.DetailedInstanceMetadata | null,
              emojis: [],
            },
          };
        }
        return instance;
      });
      console.info("instances initted", this.$state.instances);
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
            console.info("emoji", result);
            instance.misskey!.emojis = result?.emojis || [];
          }
          return instance;
        }),
      );
    },
    async initMisskeyMeta() {
      return Promise.all(
        this.$state.instances.map(async (instance) => {
          if (instance.type === "misskey") {
            const result = await ipcInvoke("api", {
              method: "misskey:getMeta",
              instanceUrl: instance.url,
            }).catch(() => {
              this.$state.errors.push({
                message: `${instance.name}の詳細データを取得できませんでした`,
              });
            });
            console.info("meta", result);
            instance.misskey!.meta = result;
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
          options: timeline.options,
          posts: [],
        };
      });
      console.info("timelines initted", this.$state.timelines);
    },
    async initSettings() {
      this.$state.settings = await ipcInvoke("settings:all");
      console.info("settings initted", this.$state.settings);
    },
  },
});
