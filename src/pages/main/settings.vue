<script setup lang="ts">
import AccountSettings from "@/components/Settings/AccountSettings.vue";
import ApplicationInformation from "@/components/Settings/ApplicationInformation.vue";
import ApplicationSettings from "@/components/Settings/ApplicationSettings.vue";
import TimelineSettings from "@/components/Settings/TimelineSettings.vue";
import Header from "@/components/Header.vue";
import { useTimelineStore } from "@/store/timeline";
import { ElDivider } from "element-plus";

const timelineStore = useTimelineStore();
</script>

<template>
  <div class="settings">
    <Header windowType="settings" :canBack="timelineStore.isTimelineAvailable" />
    <div class="dote-scroller">
      <AccountSettings />
      <TimelineSettings />
      <ElDivider class="divider" />
      <ApplicationSettings />
      <ElDivider class="divider" />
      <ApplicationInformation />
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.dote-scroller {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--color-background);
  border: 1px solid var(--dote-border-color);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.divider {
  margin: 16px 0;
}
</style>
