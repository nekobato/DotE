import { Post } from "@/types/Post";
import { ipcInvoke } from "@/utils/ipc";
import { User } from "@prisma/client";
import { defineStore } from "pinia";
import { useUsersStore } from "./users";
import { Instance, useInstanceStore } from "./instance";
import { Emoji } from "@/types/misskey";
import { parseMisskeyNote, parseMisskeyNotes } from "@/utils/misskey";
import { Timeline, TimelineSetting, methodOfChannel, useStore } from ".";

type State = {
  currentIndex: number;
};

export const useTimelineStore = defineStore("timeline", {
  state: (): State => ({
    currentIndex: 0,
  }),
  getters: {
    timelines() {
      const store = useStore();
      return store.$state.timelines;
    },
    isExist(state): boolean {
      return this.timelines.length > 0;
    },
    current(state): Timeline {
      return this.timelines[state.currentIndex];
    },
    currentPosts(state): Post[] {
      return this.timelines.length ? this.timelines[state.currentIndex].posts : [];
    },
    currentUser(state): User | undefined {
      const usersStore = useUsersStore();
      return usersStore.$state?.find((u) => u.id === this.timelines[state.currentIndex]?.userId);
    },
    currentInstance(state): Instance | undefined {
      const instanceStore = useInstanceStore();
      return instanceStore.$state.find((i) => i.instanceUrl === this.currentUser?.instanceUrl);
    },
  },
  actions: {
    async current
    async setTimeline(timeline: TimelineSetting) {
      const index = this.timelines.findIndex((t) => t.id === timeline.id);
      if (index === -1) return;
      this.timelines[index] = { ...timeline, posts: [] };
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
        this.timelines[this.$state.currentIndex].posts = parseMisskeyNotes(data, this.currentInstance.misskey.emojis);
      } else {
        throw new Error("user not found");
      }
    },
    async addPost(post: Post) {
      this.timelines[this.$state.currentIndex].posts.unshift(post);
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
          this.timelines[this.$state.currentIndex].posts[postIndex] = parseMisskeyNote(
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
