<script setup lang="ts">
import { onMounted, reactive, watch } from "vue";
import { Icon } from "@iconify/vue";
import SectionTitle from "../Post/SectionTitle.vue";
import { ipcInvoke, ipcSend } from "@/utils/ipc";

const state = reactive({
  settings: {
    windowOpacity: 50,
  },
});

const onChangeOpacity = async () => {
  await ipcInvoke("settings:set", {
    key: "opacity",
    value: state.settings.windowOpacity,
  });
  ipcSend("settings:get-all");
};
</script>

<template>
  <div class="account-settings hazy-post-list">
    <SectionTitle title="設定" />
    <div class="hazy-post">
      <div class="content">
        <span class="title"><Icon icon="ion:eye-outline" class="nn-icon size-small" /><span>の透明度</span></span>
      </div>
      <div class="hazy-post-actions">
        <input
          type="range"
          min="0"
          max="100"
          class="nn-range"
          v-model="state.settings.windowOpacity"
          @change="onChangeOpacity"
        />
        <input type="number" min="0" max="100" class="nn-text-field" v-model="state.settings.windowOpacity" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
}

.content {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  .title {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-body);
    font-weight: bold;
    font-size: 14px;
  }
}

.hazy-post {
  display: flex;
}
</style>
