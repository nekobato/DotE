import { Post } from "@/types/Post";
import { ipcInvoke } from "@/utils/ipc";
import { User } from "@prisma/client";
import { defineStore } from "pinia";
import { useUsersStore } from "./users";
import { Instance, useInstanceStore } from "./instance";
import { Emoji } from "@/types/misskey";
import { parseMisskeyNote, parseMisskeyNotes } from "@/utils/misskey";

export type ChannelName =
  | "misskey:homeTimeline"
  | "misskey:localTimeline"
  | "misskey:socialTimeline"
  | "misskey:globalTimeline"
  | "misskey:listTimeline"
  | "misskey:antennaTimeline"
  | "misskey:channelTimeline";

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

type TimelineState = {
  timelines: Timeline[];
  currentIndex: number;
};

export const methodOfChannel = {
  "misskey:homeTimeline": "misskey:getTimelineHome",
  "misskey:localTimeline": "misskey:getTimelineLocal",
  "misskey:socialTimeline": "misskey:getTimelineSocial",
  "misskey:globalTimeline": "misskey:getTimelineGlobal",
  "misskey:listTimeline": "misskey:getTimelineList",
  "misskey:antennaTimeline": "misskey:getTimelineAntenna",
  "misskey:channelTimeline": "misskey:getTimelineChannel",
};

export const useTimelineStore = defineStore("timeline", {
  state: (): TimelineState => ({
    timelines: [],
    currentIndex: 0,
  }),
  getters: {
    isExist(state): boolean {
      return state.timelines.length > 0;
    },
    current(state): Timeline {
      return state.timelines[state.currentIndex];
    },
    currentPosts(state): Post[] {
      return state.timelines.length ? state.timelines[state.currentIndex].posts : [];
    },
    currentUser(state): User | undefined {
      const usersStore = useUsersStore();
      return usersStore.$state?.find((u) => u.id === state.timelines[state.currentIndex]?.userId);
    },
    currentInstance(state): Instance | undefined {
      const instanceStore = useInstanceStore();
      return instanceStore.$state.find((i) => i.instanceUrl === this.currentUser?.instanceUrl);
    },
  },
  actions: {
    async init() {
      const result = await ipcInvoke("db:get-timeline-all");
      this.$state.timelines = result?.map((t) => {
        return { ...t, options: JSON.parse(t.options), posts: [], misskey: { emojis: [] } };
      });
    },
    async setTimeline(timeline: TimelineSetting) {
      const index = this.$state.timelines.findIndex((t) => t.id === timeline.id);
      if (index === -1) return;
      this.$state.timelines[index] = { ...timeline, posts: [] };
      await ipcInvoke("db:set-timeline", {
        id: timeline.id,
        userId: timeline.userId,
        channel: timeline.channel,
        options: JSON.stringify(timeline.options),
      });
    },
    async addTimeline(timeline: Omit<TimelineSetting, "id">) {
      await ipcInvoke("db:set-timeline", {
        userId: timeline.userId,
        channel: timeline.channel,
        options: JSON.stringify(timeline.options),
      });
      await this.init();
    },
    async fetchPosts() {
      if (this.currentUser && this.current && this.currentInstance) {
        const data = await ipcInvoke("api", {
          method: methodOfChannel[this.current?.channel] || "misskey:getTimelineHome",
          instanceUrl: this.currentUser.instanceUrl,
          token: this.currentUser.token,
          limit: 40,
        });
        this.$state.timelines[this.$state.currentIndex].posts = parseMisskeyNotes(
          data,
          this.currentInstance.misskey.emojis,
        );
      } else {
        throw new Error("user not found");
      }
    },
    async addPost(post: Post) {
      this.$state.timelines[this.$state.currentIndex].posts.unshift(post);
    },
    async createReaction({ postId, reaction }: { postId: string; reaction: string }) {
      if (this.currentUser) {
        await ipcInvoke("api", {
          method: "misskey:createReaction",
          instanceUrl: this.currentUser.instanceUrl,
          token: this.currentUser.token,
          noteId: postId,
          reaction: reaction,
        });
        await this.updatePost({
          postId,
        });
      } else {
        throw new Error("user not found");
      }
    },
    async deleteReaction({ postId, noUpdate }: { postId: string; noUpdate?: boolean }) {
      if (this.currentUser) {
        await ipcInvoke("api", {
          method: "misskey:deleteReaction",
          instanceUrl: this.currentUser.instanceUrl,
          token: this.currentUser.token,
          noteId: postId,
        });
        if (noUpdate) return;
        await this.updatePost({
          postId,
        });
      } else {
        throw new Error("user not found");
      }
    },
    async updatePost({ postId }: { postId: string }) {
      if (this.currentUser) {
        const res = await ipcInvoke("api", {
          method: "misskey:getNote",
          instanceUrl: this.currentUser.instanceUrl,
          token: this.currentUser.token,
          noteId: postId,
        });
        const postIndex = this.current?.posts.findIndex((p) => p.id === postId);
        if (this.current && postIndex !== undefined && postIndex !== -1 && this.currentInstance?.misskey.emojis) {
          this.$state.timelines[this.$state.currentIndex].posts[postIndex] = parseMisskeyNote(
            res,
            this.currentInstance?.misskey.emojis,
          );
        }
      } else {
        throw new Error("user not found");
      }
    },
  },
});
