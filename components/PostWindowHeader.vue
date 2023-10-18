<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";

const close = () => {
  ipcSend("post:close");
};
</script>

<template>
  <div class="window-header">
    <button class="nn-button type-ghost" @click="close">
      <Icon icon="mingcute:close-line" class="nn-icon" />
    </button>
    <div class="rest"></div>
  </div>
</template>

<style lang="scss" scoped>
.window-header {
  display: flex;
  justify-content: flex-start;
  border-bottom: 1px solid var(--hazy-color-white-t1);
}
.rest {
  flex: 1;
  -webkit-app-region: drag;
}
</style>
