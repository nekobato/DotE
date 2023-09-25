import { MisskeyNote } from "@/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { computed } from "vue";
import { TimelineStore, methodOfChannel, useStore } from ".";
import { Timeline } from "~/types/store";

export const useTimelineStore = defineStore("timeline", () => {
  const store = useStore();
  const current = computed(() => store.$state.timelines.find((timeline) => timeline.available));
  const timelines = computed(() => store.$state.timelines);

  const currentUser = computed(() => {
    return store.users.find((user) => user.id === current?.value?.userId);
  });

  const currentInstance = computed(() => {
    return store.instances.find((instance) => instance.id === currentUser?.value?.instanceId);
  });

  const setPosts = (posts: MisskeyNote[]) => {
    const availableTimeline = store.timelines.find((timeline) => timeline.available);
    if (availableTimeline) {
      availableTimeline.posts = posts;
    }
  };

  const fetchInitialPosts = async () => {
    if (current.value && currentUser.value && currentInstance.value) {
      setPosts([]);
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
      console.log("Notes", data);
      // misskeyなら という条件分岐が必要
      setPosts(data);
    } else {
      throw new Error("user not found");
    }
  };

  const updateTimeline = async (timeline: Timeline) => {
    await ipcInvoke("db:set-timeline", {
      id: timeline.id,
      userId: timeline.userId,
      channel: timeline.channel,
      options: timeline.options,
      available: timeline.available,
    });
    await store.initTimelines();
  };

  const createTimeline = async (timeline: Omit<Timeline, "id">) => {
    await ipcInvoke("db:set-timeline", {
      userId: timeline.userId,
      channel: timeline.channel,
      options: timeline.options,
      available: timeline.available,
    });
    await store.initTimelines();
  };

  const addPost = (post: MisskeyNote) => {
    const availableTimeline = store.timelines.find((timeline) => timeline.available);
    if (!availableTimeline) return;
    availableTimeline.posts.unshift(post);
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
    const availableTimeline = store.timelines.find((timeline) => timeline.available);
    if (!availableTimeline) return;

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
        availableTimeline.posts[postIndex] = res;
      }
    } else {
      throw new Error("user not found");
    }
  };

  return {
    timelines,
    current,
    currentUser,
    currentInstance,
    fetchInitialPosts,
    updateTimeline,
    createTimeline,
    addPost,
    createReaction,
    deleteReaction,
    updatePost,
  };
});
