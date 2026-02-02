import { MastodonNotification, MastodonToot } from "@/types/mastodon";
import { ipcInvoke } from "@/utils/ipc";
import type { MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import type { InstanceStore, Settings, Timeline, User } from "@shared/types/store";
import { defineStore } from "pinia";
import { useInstanceStore } from "./instance";
import { BlueskyPost } from "@/types/bluesky";

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
  "bluesky:homeTimeline": "bluesky:getTimeline",
};

export type DotEPost = MisskeyNote | MastodonToot | BlueskyPost;

export type TimelineStore = Timeline & {
  posts: DotEPost[];
  notifications: MisskeyEntities.Notification[] | MastodonNotification[];
  bluesky?: {
    cursor?: string;
  };
};

export type ErrorItem = {
  message: string;
};

type RootState = {
  users: User[];
  instances: InstanceStore[];
  timelines: TimelineStore[];
  settings: Settings;
  errors: ErrorItem[];
};

const initialSettings: Settings = {
  opacity: 50,
  mode: "show",
  theme: "dark",
  font: {
    family: "",
  },
  windowSize: {
    width: 475,
    height: 600,
  },
  maxPostCount: 500,
  postStyle: "all",
  shortcuts: {
    toggleTimeline: "Ctrl+Alt+x",
  },
  text2Speech: {
    enabled: false,
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: "Kyoko",
    hookUrl: "",
  },
  misskey: {
    hideCw: false,
    showReactions: true,
  },
};

// DBから取得した生データ全て
export const useStore = defineStore("store", {
  state: (): RootState => ({
    users: [],
    instances: [],
    timelines: [],
    settings: { ...initialSettings },
    errors: [],
  }),
  actions: {
    async init() {
      console.info("[store] init:start");
      try {
        console.info("[store] init -> initUsers");
        await this.initUsers();
        console.info("[store] init -> initInstances");
        await this.initInstances();
        console.info("[store] init -> initMisskeyEmojis");
        await this.initMisskeyEmojis();
        console.info("[store] init -> initInstanceMeta");
        await this.initInstanceMeta();
        console.info("[store] init -> initTimelines");
        await this.initTimelines();
        console.info("[store] init -> initSettings");
        await this.initSettings();
        console.info("[store] init:done", this.$state);
      } catch (error) {
        console.error("[store] init:failed", error);
        throw error;
      }
    },
    async initUsers() {
      console.info("[store] initUsers:start");
      try {
        this.$state.users = await ipcInvoke("db:get-users");
        console.info("[store] initUsers:done", this.$state.users);
      } catch (error) {
        console.error("[store] initUsers:failed", error);
        throw error;
      }
    },
    async initInstances() {
      console.info("[store] initInstances:start");
      try {
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
        console.info("[store] initInstances:done", this.$state.instances);
      } catch (error) {
        console.error("[store] initInstances:failed", error);
        throw error;
      }
    },
    async initMisskeyEmojis() {
      console.info("[store] initMisskeyEmojis:start");
      try {
        await Promise.all(
          this.$state.instances.map(async (instance) => {
            if (instance.type === "misskey") {
              const startedAt = performance.now();
              console.info("[store] initMisskeyEmojis:invoke", { url: instance.url });
              const result = await ipcInvoke("api", {
                method: "misskey:getEmojis",
                instanceUrl: instance.url,
              });
              if (!result.ok) {
                this.$state.errors.push({
                  message: `${instance.name}のemojiがうまく取得できませんでした インターネット接続またはデータがおかしいです`,
                });
                console.error("[store] initMisskeyEmojis:failed", {
                  url: instance.url,
                  error: result.error,
                  durationMs: performance.now() - startedAt,
                });
              } else {
                console.info("[store] initMisskeyEmojis:done", {
                  url: instance.url,
                  emojiCount: result.data?.emojis?.length ?? 0,
                  durationMs: performance.now() - startedAt,
                });
                instance.misskey!.emojis = result.data?.emojis || [];
              }
            }
            return instance;
          }),
        );
        console.info("[store] initMisskeyEmojis:complete");
      } catch (error) {
        console.error("[store] initMisskeyEmojis:failed:throw", error);
        throw error;
      }
    },
    async initInstanceMeta() {
      console.info("[store] initInstanceMeta:start");
      const instanceStore = useInstanceStore();
      try {
        await Promise.all(
          this.$state.instances.map(async (instance) => {
            let metaResult;
            switch (instance.type) {
              case "misskey":
                console.debug("[store] initInstanceMeta:misskey", instance.url);
                metaResult = await instanceStore.getMisskeyInstanceMeta(instance.url);
                if (metaResult.ok) {
                  instance.misskey!.meta = metaResult.data;
                }
                break;
              case "mastodon":
                console.debug("[store] initInstanceMeta:mastodon", instance.url);
                metaResult = await instanceStore.getMastodonInstanceMeta(instance.url);
                if (metaResult.ok) {
                  instance.mastodon.meta = metaResult.data;
                }
                break;
              case "bluesky":
                console.debug("[store] initInstanceMeta:skip", instance.url);
                return;
            }

            if (!metaResult || !metaResult.ok) {
              this.$state.errors.push({
                message: `${instance.name}の詳細データを取得できませんでした`,
              });
              console.error("[store] initInstanceMeta:failed", {
                instance: instance.url,
                error: metaResult?.error,
              });
            } else {
              console.info("[store] initInstanceMeta:done", {
                instance: instance.url,
                type: instance.type,
              });
            }

            return instance;
          }),
        );
      } catch (error) {
        console.error("[store] initInstanceMeta:failed", error);
        throw error;
      }
    },
    async initTimelines() {
      console.info("[store] initTimelines:start");
      try {
        const timelines = await ipcInvoke("db:get-timeline-all");
        this.$state.timelines = timelines.map((timeline) => {
          return {
            ...timeline,
            posts: [],
            notifications: [],
          };
        });
        console.info("[store] initTimelines:done", this.$state.timelines);
      } catch (error) {
        console.error("[store] initTimelines:failed", error);
        throw error;
      }
    },
    async initSettings() {
      console.info("[store] initSettings:start");
      try {
        this.$state.settings = await ipcInvoke("settings:all");
        console.info("[store] initSettings:done", this.$state.settings);
      } catch (error) {
        console.error("[store] initSettings:failed", error);
        throw error;
      }
    },
  },
});
