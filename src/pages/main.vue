<script setup lang="ts">
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useTimelineStore } from "@/store/timeline";
import { mastodonChannels } from "@/utils/mastodon";
import { misskeyChannels } from "@/utils/misskey";
import { useBlueskyPolling, useMisskeyPolling } from "@/utils/polling";
import { MisskeyStreamChannel, useMisskeyStream } from "@/utils/misskeyStream";
import { BlueskyChannelName, MastodonChannelName, MisskeyChannelName } from "@shared/types/store";
import { blueskyChannels } from "@/utils/bluesky";
import { nextTick, onBeforeMount, onBeforeUnmount, watch } from "vue";
import { RouterView, useRouter, useRoute } from "vue-router";
import { useMastodonStream } from "@/utils/mastodonStream";
import { MisskeyNote } from "@shared/types/misskey";
import { MastodonToot } from "@/types/mastodon";
import { text2Speech } from "@/utils/text2Speech";
import { useMisskeyStore } from "@/store/misskey";

const router = useRouter();
const route = useRoute();
const store = useStore();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();
const misskeyStore = useMisskeyStore();

const misskeyStream = useMisskeyStream({
  onChannel: (event, data) => {
    switch (event) {
      case "note":
        timelineStore.addNewPost(data.body);
        text2Speech(data.body.user.user || data.body.user.username, data.body.text || data.body.renote.text);
        break;
      default:
        console.info("unhandled note", data);
        break;
    }
  },
  onNoteUpdated: async (event, data) => {
    switch (event) {
      case "reacted":
        console.info("reacted", data);
        await misskeyStore.createReaction(data.id, data.body.reaction);
        break;
      default:
        console.info("unhandled noteUpdated", data);
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

window.ipc?.on("set-mode", (_, { mode, reflect }) => {
  console.info(mode);
  if (reflect) return;

  settingsStore.setMode(mode);
});

window.ipc?.on("main:reaction", async (_, data: { postId: string; reaction: string }) => {
  const posts = timelineStore.current?.posts as MisskeyNote[];
  if (!posts) return;
  const post = posts.find((post) => post.id === data.postId);
  if (!post) return;

  // 既にreactionがある場合は削除してから追加
  if (post.myReaction) {
    if (post.myReaction === data.reaction) {
      return;
    }

    await misskeyStore.deleteReaction(data.postId);
  }
  await misskeyStore.createReaction(data.postId, data.reaction);
});

window.ipc?.on("stream:sub-note", (_, data: { postId: string }) => {
  misskeyStream.subNote(data.postId);
});

window.ipc?.on("stream:unsub-note", (_, data: { postId: string }) => {
  misskeyStream.unsubNote(data.postId);
});

window.ipc?.on("resume-timeline", () => {});

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

watch(
  () => route.name,
  () => {
    if (route.name === "MainTimeline") {
      console.log("initStream");
    }
  },
);

onBeforeMount(async () => {
  await store.init();
  console.info("store", store);

  if (timelineStore.isTimelineAvailable) {
    router.push("/main/timeline");
    initStream();
  } else {
    router.push("/main/settings");
  }
});

onBeforeUnmount(() => {
  misskeyStream.disconnect();
  misskeyPolling.stopPolling();
  mastodonStream.disconnect();
  blueskyPolling.stopPolling();
});
</script>
<template>
  <RouterView />
</template>
