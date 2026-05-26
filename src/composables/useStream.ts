import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { mastodonChannels } from "@/utils/mastodon";
import { misskeyChannels } from "@/utils/misskey";
import { useBlueskyPolling, useMastodonPolling, useMisskeyPolling } from "@/utils/polling";
import { MisskeyStreamChannel, useMisskeyStream, webSocketState as misskeyWebSocketState } from "@/utils/misskeyStream";
import { BlueskyChannelName, MastodonChannelName, MisskeyChannelName } from "@shared/types/store";
import { blueskyChannels } from "@/utils/bluesky";
import { nextTick, watch } from "vue";
import { useMastodonStream } from "@/utils/mastodonStream";
import { MisskeyNote } from "@shared/types/misskey";
import { MastodonToot } from "@/types/mastodon";
import { text2Speech } from "@/utils/text2Speech";
import { useMisskeyStore } from "@/store/misskey";
import { useMisskeyTimelineConnectionStore } from "@/store/misskeyTimelineConnection";
import { useBlueskyStore } from "@/store/bluesky";
import type { AppBskyFeedDefs } from "@atproto/api";

type TimelineAddPostPayload = {
  post: MastodonToot | AppBskyFeedDefs.FeedViewPost;
  timelineId?: string;
  userId?: string;
};

const isBlueskyFeedPost = (post: TimelineAddPostPayload["post"]): post is AppBskyFeedDefs.FeedViewPost => {
  if (!post || typeof post !== "object") return false;
  return "post" in post && typeof post.post === "object" && post.post !== null && "uri" in post.post;
};

export function useStream() {
  const store = useStore();
  const timelineStore = useTimelineStore();
  const misskeyStore = useMisskeyStore();
  const blueskyStore = useBlueskyStore();
  const misskeyTimelineConnectionStore = useMisskeyTimelineConnectionStore();
  let misskeyHealthCheckTimer: number | undefined;
  let ipcDisposers: (() => void)[] = [];
  const reactionOperations = new Map<string, Promise<void>>();

  const misskeyStream = useMisskeyStream({
    onChannel: (event, data) => {
      switch (event) {
        case "note":
          timelineStore.addNewPost(data.body);
          if (store.settings.text2Speech.enabled) {
            text2Speech(data.body.user.user || data.body.user.username, data.body.text || data.body.renote.text);
          }
          break;
        default:
          console.warn("unhandled note", data);
          break;
      }
    },
    onNoteUpdated: async (event, data) => {
      switch (event) {
        case "reacted":
          await misskeyStore.addReaction({ postId: data.id, reaction: data.body.reaction });
          misskeyStore.ensureReactionEmoji({
            postId: data.id,
            reaction: data.body.reaction,
            emoji: data.body.emoji,
          });
          break;
        case "unreacted":
          await misskeyStore.removeReaction({ postId: data.id, reaction: data.body.reaction });
          break;
        default:
          console.warn("unhandled noteUpdated", data);
          break;
      }
    },
    onEmojiAdded: async (_, data) => {
      await misskeyStore.addEmoji(data.body.emoji);
    },
    onReconnect: () => {
      timelineStore.fetchDiffPosts();
    },
  });

  const misskeyPolling = useMisskeyPolling({
    poll: () => {
      misskeyTimelineConnectionStore.scheduleNextPolling();
      timelineStore.fetchDiffPosts();
    },
  });

  const mastodonPolling = useMastodonPolling({
    poll: () => {
      timelineStore.fetchDiffPosts();
    },
  });

  const blueskyPolling = useBlueskyPolling({
    poll: () => {
      timelineStore.fetchInitialPosts();
    },
  });

  const mastodonStream = useMastodonStream({
    onUpdate: (toot) => {
      timelineStore.addNewPost(toot);
    },
    onStatusUpdate: (toot: MastodonToot) => {
      timelineStore.updatePost(toot);
    },
    onDelete: (id) => {
      timelineStore.removePost(id);
    },
    onReconnect: () => {
      timelineStore.fetchDiffPosts();
    },
  });

  watch(
    misskeyStream.state,
    (state) => {
      if (!misskeyTimelineConnectionStore.isWebSocket) return;
      misskeyTimelineConnectionStore.setWebSocketStatus(state);
    },
    { immediate: true },
  );

  /**
   * Remove renderer IPC handlers registered by this composable.
   */
  const disposeIpcHandlers = () => {
    ipcDisposers.forEach((dispose) => dispose());
    ipcDisposers = [];
  };

  /**
   * Run reaction operations for the same note sequentially.
   */
  const enqueueReactionOperation = (postId: string, operation: () => Promise<void>) => {
    const previous = reactionOperations.get(postId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(operation)
      .catch((error) => {
        store.$state.errors.push({
          message: `${postId}へのリアクション失敗`,
        });
        console.error("Misskey reaction operation failed", error);
      })
      .finally(() => {
        if (reactionOperations.get(postId) === next) {
          reactionOperations.delete(postId);
        }
      });

    reactionOperations.set(postId, next);
  };

  /**
   * Apply a Misskey reaction click against the active timeline.
   */
  const handleMisskeyReaction = async (data: { postId: string; reaction: string }) => {
    const posts = timelineStore.current?.posts as MisskeyNote[] | undefined;
    if (!posts) return;
    const post = posts.find((post) => post.id === data.postId);
    if (!post) return;

    const targetPost = (post.renote as MisskeyNote | undefined) ?? post;
    const userId = timelineStore.currentUser?.id;
    if (!userId) return;

    // 既にreactionがある場合
    if (targetPost.myReaction) {
      // 同じリアクションの場合はリアクションを削除するということ
      if (targetPost.myReaction === data.reaction) {
        await misskeyStore.deleteMyReaction(targetPost.id, { userId });
        return;
      }

      // 違うリアクションの場合は、まず削除してから新しいリアクションを追加する
      await misskeyStore.deleteMyReaction(targetPost.id, { reportError: false, userId });
    }

    await misskeyStore.createMyReaction(targetPost.id, data.reaction, { userId });
  };

  /**
   * Register renderer IPC handlers and return their disposer.
   */
  const setupIpcHandlers = () => {
    disposeIpcHandlers();

    const addIpcDisposer = (dispose?: () => void) => {
      if (dispose) ipcDisposers.push(dispose);
    };

    addIpcDisposer(
      window.ipc?.on("stream:sub-note", (_, data: { postId: string }) => {
        misskeyStream.subNote(data.postId);
      }),
    );

    addIpcDisposer(
      window.ipc?.on("stream:unsub-note", (_, data: { postId: string }) => {
        misskeyStream.unsubNote(data.postId);
      }),
    );

    addIpcDisposer(
      window.ipc?.on("main:reaction", (_, data: { postId: string; reaction: string }) => {
        enqueueReactionOperation(data.postId, () => handleMisskeyReaction(data));
      }),
    );

    addIpcDisposer(
      window.ipc?.on("timeline:add-post", (_, data: TimelineAddPostPayload) => {
        if (isBlueskyFeedPost(data.post)) {
          blueskyStore.insertLocalPosts([data.post], {
            timelineId: data.timelineId,
            userId: data.userId,
          });
          return;
        }

        if (timelineStore.currentInstance?.type !== "mastodon") return;
        if (!data.timelineId || !data.userId) return;
        if (timelineStore.current?.id !== data.timelineId) return;
        if (timelineStore.currentUser?.id !== data.userId) return;
        timelineStore.addNewPost(data.post);
        if (data.post.reblog) {
          timelineStore.updatePost(data.post.reblog as MastodonToot);
        }
      }),
    );

    addIpcDisposer(
      window.ipc?.on("resume-timeline", () => {
        const currentTimeline = timelineStore.current;
        if (timelineStore.currentInstance?.type !== "misskey") return;
        if (!currentTimeline) return;
        if (!misskeyChannels.includes(currentTimeline.channel as MisskeyChannelName)) return;
        if (currentTimeline.channel === "misskey:search") return;
        misskeyStream.reconnect(true);
      }),
    );

    return disposeIpcHandlers;
  };

  const stopMisskeyHealthCheck = () => {
    if (!misskeyHealthCheckTimer) return;
    window.clearInterval(misskeyHealthCheckTimer);
    misskeyHealthCheckTimer = undefined;
  };

  const startMisskeyHealthCheck = () => {
    stopMisskeyHealthCheck();
    misskeyHealthCheckTimer = window.setInterval(() => {
      const currentTimeline = timelineStore.current;
      if (timelineStore.currentInstance?.type !== "misskey") return;
      if (!currentTimeline) return;
      if (!misskeyChannels.includes(currentTimeline.channel as MisskeyChannelName)) return;
      if (currentTimeline.channel === "misskey:search") return;

      const state = misskeyStream.state.value;
      if (state === misskeyWebSocketState.OPEN || state === misskeyWebSocketState.CONNECTING) {
        return;
      }

      misskeyStream.reconnect();
    }, 30 * 1000);
  };

  // ストリーム初期化関数
  const initStream = () => {
    if (!timelineStore.currentInstance || !timelineStore.current || !timelineStore.currentUser) return;
    const current = timelineStore.current;

    // reset stream
    misskeyStream.disconnect();
    misskeyPolling.stopPolling();
    mastodonStream.disconnect();
    mastodonPolling.stopPolling();
    blueskyPolling.stopPolling();
    stopMisskeyHealthCheck();
    misskeyTimelineConnectionStore.reset();

    if (mastodonChannels.includes(current.channel as MastodonChannelName)) {
      if (current.channel === "mastodon:list" && !current.options?.listId) {
        store.$state.errors.push({
          message: `リストの指定がありません。設定でやっていってください`,
        });
        return;
      }

      mastodonStream.connect({
        host: timelineStore.currentInstance.url.replace(/https?:\/\//, ""),
        channel: current.channel as MastodonChannelName,
        token: timelineStore.currentUser.token,
      });
      if (current.channel !== "mastodon:notifications") {
        mastodonPolling.startPolling(timelineStore.current.updateInterval);
      }
    }

    if (misskeyChannels.includes(current.channel as MisskeyChannelName)) {
      if (current.channel === "misskey:channel" && !current.options?.channelId) {
        store.$state.errors.push({
          message: `チャンネルの指定がありません。設定でやっていってください`,
        });
        return;
      }

      if (current.channel === "misskey:antenna" && !current.options?.antennaId) {
        store.$state.errors.push({
          message: `アンテナの指定がありません。設定でやっていってください`,
        });
        return;
      }

      if (current.channel === "misskey:userList" && !current.options?.listId) {
        store.$state.errors.push({
          message: `リストの指定がありません。設定でやっていってください`,
        });
        return;
      }

      if (current.channel === "misskey:hashtag" && !current.options?.tag) {
        store.$state.errors.push({
          message: `検索タグがありません。設定でやっていってください`,
        });
        return;
      }

      if (current.channel === "misskey:search" && !current.options?.query) {
        store.$state.errors.push({
          message: `検索文字列がありません。設定でやっていってください`,
        });
        return;
      }

      if (timelineStore.current.channel === "misskey:search") {
        misskeyTimelineConnectionStore.startPolling(timelineStore.current.updateInterval);
        misskeyPolling.startPolling(timelineStore.current.updateInterval);
      } else {
        misskeyStream.connect({
          host: timelineStore.currentInstance.url.replace(/https?:\/\//, ""),
          channel: current.channel.split(":")[1] as MisskeyStreamChannel,
          token: timelineStore.currentUser.token,
          channelId: current.options?.channelId,
          antennaId: current.options?.antennaId,
          listId: current.options?.listId,
        });
        misskeyTimelineConnectionStore.startWebSocket(misskeyStream.state.value);
        startMisskeyHealthCheck();
      }
    }

    if (blueskyChannels.includes(current.channel as BlueskyChannelName)) {
      // Blueskyはストリーミングに対応していないため、ポーリングを使用
      blueskyPolling.startPolling(timelineStore.current.updateInterval);
    }

    nextTick(() => {
      timelineStore.fetchInitialPosts();
    });
  };

  // ストリーム切断関数
  const disconnectAllStreams = () => {
    misskeyStream.disconnect();
    misskeyPolling.stopPolling();
    mastodonStream.disconnect();
    mastodonPolling.stopPolling();
    blueskyPolling.stopPolling();
    stopMisskeyHealthCheck();
    misskeyTimelineConnectionStore.reset();
  };

  return {
    misskeyStream,
    misskeyPolling,
    mastodonStream,
    blueskyPolling,
    initStream,
    disconnectAllStreams,
    setupIpcHandlers,
    disposeIpcHandlers,
  };
}
