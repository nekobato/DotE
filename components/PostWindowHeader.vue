<script setup lang="ts">
import { useTimelineStore } from "@/store/timeline";
import { ErrorItem, useStore } from "@/store";
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { PropType } from "vue";
import PostAttachment from "./PostAttachment.vue";

const close = () => {
  ipcSend("post:close");
};
</script>

<template>
  <div class="window-header">
    <button class="nn-button type-ghost" @click="close">
      <Icon icon="mingcute:close-line" class="nn-icon" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.window-header {
  display: flex;
  justify-content: flex-start;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--hazy-color-white-t1);
}
</style>
