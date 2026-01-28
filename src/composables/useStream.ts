import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { mastodonChannels } from "@/utils/mastodon";
import { misskeyChannels } from "@/utils/misskey";
import { useBlueskyPolling, useMisskeyPolling } from "@/utils/polling";
import { MisskeyStreamChannel, useMisskeyStream } from "@/utils/misskeyStream";
import { BlueskyChannelName, MastodonChannelName, MisskeyChannelName } from "@shared/types/store";
import { blueskyChannels } from "@/utils/bluesky";
import { nextTick } from "vue";
import { useMastodonStream } from "@/utils/mastodonStream";
import { MisskeyNote } from "@shared/types/misskey";
import { MastodonToot } from "@/types/mastodon";
import { text2Speech } from "@/utils/text2Speech";
import { useMisskeyStore } from "@/store/misskey";

export function useStream() {
  const store = useStore();
  const timelineStore = useTimelineStore();
  const misskeyStore = useMisskeyStore();

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
          misskeyStore.ensureReactionEmoji({ postId: data.id, reaction: data.body.reaction });
          break;
        case "unreacted":
          await misskeyStore.removeReaction({ postId: data.id, reaction: data.body.reaction });
          misskeyStore.ensureReactionEmoji({ postId: data.id, reaction: data.body.reaction });
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

  // IPCイベントハンドラの設定
  const setupIpcHandlers = () => {
    window.ipc?.on("stream:sub-note", (_, data: { postId: string }) => {
      misskeyStream.subNote(data.postId);
    });

    window.ipc?.on("stream:unsub-note", (_, data: { postId: string }) => {
      misskeyStream.unsubNote(data.postId);
    });

    window.ipc?.on("main:reaction", async (_, data: { postId: string; reaction: string }) => {
      const posts = timelineStore.current?.posts as MisskeyNote[];
      if (!posts) return;
      let post = posts.find((post) => post.id === data.postId);
      if (!post) return;

      const targetPost = post.renote ?? post;

      // 既にreactionがある場合
      if (targetPost.myReaction) {
        // 同じリアクションの場合はリアクションを削除するということ
        if (targetPost.myReaction === data.reaction) {
          return await misskeyStore.deleteMyReaction(targetPost.id);
        }

        // 違うリアクションの場合は、まず削除してから新しいリアクションを追加する
        await misskeyStore.deleteMyReaction(targetPost.id);
      }

      await misskeyStore.createMyReaction(targetPost.id, data.reaction);
    });
  };

  // ストリーム初期化関数
  const initStream = () => {
    if (!timelineStore.currentInstance || !timelineStore.current || !timelineStore.currentUser) return;
    const current = timelineStore.current;

    // reset stream
    misskeyStream.disconnect();
    misskeyPolling.stopPolling();
    mastodonStream.disconnect();
    blueskyPolling.stopPolling();

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
    blueskyPolling.stopPolling();
  };

  return {
    misskeyStream,
    misskeyPolling,
    mastodonStream,
    blueskyPolling,
    initStream,
    disconnectAllStreams,
    setupIpcHandlers,
  };
}
