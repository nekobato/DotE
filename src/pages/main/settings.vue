<script setup lang="ts">
import AccountSettings from "@/components/Settings/AccountSettings.vue";
import ApplicationInformation from "@/components/Settings/ApplicationInformation.vue";
import ApplicationSettings from "@/components/Settings/ApplicationSettings.vue";
import TimelineSettings from "@/components/Settings/TimelineSettings.vue";
import WindowHeader from "@/components/WindowHeader.vue";
import { useTimelineStore } from "@/store/timeline";

const timelineStore = useTimelineStore();
</script>

<template>
  <div class="settings">
    <WindowHeader windowType="settings" :canBack="timelineStore.isTimelineAvailable" />
    <div class="dote-scroller">
      <AccountSettings />
      <TimelineSettings />
      <ApplicationSettings />
      <ApplicationInformation />
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
}
.dote-scroller {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--color-background);
  border: 1px solid var(--dote-border-color);
  border-radius: 8px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
</style>
