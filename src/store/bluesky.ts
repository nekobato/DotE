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
  extractRepostReason,
  mergeBlueskyFeedItemsByDateDesc,
  resolveBlueskyFeedItemId,
  resolveBlueskyNotificationId,
  shouldShowBlueskyHomeTimelinePost,
  uniqueBlueskyFeedItems,
  uniqueBlueskyNotifications,
} from "@/utils/bluesky";
import { removePostAcrossTimelines } from "@/utils/removePostAcrossTimelines";

const LOCAL_BLUESKY_POST_TTL_MS = 5 * 60 * 1000;

type BlueskyTimelineTarget = {
  timelineId?: string;
  userId?: string;
};

type BlueskyRepostStateUpdate = {
  userId: string;
  postUri: string;
  repostUri?: string;
  isReposted: boolean;
};

type BlueskyRepostDeleteTarget = {
  userId: string;
  postUri: string;
  repostUri: string;
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

  /**
   * Apply DotE's Bluesky home timeline reply policy to hydrated feed items.
   */
  const filterVisibleHomeTimelinePosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    return posts.filter(shouldShowBlueskyHomeTimelinePost);
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

    const nextPosts = uniqueBlueskyFeedItems(isLocalInsert ? posts : filterVisibleHomeTimelinePosts(posts));
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
      const receivedPostIds = new Set(posts.map((post) => resolveBlueskyFeedItemId(post)));
      const nextPosts = uniqueBlueskyFeedItems(filterVisibleHomeTimelinePosts(posts));
      receivedPostIds.forEach((id) => locallyInsertedPostIds.delete(id));

      const currentTimeline = store.$state.timelines[timeline.currentIndex];
      const unconfirmedLocalPosts =
        currentTimeline?.channel === "bluesky:homeTimeline"
          ? (currentTimeline.posts as BlueskyFeedPost[]).filter((post) => {
              const id = resolveBlueskyFeedItemId(post);
              return !receivedPostIds.has(id) && isFreshLocallyInsertedPost(id);
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
    const filteredPosts = filterVisibleHomeTimelinePosts(posts).filter((post) => {
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
      store.$state.timelines[timeline.currentIndex].posts.unshift(
        ...uniqueBlueskyFeedItems(filterVisibleHomeTimelinePosts(posts)),
      );
    }
  };

  /**
   * Run a callback for every Bluesky feed item owned by the same account.
   */
  const forEachBlueskyFeedItem = (userId: string, callback: (post: BlueskyFeedPost) => void) => {
    store.$state.timelines.forEach((timeline) => {
      if (timeline.userId !== userId || timeline.channel !== "bluesky:homeTimeline") return;

      (timeline.posts as BlueskyFeedPost[]).forEach(callback);
      (timeline.pendingNewPosts as BlueskyFeedPost[]).forEach(callback);
    });
  };

  /**
   * Apply the viewer.repost flag and repostCount to every local copy of a Bluesky post.
   */
  const updateRepostStateAcrossTimelines = ({
    userId,
    postUri,
    repostUri,
    isReposted,
  }: BlueskyRepostStateUpdate) => {
    forEachBlueskyFeedItem(userId, (feedItem) => {
      if (feedItem.post.uri !== postUri) return;

      const wasReposted = Boolean(feedItem.post.viewer?.repost);
      const nextViewer = { ...(feedItem.post.viewer ?? {}) };
      if (isReposted) {
        if (!repostUri) return;
        nextViewer.repost = repostUri;
        feedItem.post.viewer = nextViewer;
        if (!wasReposted) {
          feedItem.post.repostCount = (feedItem.post.repostCount ?? 0) + 1;
        }
        return;
      }

      if (!wasReposted) return;
      delete nextViewer.repost;
      feedItem.post.viewer = nextViewer;
      feedItem.post.repostCount = Math.max(0, (feedItem.post.repostCount ?? 0) - 1);
    });
  };

  /**
   * Find the locally cached Bluesky feed item with the given app-local id.
   */
  const findBlueskyFeedItemById = (userId: string, feedItemId: string): BlueskyFeedPost | undefined => {
    for (const timeline of store.$state.timelines) {
      if (timeline.userId !== userId || timeline.channel !== "bluesky:homeTimeline") continue;
      const candidates = [...(timeline.posts as BlueskyFeedPost[]), ...(timeline.pendingNewPosts as BlueskyFeedPost[])];
      const found = candidates.find((post) => resolveBlueskyFeedItemId(post) === feedItemId);
      if (found) return found;
    }
    return undefined;
  };

  /**
   * Remove local feed items that represent the same native Bluesky repost.
   */
  const removeRepostFeedItemsAcrossTimelines = ({ userId, postUri, repostUri }: BlueskyRepostDeleteTarget) => {
    store.$state.timelines.forEach((timeline) => {
      if (timeline.userId !== userId || timeline.channel !== "bluesky:homeTimeline") return;

      const keepNonTargetRepost = (feedItem: BlueskyFeedPost) => {
        const reason = extractRepostReason(feedItem);
        const shouldRemove = feedItem.post.uri === postUri && reason?.uri === repostUri;
        if (shouldRemove) {
          locallyInsertedPostIds.delete(resolveBlueskyFeedItemId(feedItem));
        }
        return !shouldRemove;
      };

      timeline.posts = (timeline.posts as BlueskyFeedPost[]).filter(keepNonTargetRepost);
      timeline.pendingNewPosts = (timeline.pendingNewPosts as BlueskyFeedPost[]).filter(keepNonTargetRepost);
    });
  };

  /**
   * Apply repost state carried by locally inserted native repost feed items.
   */
  const updateRepostStateFromLocalPosts = (posts: AppBskyFeedDefs.FeedViewPost[], target: BlueskyTimelineTarget) => {
    const userId = target.userId ?? getTimelineStore().currentUser?.id;
    if (!userId) return;

    posts.forEach((post) => {
      const reason = extractRepostReason(post);
      if (!reason?.uri) return;
      updateRepostStateAcrossTimelines({
        userId,
        postUri: post.post.uri,
        repostUri: reason.uri,
        isReposted: true,
      });
    });
  };

  const insertLocalPosts = (posts: AppBskyFeedDefs.FeedViewPost[], target: BlueskyTimelineTarget) => {
    updateRepostStateFromLocalPosts(posts, target);

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
   * Delete a native Bluesky repost and update all cached copies of the reposted post.
   */
  const deleteRepost = async ({
    postUri,
    repostUri,
    userId,
  }: {
    postUri: string;
    repostUri: string;
    userId: string;
  }): Promise<boolean> => {
    const user = store.$state.users.find((user) => user.id === userId);
    if (!user?.blueskySession?.did) {
      store.$state.errors.push({ message: "Blueskyのリポスト解除対象アカウントが見つかりませんでした" });
      return false;
    }

    const result = await ipcInvoke("api", {
      method: "bluesky:deleteRepost",
      did: user.blueskySession.did,
      uri: repostUri,
    });
    if (!result.ok) {
      reportApiError(result, `${postUri}のリポスト解除失敗`);
      return false;
    }

    updateRepostStateAcrossTimelines({ userId, postUri, repostUri, isReposted: false });
    removeRepostFeedItemsAcrossTimelines({ userId, postUri, repostUri });
    return true;
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
    const repostedPostUri = isRepost ? findBlueskyFeedItemById(userId, feedItemId)?.post.uri : undefined;
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
    if (isRepost && repostedPostUri) {
      updateRepostStateAcrossTimelines({ userId, postUri: repostedPostUri, repostUri: uri, isReposted: false });
      removeRepostFeedItemsAcrossTimelines({ userId, postUri: repostedPostUri, repostUri: uri });
      return true;
    }

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
    deleteRepost,
    deletePost,
  };
});
