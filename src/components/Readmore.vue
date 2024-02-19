<script lang="ts" setup>
import { useTimelineStore } from "@/store/timeline";
import { ipcInvoke } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { computed, ref } from "vue";
import HazyLoading from "./common/HazyLoading.vue";
import { methodOfChannel } from "@/store";

const timelineStore = useTimelineStore();

const loading = ref(false);

const channel = computed(() => {
  return timelineStore.current?.channel;
});

const posts = computed(() => {
  return timelineStore.current?.posts;
});

const canReadmore = computed(() => {
  return posts.value && posts.value.length > 0;
});

const readmore = async () => {
  if (!posts.value || !channel.value || posts.value.length === 0 || loading.value) {
    return;
  }

  loading.value = true;
  const additionalNotes = await ipcInvoke("api", {
    method: methodOfChannel[channel.value],
    instanceUrl: timelineStore.currentInstance?.url,
    i: timelineStore.currentInstance?.id,
    limit: 20,
    untilId: posts.value[posts.value.length - 1].id,
  });

  if (additionalNotes) {
    console.log("add", additionalNotes);
    timelineStore.addMorePosts(additionalNotes);
  }
  loading.value = false;
};
</script>
<template>
  <div class="readmore-container" v-if="canReadmore">
    <button class="readmore-button nn-button" @click="readmore">
      <HazyLoading v-if="loading" />
      <Icon icon="mingcute:arrows-down-line" v-else />
    </button>
  </div>
</template>
<style lang="scss">
.readmore-container {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.readmore-button {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--hazy-background-color);
  border-radius: 8px;
  box-shadow: var(--shadow);
  transition: background-color 0.2s;
}
</style>
