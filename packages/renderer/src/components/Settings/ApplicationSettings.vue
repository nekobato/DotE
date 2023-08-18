<script setup lang="ts">
import { Icon } from "@iconify/vue";
import SectionTitle from "../Post/SectionTitle.vue";
import { useSettingsStore } from "@/store/settings";
import { ref } from "vue";

const settingsStore = useSettingsStore();

const opacity = ref();

const onChangeOpacity = async () => {
  settingsStore.setOpacity(opacity.value);
};
</script>

<template>
  <div class="account-settings hazy-post-list">
    <SectionTitle title="設定" />
    <div class="hazy-post indent-1">
      <div class="content">
        <span class="title"><Icon icon="ion:eye-outline" class="nn-icon size-small" /><span>の透明度</span></span>
      </div>
      <div class="form-actions" :class="{ 'hazy-unvisible': !opacity }">
        <input type="range" min="0" max="100" class="nn-range" v-model="opacity" @change="onChangeOpacity" />
        <input type="number" min="0" max="100" class="nn-text-field" v-model="opacity" @change="onChangeOpacity" />
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
