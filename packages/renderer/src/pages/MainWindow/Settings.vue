<script setup lang="ts">
import SectionTitle from "@/components/Post/SectionTitle.vue";
import AccountSettings from "@/components/Settings/AccountSettings.vue";
import ApplicationInformation from "@/components/Settings/ApplicationInformation.vue";
import ApplicationSettings from "@/components/Settings/ApplicationSettings.vue";
import TimelineSettings from "@/components/Settings/TimelineSettings.vue";
</script>

<template>
  <div class="hazy-scroller">
    <div class="settings hazy-timeline-container">
      <SectionTitle title="つまむところ" class="handle" />
      <AccountSettings />
      <TimelineSettings />
      <ApplicationSettings />
      <ApplicationInformation />
    </div>
  </div>
</template>

<style scoped>
.hazy-scroller {
  background-color: rgba(0, 0, 0, 1);
}
.settings {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.handle {
  cursor: grab;
  -webkit-app-region: drag;
}
</style>
