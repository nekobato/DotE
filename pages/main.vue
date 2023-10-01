<script setup lang="ts">
import ErrorPost from "@/components/ErrorPost.vue";
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { connectToMisskeyStream } from "@/utils/websocket";
import { nanoid } from "nanoid/non-secure";
import { onBeforeMount, onBeforeUnmount, reactive } from "vue";
import { useRouter } from "vue-router";
import { createReaction, deleteReaction, isMyReaction } from "~/utils/misskey";

const router = useRouter();

let ws: WebSocket | null = null;
const wsState = reactive({
  isConnecting: false,
  isConnected: false,
});
// コネクションが張れていない場合はキューに追加する
const wsNoteSubScriptionQueue: string[] = [];

const store = useStore();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();

const state = reactive({
  webSocketId: "",
});

window.ipc.on("set-hazy-mode", (_, { mode, reflect }) => {
  console.info(mode);
  if (reflect) return;

  settingsStore.setHazyMode(mode);

  switch (mode) {
    case "settings":
      router.push("/main/settings");
      break;
    case "show":
    case "haze":
      router.push("/main/timeline");
      break;
    default:
      break;
  }
});

const observeWebSocketConnection = () => {
  if (ws) ws.close();
  wsState.isConnecting = true;
  wsState.isConnected = false;
  ws = null;
  state.webSocketId = nanoid();
  if (!timelineStore.currentUser) throw new Error("No user");
  if (!timelineStore.currentInstance) throw new Error("No instance");
  ws = connectToMisskeyStream(
    timelineStore.currentInstance.url.replace(/https?:\/\//, ""),
    timelineStore.currentUser.token,
  );
  ws.onopen = () => {
    console.info("ws:open");

    if (timelineStore.current) {
      ws?.send(
        JSON.stringify({
          type: "connect",
          body: { channel: timelineStore.current.channel.split(":")[1], id: state.webSocketId, params: {} },
        }),
      );
    }
  };
  ws.onerror = () => {
    console.info("ws:error");
  };
  ws.onclose = () => {
    console.info("ws:close");
    wsState.isConnected = false;
    if (timelineStore.currentUser && timelineStore.currentInstance) {
      ws = connectToMisskeyStream(
        timelineStore.currentInstance.url.replace(/https?:\/\//, ""),
        timelineStore.currentUser.token,
      );
      observeWebSocketConnection();
    }
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case "connected":
        console.log("coneccted");
        wsState.isConnecting = false;
        wsState.isConnected = true;
        if (wsNoteSubScriptionQueue.length) {
          wsNoteSubScriptionQueue.forEach((postId) => {
            ws?.send(
              JSON.stringify({
                type: "subNote",
                body: { id: postId },
              }),
            );
          });
          wsNoteSubScriptionQueue.length = 0;
        }
        break;
      case "channel":
        switch (data.body.type) {
          case "note":
            if (timelineStore.current && timelineStore.currentInstance) {
              timelineStore.addPost(data.body.body);
            }
            break;
          default:
            console.info("unhandled note", data);
            break;
        }
        break;
      case "noteUpdated":
        switch (data.body.type) {
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
        break;
      default:
        console.info("unhandled stream message", data);
        break;
    }
  };
};

window.ipc.on("main:reaction", (_, data: { postId: string; reaction: string }) => {
  const post = timelineStore.current?.posts.find((post) => post.id === data.postId);
  if (!post) return;

  if (isMyReaction(data.reaction, post.myReaction)) {
    deleteReaction(data.postId, false);
  } else {
    // 既にreactionがある場合は削除してから追加
    if (post.myReaction) {
      deleteReaction(data.postId, false);
    }
    createReaction(data.postId, data.reaction);
  }

  timelineStore.updatePost({
    postId: data.postId,
  });
});

window.ipc.on("stream:sub-note", (data: { postId: string }) => {
  if (wsState.isConnecting || wsState.isConnected) {
    wsNoteSubScriptionQueue.push(data.postId);
    return;
  }
  ws?.send(
    JSON.stringify({
      type: "subNote",
      body: { id: data.postId },
    }),
  );
});

window.ipc.on("stream:unsub-note", (data: { postId: string }) => {
  if (wsState.isConnecting || wsState.isConnected) return;
  ws?.send(
    JSON.stringify({
      type: "unsubNote",
      body: { id: data.postId },
    }),
  );
});

// Timelineの設定が更新されたらPostsを再取得し、WebSocketの接続を更新する
timelineStore.$onAction((action) => {
  if (action.name === "updateTimeline") {
    observeWebSocketConnection();
    timelineStore.fetchInitialPosts();
  }
});

onBeforeMount(async () => {
  await store.init();
  console.info("store", store);
  const bounds = window.localStorage.getItem("bounds");
  if (bounds) {
    window.ipc.send("resize", bounds);
  }

  if (timelineStore.currentUser) {
    await timelineStore.fetchInitialPosts().catch((error) => {
      console.error(error);
    });
    observeWebSocketConnection();
    if (store.settings.hazyMode === "settings") {
      router.replace("/main/settings");
    }
  } else {
    console.info("No user");
    router.replace("/main/settings");
    ipcSend("set-hazy-mode", { mode: "settings", reflect: true });
  }
});

onBeforeUnmount(() => {
  ws?.close();
  ws = null;
});
</script>
<template>
  <div class="hazy-timeline-container" v-if="store.errors.length">
    <div class="hazy-post-list">
      <ErrorPost class="post-item" v-for="(error, index) in store.errors" :error="{ ...error, index }" />
    </div>
  </div>
  <NuxtPage />
</template>
<style lang="scss" scoped>
.haze {
  pointer-events: none;
}
</style>
