import { defineStore } from "pinia";
import { DotEPost, methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { MastodonToot } from "@/types/mastodon";
import type { ApiInvokeResult } from "@shared/types/ipc";

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

  const reportApiError = (result: ApiInvokeResult<unknown>, message: string) => {
    if (result.ok) return;
    store.$state.errors.push({
      message,
    });
    console.error(message, result.error);
  };

  const unwrapApiResult = <T>(result: ApiInvokeResult<T>, message: string): T | undefined => {
    if (!result.ok) {
      reportApiError(result, message);
      return undefined;
    }
    return result.data;
  };

  const getList = async () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return [];
    const result = await ipcInvoke("api", {
      method: "mastodon:getList",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
    });
    const lists = unwrapApiResult(result, "リストの取得失敗");
    return lists ?? [];
  };

  const toggleFavourite = async ({ id, favourited }: { id: string; favourited: boolean }) => {
    const timeline = getTimelineStore();
    if (timeline.currentUser) {
      const result = await ipcInvoke("api", {
        method: favourited ? "mastodon:unFavourite" : "mastodon:favourite",
        instanceUrl: timeline.currentInstance?.url,
        token: timeline.currentUser.token,
        id: id,
      });
      if (!result.ok) {
        reportApiError(result, `${id}の${favourited ? "お気に入り解除" : "お気に入り"}失敗`);
        return;
      }
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

    const result = await ipcInvoke("api", {
      method: "mastodon:getStatus",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
      id: id,
    });
    const res = unwrapApiResult(result, `${id}の取得失敗`);
    if (!res) return;
    const postIndex = timeline.current?.posts.findIndex((p: DotEPost) => p.id === id);
    if (!postIndex) return;

    store.timelines[timeline.currentIndex].posts.splice(postIndex, 1, res);
  };

  const fetchPosts = async () => {
    const timeline = getTimelineStore();
    if (!timeline.current || !timeline.currentUser || !timeline.currentInstance) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const result = await ipcInvoke("api", {
      method: methodOfChannel[timeline.current.channel],
      instanceUrl: timeline.currentInstance.url,
      channelId: timeline.current.options?.channelId, // option
      listId: timeline.current.options?.listId, // option
      tag: timeline.current.options?.tag, // option
      token: timeline.currentUser.token,
      limit: 40,
    });

    const data = unwrapApiResult(result, `${timeline.currentInstance?.name}のタイムラインを取得できませんでした`);
    if (!data) return;

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
        const result = await ipcInvoke("api", {
          method: methodOfChannel[timeline.current.channel],
          instanceUrl: timeline.currentInstance.url,
          token: timeline.currentUser.token,
          channelId: timeline.current.options?.channelId, // option
          listId: timeline.current.options?.listId, // option
          tag: timeline.current.options?.tag, // option
          sinceId: store.timelines[timeline.currentIndex]?.posts[0]?.id,
          limit: 40,
        });
        const data = unwrapApiResult(
          result,
          `${timeline.currentInstance?.name}の追加タイムラインを取得できませんでした`,
        );
        if (!Array.isArray(data) || data.length === 0) return;
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
