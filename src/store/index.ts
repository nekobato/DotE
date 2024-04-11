import type { MisskeyChannel, MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import type { InstanceStore, Settings, Timeline, User } from "@shared/types/store";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useInstanceStore } from "./instance";

export const methodOfChannel = {
  "misskey:homeTimeline": "misskey:getTimelineHome",
  "misskey:localTimeline": "misskey:getTimelineLocal",
  "misskey:socialTimeline": "misskey:getTimelineSocial",
  "misskey:globalTimeline": "misskey:getTimelineGlobal",
  "misskey:userList": "misskey:getTimelineList",
  "misskey:antenna": "misskey:getTimelineAntenna",
  "misskey:channel": "misskey:getTimelineChannel",
  "misskey:hashtag": "misskey:getTimelineHashtag",
  "misskey:search": "misskey:getTimelineSearch",
};

export type TimelineStore = Timeline & {
  posts: MisskeyNote[];
  channels: MisskeyChannel[];
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
              meta: null as MisskeyEntities.MetaResponse | null,
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
      const instanceStore = useInstanceStore();
      return Promise.all(
        this.$state.instances.map(async (instance) => {
          if (instance.type === "misskey") {
            const result = await instanceStore.getMisskeyInstanceMeta(instance.url);
            if (result) {
              instance.misskey!.meta = result;
            } else {
              this.$state.errors.push({
                message: `${instance.name}の詳細データを取得できませんでした`,
              });
            }
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
          posts: [],
          channels: [],
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
