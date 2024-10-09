<script setup lang="ts">
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { keyboardEventToElectronAccelerator } from "@/utils/dote";
import { Icon } from "@iconify/vue";
import type { Settings } from "@shared/types/store";
import { ElSlider, ElSwitch, ElInputNumber, ElSelect, ElOption } from "element-plus";
import { ref, watch } from "vue";

const store = useStore();
const settingsStore = useSettingsStore();
const shortcutInput = ref<HTMLElement | null>(null);

watch(
  () => store.settings?.opacity,
  async () => {
    await settingsStore.setOpacity(store.settings?.opacity);
  },
);

const onChangeMaxPostCount = async (value: number) => {
  await settingsStore.setMaxPostCount(value);
};

const postStyleOptions = [
  {
    label: "全て表示",
    value: "all",
  },
  {
    label: "3行",
    value: "line-3",
  },
  {
    label: "2行",
    value: "line-2",
  },
  {
    label: "1行",
    value: "line-1",
  },
];

const onChangePostStyle = (value: string | number | boolean) => {
  settingsStore.setPostStyle(value as Settings["postStyle"]);
};

const focusShortcutInput = () => {
  shortcutInput.value?.focus();
};

const onKeyDownOnShortcut = (key: keyof Settings["shortcuts"]) => {
  console.log("onKeyDownOnShortcut", key);
  return async (e: KeyboardEvent) => {
    const shortcut = keyboardEventToElectronAccelerator(e);

    if (shortcut === "" || shortcut === store.settings.shortcuts.toggleTimeline) {
      return;
    }

    settingsStore.setShortcutKey(key, shortcut);
  };
};

const onChangeHideCw = async (value: string | number | boolean) => {
  await settingsStore.setMisskeyHideCw(!value);
};

const onChangeShowReaction = async (value: string | number | boolean) => {
  await settingsStore.setMisskeyShowReactions(!!value);
};

const onChangeText2Speech = async (value: string | number | boolean) => {
  await settingsStore.setText2SpeechEnabled(!!value);
};
</script>

<template>
  <div class="account-settings" v-if="store.settings">
    <h2 class="dote-field-group-title">設定</h2>
    <div class="dote-field-row indent-1 wrap">
      <div class="content">
        <span class="title"><Icon icon="mingcute:ghost-line" class="nn-icon size-small" /><span>の透明度</span></span>
      </div>
      <div class="actions">
        <ElSlider v-model="store.settings.opacity" :min="0" :max="100" show-input size="small" />
      </div>
    </div>

    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">タイムラインの最大表示数</span>
      </div>
      <div class="form-actions">
        <ElInputNumber
          class="action-field"
          :min="10"
          :max="2000"
          v-model="store.settings.maxPostCount"
          @change="(value) => onChangeMaxPostCount(Number(value))"
          size="small"
        />
      </div>
    </div>

    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">ノートの表示スタイル</span>
      </div>
      <div class="form-actions">
        <ElSelect
          class="action-field"
          :model-value="store.$state.settings.postStyle"
          size="small"
          @change="onChangePostStyle"
        >
          <ElOption
            v-for="option in postStyleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </div>
    </div>

    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">投稿が追加された時に読み上げる</span>
      </div>
      <div class="form-actions">
        <ElSwitch :model-value="store.settings.text2Speech.enabled" @change="onChangeText2Speech" />
      </div>
    </div>

    <!-- Misskey -->

    <h2 class="dote-field-group-title">Misskey</h2>
    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">隠された文字をデフォルトで表示する</span>
      </div>
      <div class="form-actions">
        <label class="nn-checkbox">
          <ElSwitch :model-value="!store.settings.misskey?.hideCw" @change="onChangeHideCw" />
        </label>
      </div>
    </div>
    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">リアクションを表示する</span>
      </div>
      <div class="form-actions">
        <label class="nn-checkbox">
          <ElSwitch :model-value="store.settings.misskey?.showReactions" @change="onChangeShowReaction" />
        </label>
      </div>
    </div>
    <h2 class="dote-field-group-title">グローバルショートカットキー</h2>
    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">ウィンドウを表示/非表示切り替え</span>
      </div>
      <div class="form-actions">
        <input
          id="shortcut"
          class="shortcut-input"
          type="text"
          :value="store.settings.shortcuts.toggleTimeline"
          @keydown.prevent="onKeyDownOnShortcut('toggleTimeline')($event)"
          readonly
          @click="focusShortcutInput"
          ref="shortcutInput"
          placeholder="キーの組み合わせを入力してください"
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

.dote-field-row {
  display: flex;
  border: none;
}

.max-post-count {
  width: 80px;
}
.shortcut-input {
  width: 140px;
  padding: 2px 8px;
  font-size: var(--font-size-14);
  background-color: transparent;
  border: 1px solid var(--dote-color-white-t2);
  border-radius: 4px;
  cursor: pointer;
}
.action-field {
  width: 130px;
}
</style>
