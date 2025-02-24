import { defineStore } from "pinia";
import { methodOfChannel, useStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { AppBskyFeedDefs } from "@atproto/api";
import { ChannelName } from "@shared/types/store";
import { computed } from "vue";

export const useBlueskyStore = defineStore("users", () => {
  const store = useStore();
  const timelineStore = useTimelineStore();

  const currentPosts = computed<AppBskyFeedDefs.FeedViewPost[]>(() => {
    return store.timelines[timelineStore.currentIndex]?.posts || [];
  });

  const setPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    if (timelineStore.current) {
      store.$state.timelines[timelineStore.currentIndex].posts = posts;
    }
  };

  const pushPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    if (timelineStore.current) {
      store.$state.timelines[timelineStore.currentIndex].posts.push(...posts);
    }
  };

  const unshiftPosts = (posts: AppBskyFeedDefs.FeedViewPost[]) => {
    if (timelineStore.current) {
      store.$state.timelines[timelineStore.currentIndex].posts.unshift(...posts);
    }
  };

  const fetchPosts = async () => {
    if (!timelineStore.current || !timelineStore.currentUser || !timelineStore.currentInstance) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const data = await ipcInvoke("api", {
      method: methodOfChannel[timelineStore.current?.channel],
      instanceUrl: timelineStore.currentInstance?.url,
      session: timelineStore.currentUser.blueskySession,
      limit: 40,
    }).catch(() => {
      store.$state.errors.push({
        message: `${timelineStore.currentInstance?.name}のタイムラインを取得できませんでした`,
      });
    });

    if (data?.feed) {
      setPosts(data.feed);
      setCursor(data.cursor);
    } else {
      store.$state.errors.push({
        message: `${timelineStore.currentInstance?.name}のタイムラインを取得できませんでした (${data.error?.message})`,
      });
      return;
    }
  };

  const fetchOlderPosts = async (channel: ChannelName) => {
    const data: {
      feed: AppBskyFeedDefs.FeedViewPost[];
      cursor: string;
    } = await ipcInvoke("api", {
      method: methodOfChannel[channel],
      instanceUrl: timelineStore.currentInstance?.url,
      session: timelineStore.currentUser?.blueskySession,
      limit: 20,
      cursor: timelineStore.current?.bluesky?.cursor,
    }).catch(() => {
      store.$state.errors.push({
        message: `${timelineStore.currentInstance?.name}の古いタイムラインを取得できませんでした`,
      });
    });

    if (data) {
      timelineStore.addMorePosts(data.feed);
    }
  };

  const setCursor = (cursor: string) => {
    if (store.$state.timelines[timelineStore.currentIndex]) {
      store.$state.timelines[timelineStore.currentIndex].bluesky = {
        cursor: cursor,
      };
    }
  };

  const like = async ({ uri, cid }: { uri: string; cid: string }) => {
    if (!store.timelines[timelineStore.currentIndex] || !timelineStore.currentUser) return;

    const res = await ipcInvoke("api", {
      method: "bluesky:like",
      instanceUrl: timelineStore.currentInstance?.url,
      session: timelineStore.currentUser.blueskySession,
      uri,
      cid,
    }).catch(() => {
      store.$state.errors.push({
        message: `${cid}のいいね失敗`,
      });
    });

    const postIndex = currentPosts.value.findIndex((p) => p.post.uri === uri);
    if (postIndex === -1 || !currentPosts.value[postIndex].post.viewer) return;

    store.$state.timelines[timelineStore.currentIndex].posts[postIndex].post.viewer.like = res.uri;
  };

  const deleteLike = async ({ uri }: { uri: string }) => {
    if (!store.timelines[timelineStore.currentIndex] || !timelineStore.currentUser) return;

    await ipcInvoke("api", {
      method: "bluesky:deleteLike",
      instanceUrl: timelineStore.currentInstance?.url,
      session: timelineStore.currentUser.blueskySession,
      uri: uri,
    }).catch(() => {
      store.$state.errors.push({
        message: `${uri}のいいね削除失敗`,
      });
    });

    const postIndex = currentPosts.value.findIndex((p) => p.post.viewer?.like === uri);
    if (postIndex === -1 || !currentPosts.value[postIndex].post.viewer) return;

    currentPosts.value[postIndex].post.viewer.like = undefined;
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
