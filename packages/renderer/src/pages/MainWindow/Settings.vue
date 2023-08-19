<script setup lang="ts">
import SectionTitle from "@/components/Post/SectionTitle.vue";
import AccountSettings from "@/components/Settings/AccountSettings.vue";
import ApplicationInformation from "@/components/Settings/ApplicationInformation.vue";
import ApplicationSettings from "@/components/Settings/ApplicationSettings.vue";
import TimelineSettings from "@/components/Settings/TimelineSettings.vue";
import { useUsersStore } from "@/store/users";

const usersStore = useUsersStore();
</script>

<template>
  <div class="settings hazy-timeline-container">
    <SectionTitle title="つまむところ" class="handle" />
    <AccountSettings />
    <TimelineSettings v-if="!usersStore.isEmpty" />
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
