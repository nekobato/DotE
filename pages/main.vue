<script setup lang="ts">
import ErrorPost from "@/components/ErrorPost.vue";
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { useMisskeyStream } from "@/utils/websocket";
import { onBeforeMount, onBeforeUnmount } from "vue";
import { createReaction, deleteReaction, isMyReaction } from "~/utils/misskey";

const router = useRouter();

const store = useStore();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();

const misskeyStream = useMisskeyStream({
  onChannel: (event, data) => {
    console.info("onChannel", event, data);
    switch (event) {
      case "note":
        timelineStore.addPost(data.body);
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
        timelineStore.addReaction({
          postId: data.body.id,
          reaction: data.body.body.reaction,
        });
        break;
      default:
        console.info("unhandled noteUpdated", data);
        break;
    }
  },
  onEmojiAdded: (event, data) => {
    console.info("onEmojiAdded", data);
    timelineStore.addEmoji(data.body.emoji);
  },
  onReconnect: () => {
    console.info("onReconnect");
    timelineStore.fetchDiffPosts();
  },
});

window.ipc?.on("set-hazy-mode", (_, { mode, reflect }) => {
  console.info(mode);
  if (reflect) return;

  settingsStore.setHazyMode(mode);
  gotoHazyRoute(mode);
});

window.ipc?.on("main:reaction", async (_, data: { postId: string; reaction: string }) => {
  const post = timelineStore.current?.posts.find((post) => post.id === data.postId);
  if (!post) return;

  if (isMyReaction(data.reaction, post.myReaction)) {
    await deleteReaction(data.postId, false);
  } else {
    // 既にreactionがある場合は削除してから追加
    if (post.myReaction) {
      await deleteReaction(data.postId, true);
    }
    await createReaction(data.postId, data.reaction);
  }

  await timelineStore.updatePost({
    postId: data.postId,
  });
});

window.ipc?.on("stream:sub-note", (data: { postId: string }) => {
  misskeyStream.subNote(data.postId);
});

window.ipc?.on("stream:unsub-note", (data: { postId: string }) => {
  misskeyStream.unsubNote(data.postId);
});

window.ipc?.on("resume-timeline", () => {});

const initStream = () => {
  if (timelineStore.current?.channel === "misskey:channel" && !timelineStore.current?.options?.channelId) {
    store.$state.errors.push({
      message: `チャンネルの指定がありません。設定でやっていってください`,
    });
    return;
  }

  if (timelineStore.currentInstance && timelineStore.current && timelineStore.currentUser) {
    misskeyStream.disconnect();
    misskeyStream.connect({
      host: timelineStore.currentInstance.url.replace(/https?:\/\//, ""),
      channel: timelineStore.current.channel.split(":")[1] as MisskeyStreamChannel,
      token: timelineStore.currentUser.token,
      channelId: timelineStore.current.options?.channelId,
    });
  }

  nextTick(() => {
    timelineStore.fetchInitialPosts();
  });
};

// Timelineの設定が更新されたらPostsを再取得し、WebSocketの接続を更新する
timelineStore.$onAction((action) => {
  if (action.name === "updateTimeline") {
    console.log("updateTimeline");

    initStream();
  }
});

onBeforeMount(async () => {
  await store.init();
  console.info("store", store);

  if (!timelineStore.current) {
    ipcSend("set-hazy-mode", { mode: "settings" });
    return;
  }

  initStream();

  gotoHazyRoute(store.settings.hazyMode);
  router.push("/main/timeline");
});

onBeforeUnmount(() => {
  misskeyStream.disconnect();
});
</script>
<template>
  <NuxtPage />
</template>
