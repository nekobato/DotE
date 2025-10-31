import { defineStore } from "pinia";
import { methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { AppBskyFeedDefs } from "@atproto/api";
import { ChannelName } from "@shared/types/store";
import { computed } from "vue";
import { BlueskyPost } from "@/types/bluesky";
import type { ApiInvokeResult } from "@shared/types/ipc";

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

  const currentPosts = computed<AppBskyFeedDefs.FeedViewPost[]>(() => {
    const timeline = getTimelineStore();
    return store.timelines[timeline.currentIndex]?.posts || [];
  });

  const setPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    if (timeline.current) {
      store.$state.timelines[timeline.currentIndex].posts = posts;
    }
  };

  const pushPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    const filteredPosts = posts.filter((post) => {
      const posts = store.$state.timelines[timeline.currentIndex].posts as BlueskyPost[];
      return !posts.some((p) => p.post.uri === post.post.uri);
    });
    if (timeline.current) {
      store.$state.timelines[timeline.currentIndex].posts.push(...filteredPosts);
    }
  };

  const unshiftPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    const timeline = getTimelineStore();
    if (timeline.current) {
      store.$state.timelines[timeline.currentIndex].posts.unshift(...posts);
    }
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
    if (!data || !data.feed) return;
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
    const data = unwrapApiResult(
      result,
      `${timeline.currentInstance?.name}の古いタイムラインを取得できませんでした`,
    );
    if (!data) return;
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
    pushPosts,
    unshiftPosts,
    like,
    deleteLike,
  };
});
