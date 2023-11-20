import type { MisskeyNote } from "@/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { computed } from "vue";
import { methodOfChannel, useStore } from ".";
import type { Timeline } from "~/types/store";

export const useTimelineStore = defineStore("timeline", () => {
  const store = useStore();
  const current = computed(() => store.$state.timelines.find((timeline) => timeline.available));
  const currentIndex = computed(() => store.$state.timelines.findIndex((timeline) => timeline.available));
  const timelines = computed(() => store.$state.timelines);

  const currentUser = computed(() => {
    return store.users.find((user) => user.id === current?.value?.userId);
  });

  const currentInstance = computed(() => {
    return store.instances.find((instance) => instance.id === currentUser?.value?.instanceId);
  });

  const setPosts = (posts: MisskeyNote[]) => {
    if (store.timelines[currentIndex.value]) {
      store.timelines[currentIndex.value].posts = posts;
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
      console.info("Notes", data);
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

  const deleteTimelineByUserId = async (userId: string) => {
    store.$state.timelines.forEach(async (timeline) => {
      console.log(timeline.userId, userId);
      if (timeline.userId === userId) {
        await ipcInvoke("db:delete-timeline", {
          id: timeline.id,
        });
      }
    });
    // 更新してみる
    await store.initTimelines();
    // UserもTimelineも無いなら終わり
    if (store.$state.users.length === 0) {
      return;
    }
    if (store.$state.timelines.length === 0) {
      await createTimeline({
        userId: store.users[0].id,
        channel: "misskey:homeTimeline",
        options: {},
        available: true,
      });
      return;
    }

    if (!store.$state.timelines.some((timeline) => !timeline.available)) {
      await updateTimeline({
        ...store.$state.timelines[0],
        available: true,
      });
    }

    await store.initTimelines();
  };

  const addPost = (post: MisskeyNote) => {
    if (!store.timelines[currentIndex.value]?.posts) return;
    store.timelines[currentIndex.value].posts = [post, ...store.timelines[currentIndex.value].posts];
  };

  const addEmoji = async ({ postId, name }: { postId: string; name: string }) => {
    const post = store.timelines[currentIndex.value].posts.find((post) => post.id === postId);
    const reactions = post?.renote ? post.renote.reactions : post?.reactions;
    if (!reactions) return;
    if (Object.keys(reactions).includes(name)) {
      reactions[name] += 1;
    } else {
      reactions[name] = 1;
    }
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
    if (!store.timelines[currentIndex.value] || !currentUser.value) return;

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
    if (!postIndex) return;

    store.timelines[currentIndex.value].posts.splice(postIndex, 1, res);
  };

  const addReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    // TODO: reactionがremote serverだった場合
    const post = store.timelines[currentIndex.value].posts.find((post) => post.id === postId);
    if (!post) return;
    const reactions = post.renote ? post.renote.reactions : post.reactions;
    if (Object.keys(reactions).includes(reaction)) {
      reactions[reaction] += 1;
    } else {
      reactions[reaction] = 1;
    }
  };

  const getChannelsMyFavorites = () => {
    if (!currentUser.value) return;
    const myChannels = ipcInvoke("api", {
      method: "misskey:getChannelsMyFavorites",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
    }).catch(() => {
      store.$state.errors.push({
        message: "チャンネルの取得に失敗しました",
      });
    });
    return myChannels;
  };

  return {
    timelines,
    deleteTimelineByUserId,
    current,
    currentUser,
    currentInstance,
    fetchInitialPosts,
    updateTimeline,
    createTimeline,
    addPost,
    addEmoji,
    addReaction,
    createReaction,
    deleteReaction,
    updatePost,
    getChannelsMyFavorites,
  };
});
