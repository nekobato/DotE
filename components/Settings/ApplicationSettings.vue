<script setup lang="ts">
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { Icon } from "@iconify/vue";
import SectionTitle from "../Post/SectionTitle.vue";
import { Setting } from "~/types/store";

const store = useStore();
const settingsStore = useSettingsStore();

const onChangeOpacity = async (e: Event) => {
  await settingsStore.setOpacity(Number((e.target as HTMLInputElement)?.value));
};

const onChangeMaxPostCount = async (e: Event) => {
  await settingsStore.setMaxPostCount(Number((e.target as HTMLInputElement)?.value));
};

const onKeyDownOn = (key: keyof Setting["shortcuts"]) => async (e: KeyboardEvent) => {
  e.preventDefault();
  const newKey = e.key;
  await settingsStore.setShortcutKey(key, newKey);
};
</script>

<template>
  <div class="account-settings hazy-post-list" v-if="store.settings">
    <SectionTitle title="設定" />
    <div class="hazy-post indent-1">
      <div class="content">
        <span class="title"><Icon icon="ion:eye-outline" class="nn-icon size-small" /><span>の透明度</span></span>
      </div>
      <div class="form-actions">
        <input
          type="range"
          min="0"
          max="100"
          class="nn-range"
          :value="store.settings.opacity"
          @change="onChangeOpacity"
        />
        <input
          type="number"
          min="0"
          max="100"
          class="nn-text-field"
          :value="store.settings.opacity"
          @change="onChangeOpacity"
        />
      </div>
    </div>

    <div class="hazy-post indent-1">
      <div class="content">
        <span class="title">タイムラインに保持する投稿の最大数</span>
      </div>
      <div class="form-actions">
        <input
          type="number"
          min="10"
          max="2000"
          class="nn-text-field max-post-count"
          :value="store.settings.maxPostCount"
          @change="onChangeMaxPostCount"
        />
      </div>
    </div>
    <SectionTitle title="グローバルショートカットキー" />
    <div class="hazy-post indent-1">
      <div class="content">
        <span class="title">タイムライン表示/非表示切り替え</span>
      </div>
      <div class="form-actions">
        <input
          type="text"
          readonly
          class="nn-text-field shortcut-key"
          :value="store.settings.shortcuts.toggleTimeline"
          @keydown="onKeyDownOn('toggleTimeline')($event)"
        />
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

.max-post-count {
  width: 80px;
}
.shortcut-key {
  width: 120px;
}
</style>
