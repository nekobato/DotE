<script setup lang="ts">
import ErrorPost from "@/components/ErrorPost.vue";
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { connectToMisskeyStream } from "@/utils/websocket";
import { v4 as uuid } from "uuid";
import { onBeforeMount, onBeforeUnmount, reactive } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

let ws: WebSocket | null = null;

const store = useStore();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();

const state = reactive({
  webSocketId: "",
});

window.ipc.on("set-hazy-mode", (_, { mode, reflect }) => {
  console.log(mode);
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

window.ipc.on("resize", (_, bounds) => {
  window.localStorage.setItem("bounds", JSON.stringify(bounds));
});

const observeWebSocketConnection = () => {
  if (ws) ws.close();
  ws = null;
  state.webSocketId = uuid();
  if (!timelineStore.currentUser) throw new Error("No user");
  if (!timelineStore.currentInstance) throw new Error("No instance");
  ws = connectToMisskeyStream(
    timelineStore.currentInstance.url.replace(/https?:\/\//, ""),
    timelineStore.currentUser.token,
  );
  ws.onopen = () => {
    console.log("ws:open");
    if (timelineStore.current) {
      ws!.send(
        JSON.stringify({
          type: "connect",
          body: { channel: timelineStore.current.channel.split(":")[1], id: state.webSocketId, params: {} },
        }),
      );
    }
  };
  ws.onerror = () => {
    console.log("ws:error");
  };
  ws.onclose = () => {
    console.log("ws:close");
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
    if (data.body.type === "note") {
      if (timelineStore.current && timelineStore.currentInstance) {
        timelineStore.addPost(data.body.body);

        // スクロール制御
        // const container = timelineContainer.value;
        // state.isAdding = true;
        // container?.scrollTo({ top: 88, behavior: "auto" });
        // nextTick(() => {
        //   container?.scrollTo({ top: 0, behavior: "smooth" });
        //   state.isAdding = false;
        //   // スクロールしている場合はスクロールを維持する
        //   // if (container?.scrollTop !== 0) {
        //   //   container?.scrollTo({
        //   //     top: container.scrollTop + container.querySelectorAll(".post-item")[0].clientHeight,
        //   //     behavior: "auto",
        //   //   });
        //   //   // state.isAdding = false;
        //   // } else {
        //   //   // container?.querySelectorAll(".post-item")[1].scrollIntoView({
        //   //   //   behavior: "auto",
        //   //   // });
        //   //   // container?.scrollTo({
        //   //   //   top: container.querySelectorAll(".post-item")[0].clientHeight,
        //   //   //   behavior: "auto",
        //   //   // });
        //   //   nextTick(() => {
        //   //     container?.scrollTo({ top: 0, behavior: "smooth" });
        //   //     state.isAdding = false;
        //   //   });
        //   // }
        // });
      }
    }
  };
};

// Timelineの設定が更新されたらPostsを再取得し、WebSocketの接続を更新する
timelineStore.$onAction((action) => {
  if (action.name === "updateTimeline") {
    timelineStore.fetchInitialPosts();
    observeWebSocketConnection();
  }
});

onBeforeMount(async () => {
  await store.init();
  console.log("store", store);
  const bounds = window.localStorage.getItem("bounds");
  if (bounds) {
    window.ipc.send("resize", bounds);
  }

  if (timelineStore.currentUser) {
    await timelineStore.fetchInitialPosts().catch((error) => {
      console.log(error);
    });
    observeWebSocketConnection();
    if (store.settings.hazyMode === "settings") {
      router.replace("/main/settings");
    }
  } else {
    console.log("No user");
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
    <div class="timeline-container">
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
