import { defineStore } from "pinia";
import { DotEPost, methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { MisskeyNote } from "@shared/types/misskey";

export const useMisskeyStore = defineStore("misskey", () => {
  const store = useStore();
  let timelineStore: ReturnType<typeof useTimelineStore>;

  // 初期化時に循環参照を避けるため、遅延初期化
  const getTimelineStore = () => {
    if (!timelineStore) {
      timelineStore = useTimelineStore();
    }
    return timelineStore;
  };

  const addEmoji = async ({ postId, name }: { postId: string; name: string }) => {
    const timeline = getTimelineStore();
    const post = store.timelines[timeline.currentIndex]?.posts.find(
      (post: DotEPost) => post.id === postId,
    ) as MisskeyNote;
    const reactions = post?.renote ? post.renote.reactions : post?.reactions;
    if (!reactions) return;
    if (Object.keys(reactions).includes(name)) {
      reactions[name] += 1;
    } else {
      reactions[name] = 1;
    }
  };

  const createMyReaction = async (postId: string, reaction: string) => {
    const timeline = getTimelineStore();

    if (timeline.currentUser) {
      // Update reaction on Local
      let post = (timelineStore.current?.posts as MisskeyNote[]).find((post) => post.id === postId) as MisskeyNote;

      const targetPost = post.renote || post;

      if (targetPost) {
        targetPost.myReaction = reaction;
        const reactionCount = targetPost.reactions[reaction] || 0;
        targetPost.reactions[reaction] = reactionCount + 1;
      }

      await ipcInvoke("api", {
        method: "misskey:createReaction",
        instanceUrl: timeline.currentInstance?.url,
        token: timeline.currentUser.token,
        noteId: targetPost.id,
        reaction: reaction,
      }).catch(() => {
        store.$state.errors.push({
          message: `${targetPost.id}へのリアクション失敗`,
        });
      });
    } else {
      throw new Error("user not found");
    }
  };

  const deleteMyReaction = async (postId: string) => {
    const timeline = getTimelineStore();

    if (timeline.currentUser) {
      let post = (timelineStore.current?.posts as MisskeyNote[]).find((post) => post.id === postId) as MisskeyNote;

      const targetPost = post.renote || post;

      if (targetPost && targetPost.myReaction) {
        const reaction = targetPost.myReaction;
        if (targetPost.reactions[reaction] === 1) {
          delete targetPost.reactions[reaction];
        } else {
          targetPost.reactions[reaction] -= 1;
        }
        targetPost.myReaction = undefined;
      }

      await ipcInvoke("api", {
        method: "misskey:deleteReaction",
        instanceUrl: timeline.currentInstance?.url,
        token: timeline.currentUser.token,
        noteId: targetPost.id,
      }).catch(() => {
        store.$state.errors.push({
          message: `${targetPost.id}のリアクション削除失敗`,
        });
      });
    } else {
      throw new Error("user not found");
    }
  };

  const updatePost = async ({ postId }: { postId: string }) => {
    const timeline = getTimelineStore();
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser) return;

    const res = await ipcInvoke("api", {
      method: "misskey:getNote",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
      noteId: postId,
    }).catch(() => {
      store.$state.errors.push({
        message: `${postId}の取得失敗`,
      });
    });
    const postIndex = timeline.current?.posts.findIndex((p: DotEPost) => p.id === postId);
    if (!postIndex) return;

    store.timelines[timeline.currentIndex].posts.splice(postIndex, 1, res);
  };

  const addReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    const timeline = getTimelineStore();
    // TODO: reactionがremote serverだった場合
    const post = store.timelines[timeline.currentIndex]?.posts.find((p: DotEPost) => p.id === postId) as MisskeyNote;
    if (!post) return;
    const reactions = post.renote ? post.renote.reactions : post.reactions;
    if (Object.keys(reactions).includes(reaction)) {
      reactions[reaction] += 1;
    } else {
      reactions[reaction] = 1;
    }
  };

  const removeReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    const timeline = getTimelineStore();
    const post = store.timelines[timeline.currentIndex]?.posts.find((p: DotEPost) => p.id === postId) as MisskeyNote;
    if (!post) return;
    const reactions = post.renote ? post.renote.reactions : post.reactions;
    if (reactions[reaction]) {
      if (reactions[reaction] === 1) {
        delete reactions[reaction];
      } else {
        reactions[reaction] -= 1;
      }
    }
  };

  const getFollowedChannels = () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return;
    const myChannels = ipcInvoke("api", {
      method: "misskey:getFollowedChannels",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
    }).catch(() => {
      store.$state.errors.push({
        message: "チャンネルの取得に失敗しました",
      });
      console.error("チャンネルの取得に失敗しました");
    });
    return myChannels;
  };

  const getMyAntennas = () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return;
    const myAntennas = ipcInvoke("api", {
      method: "misskey:getMyAntennas",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
    }).catch(() => {
      store.$state.errors.push({
        message: "アンテナの取得に失敗しました",
      });
      console.error("アンテナの取得に失敗しました");
    });
    return myAntennas;
  };

  const getUserLists = () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return;
    const userLists = ipcInvoke("api", {
      method: "misskey:getUserLists",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
      userId: timeline.currentUser.id,
    }).catch(() => {
      store.$state.errors.push({
        message: "リストの取得に失敗しました",
      });
      console.error("リストの取得に失敗しました");
    });
    return userLists;
  };

  const fetchPosts = async () => {
    const timeline = getTimelineStore();
    if (!timeline.current || !timeline.currentUser || !timeline.currentInstance) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const data = await ipcInvoke("api", {
      method: methodOfChannel[timeline.current.channel],
      instanceUrl: timeline.currentInstance.url,
      channelId: timeline.current.options?.channelId, // option
      antennaId: timeline.current.options?.antennaId, // option
      listId: timeline.current.options?.listId, // option
      query: timeline.current.options?.query, // option
      tag: timeline.current.options?.tag, // option
      token: timeline.currentUser.token,
      limit: 40,
    }).catch(() => {
      store.$state.errors.push({
        message: `${timeline.currentInstance?.name}のタイムラインを取得できませんでした`,
      });
    });

    if (data.error) {
      store.$state.errors.push({
        message: `${timeline.currentInstance?.name}のタイムラインを取得できませんでした (${data.error?.message})`,
      });
      return;
    }

    if (timeline.current.channel === "misskey:notifications") {
      timeline.setNotifications(data);
    } else {
      timeline.setPosts(data);
    }
  };

  const fetchDiffPosts = async () => {
    const timeline = getTimelineStore();
    if (store.timelines[timeline.currentIndex]?.posts?.length === 0) return;
    if (timeline.current && timeline.currentUser && timeline.currentInstance) {
      try {
        const data = await ipcInvoke("api", {
          method: methodOfChannel[timeline.current.channel],
          instanceUrl: timeline.currentInstance.url,
          token: timeline.currentUser.token,
          channelId: timeline.current.options?.channelId, // option
          antennaId: timeline.current.options?.antennaId, // option
          listId: timeline.current.options?.listId, // option
          query: timeline.current.options?.query, // option
          tag: timeline.current.options?.tag, // option
          sinceId: store.timelines[timeline.currentIndex]?.posts[0]?.id,
          limit: 40,
        });
        if (!data || data.length === 0) return;
        const filteredPosts = data.filter(
          (post: DotEPost) => !store.timelines[timeline.currentIndex]?.posts?.some((p: DotEPost) => p.id === post.id),
        );

        timeline.setPosts([...filteredPosts, ...store.timelines[timeline.currentIndex]?.posts]);
      } catch (e) {
        store.$state.errors.push({
          message: `${timeline.currentInstance?.name}の追加タイムラインを取得できませんでした`,
        });
      }
    } else {
      throw new Error("user not found");
    }
  };

  return {
    addEmoji,
    createMyReaction,
    deleteMyReaction,
    updatePost,
    addReaction,
    removeReaction,
    getFollowedChannels,
    getMyAntennas,
    getUserLists,
    fetchPosts,
    fetchDiffPosts,
  };
});
