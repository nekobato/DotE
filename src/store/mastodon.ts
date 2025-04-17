import { defineStore } from "pinia";
import { DotEPost, methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { MastodonToot } from "@/types/mastodon";

export const useMastodonStore = defineStore("mastodon", () => {
  const store = useStore();
  let timelineStore: ReturnType<typeof useTimelineStore>;

  // 初期化時に循環参照を避けるため、遅延初期化
  const getTimelineStore = () => {
    if (!timelineStore) {
      timelineStore = useTimelineStore();
    }
    return timelineStore;
  };

  const getList = async () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return;
    const res = await ipcInvoke("api", {
      method: "mastodon:getList",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
    }).catch(() => {
      store.$state.errors.push({
        message: `リストの取得失敗`,
      });
    });
    return res;
  };

  const toggleFavourite = async ({ id, favourited }: { id: string; favourited: boolean }) => {
    const timeline = getTimelineStore();
    if (timeline.currentUser) {
      await ipcInvoke("api", {
        method: favourited ? "mastodon:unFavourite" : "mastodon:favourite",
        instanceUrl: timeline.currentInstance?.url,
        token: timeline.currentUser.token,
        id: id,
      }).catch(() => {
        return store.$state.errors.push({
          message: `${id}の${favourited ? "お気に入り解除" : "お気に入り"}失敗`,
        });
      });
      const toot = store.$state.timelines[timeline.currentIndex].posts.find(
        (post: DotEPost) => post.id === id,
      ) as MastodonToot;
      if (favourited) {
        toot.favourited = false;
        toot.favourites_count -= 1;
      } else {
        toot.favourited = true;
        toot.favourites_count += 1;
      }
    } else {
      throw new Error("user not found");
    }
  };

  const updatePost = async ({ id }: { id: string }) => {
    const timeline = getTimelineStore();
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser) return;

    const res = await ipcInvoke("api", {
      method: "mastodon:getStatus",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
      id: id,
    }).catch(() => {
      store.$state.errors.push({
        message: `${id}の取得失敗`,
      });
    });
    const postIndex = timeline.current?.posts.findIndex((p: DotEPost) => p.id === id);
    if (!postIndex) return;

    store.timelines[timeline.currentIndex].posts.splice(postIndex, 1, res);
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
      listId: timeline.current.options?.listId, // option
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

    if (timeline.current.channel === "mastodon:notifications") {
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
          listId: timeline.current.options?.listId, // option
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
    getList,
    toggleFavourite,
    updatePost,
    fetchPosts,
    fetchDiffPosts,
  };
});
