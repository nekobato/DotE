import { MastodonNotification, MastodonToot } from "@/types/mastodon";
import { ipcInvoke } from "@/utils/ipc";
import type { MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import type { InstanceStore, Settings, Timeline, User } from "@shared/types/store";
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
  "misskey:notifications": "misskey:getNotifications",
  "mastodon:homeTimeline": "mastodon:getTimelineHome",
  "mastodon:localTimeline": "mastodon:getTimelineLocal",
  "mastodon:publicTimeline": "mastodon:getTimelinePublic",
  "mastodon:hashtag": "mastodon:getTimelineHashtag",
  "mastodon:list": "mastodon:getTimelineList",
  "mastodon:notifications": "mastodon:getNotifications",
};

export type TimelineStore = Timeline & {
  posts: MisskeyNote[] | MastodonToot[];
  notifications: MisskeyEntities.Notification[] | MastodonNotification[];
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
      mode: "show",
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
      await this.initInstanceMeta();
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
              emojis: [],
              meta: null,
            },
          };
        } else {
          // mastodon
          return {
            ...instance,
            mastodon: {
              clientName: "",
              meta: null,
            },
          };
        }
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
    async initInstanceMeta() {
      const instanceStore = useInstanceStore();
      return Promise.all(
        this.$state.instances.map(async (instance) => {
          let metaResult;
          switch (instance.type) {
            case "misskey":
              metaResult = await instanceStore.getMisskeyInstanceMeta(instance.url);
              instance.misskey!.meta = metaResult;
              break;
            case "mastodon":
              metaResult = await instanceStore.getMastodonInstanceMeta(instance.url);
              instance.mastodon.meta = metaResult;
              break;
          }

          if (!metaResult) {
            this.$state.errors.push({
              message: `${instance.name}の詳細データを取得できませんでした`,
            });
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
          notifications: [],
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
