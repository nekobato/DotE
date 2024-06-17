<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import TimelineForm from "./TimelineForm.vue";
import { Timeline } from "@shared/types/store";

const store = useStore();
const timelineStore = useTimelineStore();

const onUpdateTimeline = async (timeline: Timeline) => {
  await timelineStore.updateTimeline({ ...timeline, posts: [], channels: [] });
};
</script>

<template>
  <div class="account-settings dote-post-list" v-if="store.$state.users.length">
    <h2 class="dote-field-group-title">タイムライン</h2>
    <div v-for="timeline in store.timelines" :key="timeline.id">
      <TimelineForm :timeline="timeline" @updateTimeline="onUpdateTimeline" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
}
</style>
