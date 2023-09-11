import { Post } from "@/types/post";
import { MisskeyEntities } from "@/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { parseMisskeyNote, parseMisskeyNotes } from "@/utils/misskey";
import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";
import { TimelineSetting, methodOfChannel, useStore } from ".";

export const useTimelineStore = defineStore("timeline", () => {
  const store = useStore();
  const currentIndex = useStorage("timeline-current-index", 0);
  const current = computed(() => store.$state.timelines[currentIndex.value]);
  const timelines = computed(() => store.$state.timelines);

  const setCurrentIndex = (index: number) => {
    currentIndex.value = index;
  };

  const currentUser = computed(() => {
    return store.users.find((user) => user.id === current.value?.userId);
  });

  const currentInstance = computed(() => {
    return store.instances.find((instance) => instance.id === currentUser.value?.instanceId);
  });

  const fetchPosts = async () => {
    if (current.value && currentUser.value && currentInstance.value) {
      store.timelines[currentIndex.value].posts = [];
      const data = await ipcInvoke("api", {
        method: methodOfChannel[current.value.channel],
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        limit: 40,
      }).catch(() => {
        store.$state.errors.push({
          message: `${currentInstance.value?.name}の詳細データを取得できませんでした`,
        });
      });
      console.log(data);
      // misskeyなら という条件分岐が必要
      store.timelines[currentIndex.value].posts = parseMisskeyNotes(
        data,
        currentInstance.value.misskey?.emojis as MisskeyEntities.CustomEmoji[],
      );
    } else {
      throw new Error("user not found");
    }
  };

  const updateTimeline = async (timeline: TimelineSetting) => {
    await ipcInvoke("db:set-timeline", {
      id: timeline.id,
      userId: timeline.userId,
      channel: timeline.channel,
      options: JSON.stringify(timeline.options),
    });
    await store.initTimelines();
  };

  const createTimeline = async (timeline: Omit<TimelineSetting, "id">) => {
    await ipcInvoke("db:set-timeline", {
      userId: timeline.userId,
      channel: timeline.channel,
      options: JSON.stringify(timeline.options),
    });
    await store.initTimelines();
  };

  const addPost = (post: Post) => {
    store.timelines[currentIndex.value].posts.unshift(post);
  };

  const createReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    if (currentUser.value) {
      await ipcInvoke("api", {
        method: "misskey:createReaction",
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        noteId: postId,
        reaction: reaction,
      }).catch(() => {
        store.$state.errors.push({
          message: `${postId}へのリアクション失敗`,
        });
      });
      await updatePost({
        postId,
      });
    } else {
      throw new Error("user not found");
    }
  };

  const deleteReaction = async ({ postId, noUpdate }: { postId: string; noUpdate?: boolean }) => {
    if (currentUser.value) {
      await ipcInvoke("api", {
        method: "misskey:deleteReaction",
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        noteId: postId,
      }).catch(() => {
        store.$state.errors.push({
          message: `${postId}のリアクション削除失敗`,
        });
      });
      if (noUpdate) return;
      await updatePost({
        postId,
      });
    } else {
      throw new Error("user not found");
    }
  };

  const updatePost = async ({ postId }: { postId: string }) => {
    if (currentUser.value) {
      const res = await ipcInvoke("api", {
        method: "misskey:getNote",
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        noteId: postId,
      }).catch(() => {
        store.$state.errors.push({
          message: `${postId}の取得失敗`,
        });
      });
      const postIndex = current.value?.posts.findIndex((p) => p.id === postId);
      if (current.value && postIndex !== undefined && postIndex !== -1 && currentInstance.value?.misskey?.emojis) {
        store.timelines[currentIndex.value].posts[postIndex] = parseMisskeyNote(
          res,
          currentInstance.value?.misskey?.emojis,
        );
      }
    } else {
      throw new Error("user not found");
    }
  };

  return {
    timelines,
    currentIndex,
    current,
    setCurrentIndex,
    currentUser,
    currentInstance,
    fetchPosts,
    updateTimeline,
    createTimeline,
    addPost,
    createReaction,
    deleteReaction,
    updatePost,
  };
});