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

/**
 * Return the reactive sources that define the active stream subscription.
 */
const timelineStreamSources = () =>
  [
    route.name,
    timelineStore.isTimelineAvailable,
    timelineStore.current?.id,
    timelineStore.current?.userId,
    timelineStore.current?.channel,
    timelineStore.current?.updateInterval,
    timelineStore.current?.options?.channelId,
    timelineStore.current?.options?.antennaId,
    timelineStore.current?.options?.listId,
    timelineStore.current?.options?.tag,
    timelineStore.current?.options?.query,
    timelineStore.currentInstance?.url,
  ] as const;

/**
 * Keep the stream connection aligned with the current route and timeline selection.
 */
const syncStreamConnection = () => {
  if (route.name !== "MainTimeline" || !timelineStore.isTimelineAvailable) {
    disconnectAllStreams();
    return;
  }

  initStream();
};

watch(
  timelineStreamSources,
  () => {
    syncStreamConnection();
  },
  { immediate: true },
);

onBeforeMount(async () => {
  await store.init();
  console.info("store", store);

  if (timelineStore.isTimelineAvailable) {
    await router.push("/main/timeline");
  } else {
    await router.push("/main/settings");
  }
});

onBeforeUnmount(() => {
  disconnectAllStreams();
});
</script>
<template>
  <RouterView />
</template>
