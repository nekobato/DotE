<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive } from "vue";
import { v4 as uuid } from "uuid";
import Post from "@/components/Post.vue";
import router from "@/router";
import { ipcInvoke } from "@/utils/ipc";
import { parseMisskeyNotes } from "@/utils/misskey";
import { useStore } from "@/store";
import { connectToMisskeyStream } from "@/utils/websocket";
import HazyLoading from "@/components/common/HazyLoading.vue";

let ws: WebSocket;

const state = reactive({
  meta: {} as any,
  opacity: 1,
  webSocketId: "",
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
    method: "misskey:getTimelineHome",
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
  ws.onopen = () => {
    console.log("open");
    ws.send(
      JSON.stringify({
        type: "connect",
        body: { channel: currentTimeline.value.mode.split(":")[1], id: state.webSocketId, params: {} },
      }),
    );
  };
  ws.onerror = () => {
    console.log("error");
  };
  ws.onclose = () => {
    console.log("close");
    if (currentUser.value) {
      ws = connectToMisskeyStream(currentUser.value?.instanceUrl?.replace(/https?:\/\//, ""), currentUser.value?.token);
      observeWebSocketConnection();
    }
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.body.type === "note") {
      const note = parseMisskeyNotes([data.body.body], store.state.timeline.misskeyEmojis)[0];
      store.commit("addPostList", [note]);
    }
  };
};

onMounted(async () => {
  await getUsers();
  const settings = await ipcInvoke("settings:all");
  const user = store.state.users?.find((user) => user.id?.toString() === settings["timeline:accountId"]);
  store.commit("setTimeline", {
    user,
    instanceUrl: user?.instanceUrl,
    instanceType: "misskey",
    mode: settings["timeline:timelineType"] || "misskey:homeTimeline",
  });
  if (currentUser.value) {
    await store.dispatch("fetchAndStoreAllMisskeyEmojis", currentUser.value.instanceUrl);
    // await getMisskeyEmojis(currentUser.value.instanceUrl);
    await getTimelineHome(currentUser.value.instanceUrl, currentUser.value.token);

    // Websocket
    state.webSocketId = uuid();
    ws = connectToMisskeyStream(currentUser.value.instanceUrl?.replace(/https?:\/\//, ""), currentUser.value.token);
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
});
</script>

<template>
  <div class="page-container hazy-timeline-container">
    <div class="timeline-container" v-if="postList.length">
      <Post v-for="post in postList" :post="post" @create-reaction="createReaction" />
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
