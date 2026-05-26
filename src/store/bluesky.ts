import { defineStore } from "pinia";
import { methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import type { AppBskyFeedDefs, AppBskyNotificationListNotifications } from "@atproto/api";
import { ChannelName } from "@shared/types/store";
import { computed } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";
import type { BlueskyFeedPost } from "@/types/bluesky";
import {
  resolveBlueskyFeedItemId,
  resolveBlueskyNotificationId,
  uniqueBlueskyFeedItems,
  uniqueBlueskyNotifications,
} from "@/utils/bluesky";

export const useBlueskyStore = defineStore("bluesky", () => {
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

  const currentPosts = computed<BlueskyFeedPost[]>(() => {
    const timeline = getTimelineStore();
    return (store.timelines[timeline.currentIndex]?.posts as BlueskyFeedPost[]) || [];
  });

  const setPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    if (timeline.current) {
      store.$state.timelines[timeline.currentIndex].posts = uniqueBlueskyFeedItems(posts);
    }
  };

  const setNotifications = (notifications: AppBskyNotificationListNotifications.Notification[]) => {
    const timeline = getTimelineStore();
    if (timeline.current) {
      timeline.setNotifications(uniqueBlueskyNotifications(notifications));
    }
  };

  const pushPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    const filteredPosts = posts.filter((post) => {
      const currentPosts = store.$state.timelines[timeline.currentIndex].posts as BlueskyFeedPost[];
      const nextId = resolveBlueskyFeedItemId(post);
      return !currentPosts.some((currentPost) => resolveBlueskyFeedItemId(currentPost) === nextId);
    });
    if (timeline.current) {
      store.$state.timelines[timeline.currentIndex].posts.push(...uniqueBlueskyFeedItems(filteredPosts));
    }
  };

  const unshiftPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    if (timeline.current) {
      store.$state.timelines[timeline.currentIndex].posts.unshift(...uniqueBlueskyFeedItems(posts));
    }
  };

  const pushNotifications = (notifications: AppBskyNotificationListNotifications.Notification[]) => {
    const timeline = getTimelineStore();
    const currentNotifications = timeline.current?.notifications as
      | AppBskyNotificationListNotifications.Notification[]
      | undefined;
    if (!timeline.current || !currentNotifications) return;

    const existingIds = new Set(currentNotifications.map((notification) => resolveBlueskyNotificationId(notification)));
    const filteredNotifications = uniqueBlueskyNotifications(notifications).filter(
      (notification) => !existingIds.has(resolveBlueskyNotificationId(notification)),
    );
    timeline.addMoreNotifications(filteredNotifications);
  };

  const fetchPosts = async () => {
    const timeline = getTimelineStore();
    if (!timeline.current || !timeline.currentUser || !timeline.currentInstance) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    if (!timeline.currentUser.blueskySession) {
      throw new Error("Blueskyセッション情報が見つかりませんでした");
    }

    const result = await ipcInvoke("api", {
      method: methodOfChannel[timeline.current.channel],
      did: timeline.currentUser.blueskySession.did,
      limit: 40,
    });
    const data = unwrapApiResult(result, `${timeline.currentInstance?.name}のタイムラインを取得できませんでした`);
    if (!data) return;

    if (timeline.current.channel === "bluesky:notifications") {
      if (!("notifications" in data)) return;
      setNotifications(data.notifications);
      setCursor(data.cursor);
      return;
    }

    if (!("feed" in data)) return;
    setPosts(data.feed);
    setCursor(data.cursor);
  };

  const fetchOlderPosts = async (channel: ChannelName) => {
    const timeline = getTimelineStore();

    const result = await ipcInvoke("api", {
      method: methodOfChannel[channel],
      did: timeline.currentUser?.blueskySession?.did,
      limit: 20,
      cursor: timeline.current?.bluesky?.cursor,
    });
    const data = unwrapApiResult(result, `${timeline.currentInstance?.name}の古いタイムラインを取得できませんでした`);
    if (!data) return;

    if (channel === "bluesky:notifications") {
      if (!("notifications" in data)) return;
      pushNotifications(data.notifications);
      setCursor(data.cursor);
      return;
    }

    if (!("feed" in data)) return;
    pushPosts(data.feed);
    setCursor(data.cursor);
  };

  const setCursor = (cursor: string) => {
    const timeline = getTimelineStore();
    if (store.$state.timelines[timeline.currentIndex]) {
      store.$state.timelines[timeline.currentIndex].bluesky = {
        cursor,
      };
    }
  };

  const like = async ({ uri, cid }: { uri: string; cid: string }) => {
    const timeline = getTimelineStore();
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser?.blueskySession) return;

    const result = await ipcInvoke("api", {
      method: "bluesky:like",
      did: timeline.currentUser.blueskySession.did,
      uri,
      cid,
    });
    const res = unwrapApiResult(result, `${cid}のいいね失敗`);
    if (!res) return;

    const targetPost = currentPosts.value.find((p) => p.post.uri === uri);

    if (!targetPost || !targetPost.post.viewer || !targetPost.post.likeCount) return;

    targetPost.post.viewer.like = res.uri;
    targetPost.post.likeCount++;
  };

  const deleteLike = async ({ uri }: { uri: string }) => {
    const timeline = getTimelineStore();
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser?.blueskySession) return;

    const result = await ipcInvoke("api", {
      method: "bluesky:deleteLike",
      did: timeline.currentUser.blueskySession.did,
      uri: uri,
    });
    if (!result.ok) {
      reportApiError(result, `${uri}のいいね削除失敗`);
      return;
    }

    const targetPost = currentPosts.value.find((p) => p.post.viewer?.like === uri);

    if (!targetPost || !targetPost.post.viewer || !targetPost.post.likeCount) return;

    targetPost.post.viewer.like = undefined;
    targetPost.post.likeCount--;
  };

  return {
    fetchPosts,
    fetchOlderPosts,
    setCursor,
    setPosts,
    setNotifications,
    pushPosts,
    unshiftPosts,
    pushNotifications,
    like,
    deleteLike,
  };
});
