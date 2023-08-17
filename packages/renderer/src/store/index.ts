import { ipcInvoke } from "@/utils/ipc";
import { Instance, User } from "@prisma/client";
import { Post } from "@/types/Post";
import { defineStore } from "pinia";

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
  id: number;
  userId: number;
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

// DBから取得した生データ全て
export const useStore = defineStore({
  id: "store",
  state: () => ({
    users: [] as User[],
    instances: [] as Instance[],
    timelines: [] as Timeline[],
    settings: {
      opacity: 50 as number,
      hazyMode: "show" as "show" | "haze" | "hide",
    },
  }),
  getters: {
    users: (state) => state.users,
    instances: (state) => state.instances,
    timelines: (state) => state.timelines,
    settings: (state) => state.settings,
  },
  actions: {
    async init() {
      await this.initUsers();
      await this.initInstances();
      await this.initTimelines();
      await this.initSettings();
    },
    async initUsers() {
      this.$state.users = await ipcInvoke("db:get-users");
    },
    async initInstances() {
      this.$state.instances = await ipcInvoke("db:get-instance-all");
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
    },
    async initSettings() {
      this.$state.settings = await ipcInvoke("settings:all");
    },
  },
});
