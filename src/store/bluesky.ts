import { defineStore } from "pinia";
import { methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import type { AppBskyFeedDefs, AppBskyNotificationListNotifications } from "@atproto/api";
import type { ChannelName } from "@shared/types/store";
import { computed } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";
import type { BlueskyFeedPost } from "@/types/bluesky";
import {
  mergeBlueskyFeedItemsByDateDesc,
  resolveBlueskyFeedItemId,
  resolveBlueskyNotificationId,
  uniqueBlueskyFeedItems,
  uniqueBlueskyNotifications,
} from "@/utils/bluesky";
import { removePostAcrossTimelines } from "@/utils/removePostAcrossTimelines";

const LOCAL_BLUESKY_POST_TTL_MS = 5 * 60 * 1000;

type BlueskyTimelineTarget = {
  timelineId?: string;
  userId?: string;
};

export const useBlueskyStore = defineStore("bluesky", () => {
  const store = useStore();
  let timelineStore: ReturnType<typeof useTimelineStore>;
  const locallyInsertedPostIds = new Map<string, number>();

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

  const pruneLocallyInsertedPostIds = () => {
    const now = Date.now();
    locallyInsertedPostIds.forEach((addedAt, id) => {
      if (now - addedAt > LOCAL_BLUESKY_POST_TTL_MS) {
        locallyInsertedPostIds.delete(id);
      }
    });
  };

  const isFreshLocallyInsertedPost = (id: string) => {
    pruneLocallyInsertedPostIds();
    return locallyInsertedPostIds.has(id);
  };

  const findTargetHomeTimelineIndexes = ({ timelineId, userId }: BlueskyTimelineTarget) => {
    if (!timelineId && !userId) return [];

    const indexedTimelines = store.$state.timelines.map((timeline, index) => ({ timeline, index }));
    const targetById = indexedTimelines.filter(({ timeline }) => {
      return (
        timeline.channel === "bluesky:homeTimeline" &&
        timeline.id === timelineId &&
        (!userId || timeline.userId === userId)
      );
    });

    if (targetById.length > 0) {
      return targetById.map(({ index }) => index);
    }

    return indexedTimelines
      .filter(({ timeline }) => timeline.channel === "bluesky:homeTimeline" && (!userId || timeline.userId === userId))
      .map(({ index }) => index);
  };

  const mergePostsIntoTimeline = ({
    posts,
    timelineIndex,
    isLocalInsert,
  }: {
    posts: AppBskyFeedDefs.FeedViewPost[];
    timelineIndex: number;
    isLocalInsert: boolean;
  }) => {
    const timeline = store.$state.timelines[timelineIndex];
    if (!timeline || timeline.channel !== "bluesky:homeTimeline") return;

    const nextPosts = uniqueBlueskyFeedItems(posts);
    if (nextPosts.length === 0) return;

    if (isLocalInsert) {
      nextPosts.forEach((post) => locallyInsertedPostIds.set(resolveBlueskyFeedItemId(post), Date.now()));
    }

    if (timeline.readmoreLocked) {
      timeline.pendingNewPosts = mergeBlueskyFeedItemsByDateDesc(
        timeline.pendingNewPosts as BlueskyFeedPost[],
        nextPosts,
      );
      return;
    }

    timeline.posts = mergeBlueskyFeedItemsByDateDesc(timeline.posts as BlueskyFeedPost[], nextPosts).slice(
      0,
      store.$state.settings.maxPostCount,
    );
  };

  const setPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    if (timeline.current) {
      const nextPosts = uniqueBlueskyFeedItems(posts);
      const nextPostIds = new Set(nextPosts.map((post) => resolveBlueskyFeedItemId(post)));
      nextPostIds.forEach((id) => locallyInsertedPostIds.delete(id));

      const currentTimeline = store.$state.timelines[timeline.currentIndex];
      const unconfirmedLocalPosts =
        currentTimeline?.channel === "bluesky:homeTimeline"
          ? (currentTimeline.posts as BlueskyFeedPost[]).filter((post) => {
              const id = resolveBlueskyFeedItemId(post);
              return !nextPostIds.has(id) && isFreshLocallyInsertedPost(id);
            })
          : [];

      store.$state.timelines[timeline.currentIndex].posts = mergeBlueskyFeedItemsByDateDesc(
        nextPosts,
        unconfirmedLocalPosts,
      ).slice(0, store.$state.settings.maxPostCount);
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

  const insertLocalPosts = (posts: AppBskyFeedDefs.FeedViewPost[], target: BlueskyTimelineTarget) => {
    const targetIndexes = findTargetHomeTimelineIndexes(target);
    targetIndexes.forEach((timelineIndex) => {
      mergePostsIntoTimeline({
        posts,
        timelineIndex,
        isLocalInsert: true,
      });
    });
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

  /**
   * Delete my Bluesky post or repost and remove the matching feed item locally.
   */
  const deletePost = async ({
    uri,
    feedItemId,
    userId,
    isRepost,
  }: {
    uri: string;
    feedItemId: string;
    userId: string;
    isRepost: boolean;
  }): Promise<boolean> => {
    const user = store.$state.users.find((user) => user.id === userId);
    if (!user?.blueskySession?.did) {
      store.$state.errors.push({ message: "Blueskyの削除対象アカウントが見つかりませんでした" });
      return false;
    }

    const result = await ipcInvoke("api", {
      method: isRepost ? "bluesky:deleteRepost" : "bluesky:deletePost",
      did: user.blueskySession.did,
      uri,
    });
    if (!result.ok) {
      reportApiError(result, `${feedItemId}の${isRepost ? "リポスト削除" : "投稿削除"}失敗`);
      return false;
    }

    locallyInsertedPostIds.delete(feedItemId);
    removePostAcrossTimelines(store.timelines, userId, feedItemId);
    return true;
  };

  return {
    fetchPosts,
    fetchOlderPosts,
    setCursor,
    setPosts,
    setNotifications,
    pushPosts,
    unshiftPosts,
    insertLocalPosts,
    pushNotifications,
    like,
    deleteLike,
    deletePost,
  };
});
