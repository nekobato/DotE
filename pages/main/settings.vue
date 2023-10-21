<script setup lang="ts">
import AccountSettings from "@/components/Settings/AccountSettings.vue";
import ApplicationInformation from "@/components/Settings/ApplicationInformation.vue";
import ApplicationSettings from "@/components/Settings/ApplicationSettings.vue";
import TimelineSettings from "@/components/Settings/TimelineSettings.vue";
import MainWindowHeader from "~/components/MainWindowHeader.vue";
</script>

<template>
  <div class="settings">
    <MainWindowHeader />
    <div class="hazy-scroller">
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
  width: 100%;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 1);
  border-radius: 8px;
}
</style>
