<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { v4 as uuid } from "uuid";
import Post from "@/components/Post.vue";
import router from "@/router";
import { ipcInvoke } from "@/utils/ipc";
import { parseMisskeyNotes } from "@/utils/misskey";
import { useStore } from "@/store";
import { connectToMisskeyStream } from "@/utils/websocket";
import HazyLoading from "@/components/common/HazyLoading.vue";

type TimelineTypes = "misskey:homeTimeline" | "misskey:localTimeline";

const MethodOfTimelineType = {
  "misskey:homeTimeline": "misskey:getTimelineHome",
  "misskey:localTimeline": "misskey:getTimelineLocal",
};

let ws: WebSocket | null = null;

const timelineContainer = ref<HTMLDivElement | null>(null);

const state = reactive({
  meta: {} as any,
  opacity: 1,
  webSocketId: "",
  settings: {} as any,
  isAdding: false,
});

const store = useStore();

const postList = computed(() => {
  return store.state.timeline.postList;
});

const currentUser = computed(() => {
  return store.state.timeline.user;
});

const currentTimeline = computed(() => {
  return store.state.timeline;
});

window.ipc.on("set-hazy-mode", (_, { mode }) => {
  if (mode === "settings") {
    router.push("/settings");
  }
});

window.ipc.on("setting:set-opacity", (_, payload: number) => {
  state.opacity = payload;
});

const getUsers = async () => {
  const users = await ipcInvoke("db:get-users");
  store.commit("setUsers", users);
};

const getTimelineHome = async (instanceUrl: string, token: string) => {
  const data = await ipcInvoke("api", {
    method: MethodOfTimelineType[state.settings["timeline:timelineType"] as TimelineTypes] || "misskey:getTimelineHome",
    instanceUrl,
    token,
    limit: 40,
  });
  console.log(data);
  const postList = parseMisskeyNotes(data, store.state.timeline.misskeyEmojis);
  store.commit("addPostList", postList);
};

const createReaction = async (payload: { noteId: string; reaction: string }) => {
  const res = await ipcInvoke("api", {
    method: "misskey:createReaction",
    instanceUrl: currentUser.value?.instanceUrl,
    token: currentUser.value?.token,
    noteId: payload.noteId,
    reaction: payload.reaction,
  });
  console.log(res.data);
};

const observeWebSocketConnection = () => {
  state.webSocketId = uuid();
  if (!currentUser.value) throw new Error("No user");
  ws = connectToMisskeyStream(currentUser.value.instanceUrl?.replace(/https?:\/\//, ""), currentUser.value.token);
  ws.onopen = () => {
    console.log("ws:open");
    ws!.send(
      JSON.stringify({
        type: "connect",
        body: { channel: currentTimeline.value.mode.split(":")[1], id: state.webSocketId, params: {} },
      }),
    );
  };
  ws.onerror = () => {
    console.log("ws:error");
  };
  ws.onclose = () => {
    console.log("ws:close");
    if (currentUser.value) {
      ws = connectToMisskeyStream(currentUser.value?.instanceUrl?.replace(/https?:\/\//, ""), currentUser.value?.token);
      observeWebSocketConnection();
    }
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.body.type === "note") {
      const note = parseMisskeyNotes([data.body.body], store.state.timeline.misskeyEmojis)[0];
      const container = timelineContainer.value;
      store.commit("addPostList", [note]);
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
  };
};

onMounted(async () => {
  state.settings = await ipcInvoke("settings:all");
  await getUsers();
  const user = store.state.users?.find((user) => user.id?.toString() === state.settings["timeline:accountId"]);
  store.commit("setTimeline", {
    user,
    instanceUrl: user?.instanceUrl,
    instanceType: "misskey",
    mode: state.settings["timeline:timelineType"] || "misskey:homeTimeline",
  });
  if (currentUser.value) {
    await store.dispatch("fetchAndStoreAllMisskeyEmojis", currentUser.value.instanceUrl);
    // await getMisskeyEmojis(currentUser.value.instanceUrl);
    await getTimelineHome(currentUser.value.instanceUrl, currentUser.value.token);

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
    router.replace("/settings");
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
      v-if="postList.length"
      ref="timelineContainer"
      :class="{
        'is-adding': state.isAdding,
      }"
    >
      <Post class="post-item" v-for="post in postList" :post="post" @create-reaction="createReaction" />
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
