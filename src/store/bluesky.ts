import { defineStore } from "pinia";
import { methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { AppBskyFeedDefs } from "@atproto/api";
import { ChannelName } from "@shared/types/store";
import { computed } from "vue";
import { BlueskyPost } from "@/types/bluesky";

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

    const data = await ipcInvoke("api", {
      method: methodOfChannel[timeline.current.channel],
      instanceUrl: timeline.currentInstance.url,
      session: timeline.currentUser.blueskySession,
      limit: 40,
    }).catch(() => {
      store.$state.errors.push({
        message: `${timeline.currentInstance?.name}のタイムラインを取得できませんでした`,
      });
    });

    if (data?.feed) {
      setPosts(data.feed);
      setCursor(data.cursor);
    } else {
      store.$state.errors.push({
        message: `${timeline.currentInstance?.name}のタイムラインを取得できませんでした (${data.error?.message})`,
      });
      return;
    }
  };

  const fetchOlderPosts = async (channel: ChannelName) => {
    const timeline = getTimelineStore();

    const data: {
      feed: AppBskyFeedDefs.FeedViewPost[];
      cursor: string;
    } = await ipcInvoke("api", {
      method: methodOfChannel[channel],
      instanceUrl: timeline.currentInstance?.url,
      session: timeline.currentUser?.blueskySession,
      limit: 20,
      cursor: timeline.current?.bluesky?.cursor,
    }).catch(() => {
      store.$state.errors.push({
        message: `${timeline.currentInstance?.name}の古いタイムラインを取得できませんでした`,
      });
    });

    if (data) {
      pushPosts(data.feed);
      setCursor(data.cursor);
    }
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
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser) return;

    const res = await ipcInvoke("api", {
      method: "bluesky:like",
      instanceUrl: timeline.currentInstance?.url,
      session: timeline.currentUser.blueskySession,
      uri,
      cid,
    }).catch(() => {
      store.$state.errors.push({
        message: `${cid}のいいね失敗`,
      });
    });

    const targetPost = currentPosts.value.find((p) => p.post.uri === uri);

    if (!targetPost || !targetPost.post.viewer || !targetPost.post.likeCount) return;

    targetPost.post.viewer.like = res.uri;
    targetPost.post.likeCount++;
  };

  const deleteLike = async ({ uri }: { uri: string }) => {
    const timeline = getTimelineStore();
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser) return;

    await ipcInvoke("api", {
      method: "bluesky:deleteLike",
      instanceUrl: timeline.currentInstance?.url,
      session: timeline.currentUser.blueskySession,
      uri: uri,
    }).catch(() => {
      store.$state.errors.push({
        message: `${uri}のいいね削除失敗`,
      });
    });

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
