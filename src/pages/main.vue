<script setup lang="ts">
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useTimelineStore } from "@/store/timeline";
import { mastodonChannels } from "@/utils/mastodon";
import { misskeyCreateReaction, misskeyDeleteReaction, misskeyChannels } from "@/utils/misskey";
import { useMisskeyPolling } from "@/utils/polling";
import { MisskeyStreamChannel, useMisskeyStream } from "@/utils/misskeyStream";
import { MastodonChannelName, MisskeyChannelName } from "@shared/types/store";
import { nextTick, onBeforeMount, onBeforeUnmount, watch } from "vue";
import { RouterView, useRouter, useRoute } from "vue-router";
import { useMastodonStream } from "@/utils/mastodonStream";
import { MisskeyNote } from "@shared/types/misskey";
import { MastodonToot } from "@/types/mastodon";

const router = useRouter();
const route = useRoute();
const store = useStore();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();

const misskeyStream = useMisskeyStream({
  onChannel: (event, data) => {
    console.info("onChannel", event, data);
    switch (event) {
      case "note":
        timelineStore.addNewPost(data.body);
        break;
      default:
        console.info("unhandled note", data);
        break;
    }
  },
  onNoteUpdated: (event, data) => {
    console.info("onNoteUpdated", data);
    switch (event) {
      case "reacted":
        console.info("reacted", data);
        timelineStore.misskeyAddReaction({
          postId: data.id,
          reaction: data.body.reaction,
        });
        break;
      default:
        console.info("unhandled noteUpdated", data);
        break;
    }
  },
  onEmojiAdded: (_, data) => {
    console.info("onEmojiAdded", data);
    timelineStore.misskeyAddEmoji(data.body.emoji);
  },
  onReconnect: () => {
    console.info("onReconnect");
    timelineStore.fetchDiffPosts();
  },
});

const misskeyPolling = useMisskeyPolling({
  poll: () => {
    timelineStore.fetchDiffPosts();
  },
});

const mastodonStream = useMastodonStream({
  onUpdate: (toot) => {
    console.info("onUpdate", toot);
    timelineStore.addNewPost(toot);
  },
  onStatusUpdate: (toot: MastodonToot) => {
    console.info("onStatusUpdated", toot);
    timelineStore.updatePost(toot);
  },
  onDelete: (id) => {
    console.info("onDelete", id);
    timelineStore.removePost(id);
  },
  onReconnect: () => {
    console.info("onReconnect");
    timelineStore.fetchDiffPosts();
  },
});

window.ipc?.on("set-mode", (_, { mode, reflect }) => {
  console.info(mode);
  if (reflect) return;

  settingsStore.setMode(mode);
});

window.ipc?.on("main:reaction", async (_, data: { postId: string; reaction: string }) => {
  const post = timelineStore.current?.posts.find((post) => post.id === data.postId) as MisskeyNote;
  if (!post) return;

  // 既にreactionがある場合は削除してから追加
  if (post.myReaction) {
    await misskeyDeleteReaction(data.postId);
  }
  await misskeyCreateReaction(data.postId, data.reaction);
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

  nextTick(() => {
    timelineStore.fetchInitialPosts();
  });
};

watch(
  () => route.name,
  () => {
    if (route.name === "MainTimeline") {
      initStream();
    }
  },
);

onBeforeMount(async () => {
  await store.init();
  console.info("store", store);

  if (timelineStore.isTimelineAvailable) {
    router.push("/main/timeline");
  } else {
    router.push("/main/settings");
  }
});

onBeforeUnmount(() => {
  misskeyStream.disconnect();
  misskeyPolling.stopPolling();
  mastodonStream.disconnect();
});
</script>
<template>
  <RouterView />
</template>
