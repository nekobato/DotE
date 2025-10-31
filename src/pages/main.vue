<script setup lang="ts">
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useTimelineStore } from "@/store/timeline";
import { onBeforeMount, onBeforeUnmount, watch } from "vue";
import { RouterView, useRouter, useRoute } from "vue-router";
import { useStream } from "@/composables/useStream";

const router = useRouter();
const route = useRoute();
const store = useStore();
const timelineStore = useTimelineStore();
const settingsStore = useSettingsStore();
const { initStream, disconnectAllStreams, setupIpcHandlers } = useStream();

window.ipc?.on("set-mode", (_, { mode, reflect }) => {
  console.info(mode);
  if (reflect) return;

  settingsStore.setMode(mode);
});

window.ipc?.on("resume-timeline", () => {});

// IPCイベントハンドラの設定
setupIpcHandlers();

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
  disconnectAllStreams();
});
</script>
<template>
  <RouterView />
</template>
