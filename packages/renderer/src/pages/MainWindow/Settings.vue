<script setup lang="ts">
import { onMounted } from "vue";
import AccountSettings from "@/components/Settings/AccountSettings.vue";
import TimelineSettings from "@/components/Settings/TimelineSettings.vue";
import ApplicationSettings from "@/components/Settings/ApplicationSettings.vue";
import router from "@/router";
import SectionTitle from "@/components/Post/SectionTitle.vue";
import ApplicationInformation from "@/components/Settings/ApplicationInformation.vue";

window.ipc.on("set-hazy-mode", ({ mode }) => {
  if (mode !== "settings") {
    router.push("/timeline");
  }
});

onMounted(() => {
  console.log("settings");
});
</script>

<template>
  <div class="settings hazy-timeline-container">
    <SectionTitle title="つまむところ" class="handle" />
    <AccountSettings />
    <TimelineSettings />
    <ApplicationSettings />
    <ApplicationInformation />
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}
.handle {
  cursor: grab;
  -webkit-app-region: drag;
}
</style>
