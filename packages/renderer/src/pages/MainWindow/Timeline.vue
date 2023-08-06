<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { v4 as uuid } from "uuid";
import Post from "@/components/Post.vue";
import router from "@/router";
import { parseMisskeyNotes } from "@/utils/misskey";
import { connectToMisskeyStream } from "@/utils/websocket";
import HazyLoading from "@/components/common/HazyLoading.vue";
import { useUsersStore } from "@/store/users";
import { useTimelineStore } from "@/store/timeline";
import { useSettingsStore } from "@/store/settings";
import { useInstanceStore } from "@/store/instance";
import { ipcSend } from "@/utils/ipc";

let ws: WebSocket | null = null;

const usersStore = useUsersStore();
const timelineStore = useTimelineStore();
const instanceStore = useInstanceStore();
const settingsStore = useSettingsStore();

const timelineContainer = ref<HTMLDivElement | null>(null);

const state = reactive({
  webSocketId: "",
  isAdding: false,
});

const observeWebSocketConnection = () => {
  state.webSocketId = uuid();
  if (!timelineStore.currentUser) throw new Error("No user");
  ws = connectToMisskeyStream(
    timelineStore.currentUser.instanceUrl?.replace(/https?:\/\//, ""),
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
    if (timelineStore.currentUser) {
      ws = connectToMisskeyStream(
        timelineStore.currentUser?.instanceUrl?.replace(/https?:\/\//, ""),
        timelineStore.currentUser?.token,
      );
      observeWebSocketConnection();
    }
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.body.type === "note") {
      if (timelineStore.current) {
        const note = parseMisskeyNotes([data.body.body], timelineStore.current.misskey.emojis)[0];
        timelineStore.addPost(note);

        // スクロール制御
        const container = timelineContainer.value;
        state.isAdding = true;
        container?.scrollTo({ top: 88, behavior: "auto" });
        nextTick(() => {
          container?.scrollTo({ top: 0, behavior: "smooth" });
          state.isAdding = false;
          // スクロールしている場合はスクロールを維持する
          // if (container?.scrollTop !== 0) {
          //   container?.scrollTo({
          //     top: container.scrollTop + container.querySelectorAll(".post-item")[0].clientHeight,
          //     behavior: "auto",
          //   });
          //   // state.isAdding = false;
          // } else {
          //   // container?.querySelectorAll(".post-item")[1].scrollIntoView({
          //   //   behavior: "auto",
          //   // });
          //   // container?.scrollTo({
          //   //   top: container.querySelectorAll(".post-item")[0].clientHeight,
          //   //   behavior: "auto",
          //   // });
          //   nextTick(() => {
          //     container?.scrollTo({ top: 0, behavior: "smooth" });
          //     state.isAdding = false;
          //   });
          // }
        });
      }
    }
  };
};

onMounted(async () => {
  await settingsStore.init();
  await usersStore.init();
  await timelineStore.init();
  instanceStore.init();

  if (timelineStore.currentUser) {
    await instanceStore.fetchMisskeyEmoji(timelineStore.currentUser.instanceUrl);
    await timelineStore.fetchPosts();

    // Websocket
    observeWebSocketConnection();
    // state.postList.forEach((post: any) => {
    //   ws.send(
    //     JSON.stringify({
    //       type: "s",
    //       body: {
    //         id: post.id,
    //       },
    //     })
    //   );
    // });
  } else {
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
  <div class="page-container hazy-timeline-container">
    <div
      class="timeline-container"
      v-if="timelineStore.currentPosts.length"
      ref="timelineContainer"
      :class="{
        'is-adding': state.isAdding,
      }"
    >
      <Post class="post-item" v-for="post in timelineStore.currentPosts" :post="post" />
    </div>
    <HazyLoading v-else />
  </div>
</template>

<style lang="scss">
body::-webkit-scrollbar {
  display: none;
}
</style>
<style lang="scss" scoped>
.page-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
}
.timeline-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  &.is-adding {
    overflow-y: hidden;
  }
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #fff;
  text-shadow: 1px 0 1px #000;
}
</style>
