<script lang="ts" setup>
import { useTimelineStore } from "@/store/timeline";
import { ipcInvoke } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { computed, ref } from "vue";
import DoteLoading from "./common/DoteLoading.vue";
import { methodOfChannel } from "@/store";
import { useBlueskyStore } from "@/store/bluesky";
import { ChannelName } from "@shared/types/store";

const timelineStore = useTimelineStore();
const blueskyStore = useBlueskyStore();

const loading = ref(false);

const postsOrNotifications = computed(() => {
  if (!timelineStore.current) return [];
  if (timelineStore.current.notifications.length > 0) {
    return timelineStore.current.notifications;
  }
  return timelineStore.current?.posts;
});

const canReadmore = computed(() => {
  return (
    (timelineStore.current?.posts && timelineStore.current?.posts.length > 0) ||
    (timelineStore.current?.notifications && timelineStore.current?.notifications.length > 0)
  );
});

const fetchOlderPosts = async (channel: ChannelName) => {
  const additionalNotes = await ipcInvoke("api", {
    method: methodOfChannel[channel],
    channelId: timelineStore.current?.options.channelId, // option
    antennaId: timelineStore.current?.options?.antennaId, // option
    listId: timelineStore.current?.options?.listId, // option
    query: timelineStore.current?.options?.query, // option
    tag: timelineStore.current?.options?.tag, // option
    instanceUrl: timelineStore.currentInstance?.url,
    token: timelineStore.currentUser?.token,
    session: timelineStore.currentUser?.blueskySession,
    limit: 20,
    untilId: postsOrNotifications.value[postsOrNotifications.value.length - 1].id,
  });

  if (additionalNotes) {
    if (timelineStore.current?.channel === "misskey:notifications") {
      timelineStore.addMoreNotifications(additionalNotes);
    } else {
      timelineStore.addMorePosts(additionalNotes);
    }
  }
};

const readmore = async () => {
  if (!timelineStore.current?.channel || loading.value) {
    return;
  }

  loading.value = true;

  switch (timelineStore.currentInstance?.type) {
    case "bluesky":
      await blueskyStore.fetchOlderPosts(timelineStore.current.channel);
      break;
    default:
      await fetchOlderPosts(timelineStore.current.channel);
      break;
  }

  loading.value = false;
};
</script>
<template>
  <div class="readmore-container" v-if="canReadmore">
    <button class="readmore-button nn-button" @click="readmore">
      <DoteLoading size="small" v-if="loading" />
      <Icon icon="mingcute:arrows-down-line" :width="24" :height="24" color="#adadad" v-else />
    </button>
  </div>
</template>
<style lang="scss">
.readmore-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.readmore-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 56px;
  color: var(--dote-text-color);
  background-color: var(--dote-background-color);
  border: none;
  border-radius: 0;
  transition: background-color 0.2s;
}
</style>
