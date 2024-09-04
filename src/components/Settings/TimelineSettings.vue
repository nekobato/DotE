<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import TimelineForm from "./TimelineForm.vue";
import { Timeline } from "@shared/types/store";
import { Icon } from "@iconify/vue";
import { defaultChannelNameFromType } from "@/utils/dote";

const store = useStore();
const timelineStore = useTimelineStore();

const onUpdateTimeline = async (timeline: Timeline) => {
  await timelineStore.updateTimeline({ ...timeline, posts: [], notifications: [] });
};

const addTimeline = async () => {
  if (!store.users.length || !timelineStore.currentInstance || !timelineStore.currentUser?.id) return;
  await timelineStore.createTimeline({
    userId: timelineStore.currentUser?.id,
    channel: defaultChannelNameFromType(timelineStore.currentInstance?.type),
    options: {},
    updateInterval: 60 * 1000, // 60 sec
    available: false,
  });
};
</script>

<template>
  <div class="account-settings dote-post-list" v-if="store.$state.users.length">
    <h2 class="dote-field-group-title">タイムライン</h2>
    <div class="timeline-list">
      <div v-for="timeline in store.timelines" :key="timeline.id">
        <div class="timeline-item">
          <TimelineForm :timeline="timeline" @updateTimeline="onUpdateTimeline" />
        </div>
      </div>
    </div>
    <button class="nn-button size-small add-button" @click="addTimeline">
      <Icon icon="mingcute:add-fill" class="nn-icon" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
}
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px;
}
.add-button {
  display: block;
  margin: 16px 16px 0 auto;
}
</style>
