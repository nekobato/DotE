<script setup lang="ts">
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useGlobalShortcutRecorder } from "@/composables/useGlobalShortcutRecorder";
import { Icon } from "@iconify/vue";
import type { Settings } from "@shared/types/store";
import { ElSlider, ElSwitch, ElInputNumber, ElSelect, ElOption } from "element-plus";
import { onMounted, ref, watch } from "vue";

const store = useStore();
const settingsStore = useSettingsStore();
const shortcutInput = ref<HTMLInputElement | null>(null);
const { inputAttrs, isRecording, isStarting, isSaving, errorMessage, start, cancel, onKeydown } =
  useGlobalShortcutRecorder(
    shortcutInput,
    () => store.settings.shortcuts.toggleTimeline,
    (shortcut) => settingsStore.setShortcutKey("toggleTimeline", shortcut),
  );
const systemFonts = ref<string[]>([]);
const isFontsLoading = ref(false);

watch(
  () => store.settings?.opacity,
  async () => {
    await settingsStore.setOpacity(store.settings?.opacity);
  },
);

/**
 * Persist max post count setting.
 */
const onChangeMaxPostCount = async (value: number) => {
  await settingsStore.setMaxPostCount(value);
};

/**
 * Persist selected font family.
 */
const onChangeFontFamily = async (value: string | number | boolean) => {
  await settingsStore.setFontFamily(String(value ?? ""));
};

/**
 * Fetch installed fonts for selection UI.
 */
const loadSystemFonts = async () => {
  isFontsLoading.value = true;
  systemFonts.value = await settingsStore.fetchSystemFonts();
  isFontsLoading.value = false;
};

onMounted(async () => {
  await loadSystemFonts();
});

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

const themeOptions = [
  {
    label: "ダーク",
    value: "dark",
  },
  {
    label: "ライト",
    value: "light",
  },
];

const notificationMarkAsReadOptions: { label: string; value: Settings["notifications"]["markAsRead"] }[] = [
  {
    label: "手動",
    value: "manual",
  },
  {
    label: "通知タイムラインを開いたら",
    value: "onOpen",
  },
];

const onChangePostStyle = (value: string | number | boolean) => {
  settingsStore.setPostStyle(value as Settings["postStyle"]);
};

/**
 * Persist selected theme in settings.
 */
const onChangeTheme = (value: string | number | boolean) => {
  settingsStore.setTheme(value as Settings["theme"]);
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

/**
 * Persist notification read timing.
 */
const onChangeNotificationMarkAsRead = async (value: string | number | boolean) => {
  await settingsStore.setNotificationMarkAsRead(value as Settings["notifications"]["markAsRead"]);
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
        <span class="title">テーマ</span>
      </div>
      <div class="form-actions">
        <ElSelect class="action-field" :model-value="store.settings.theme" size="small" @change="onChangeTheme">
          <ElOption v-for="option in themeOptions" :key="option.value" :label="option.label" :value="option.value" />
        </ElSelect>
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
        <span class="title">フォント</span>
      </div>
      <div class="form-actions">
        <div class="font-settings">
          <ElSelect
            class="action-field font-field"
            :model-value="store.settings.font.family"
            size="small"
            filterable
            clearable
            :loading="isFontsLoading"
            @change="onChangeFontFamily"
          >
            <ElOption label="システム既定" value="" />
            <ElOption v-for="font in systemFonts" :key="font" :label="font" :value="font" />
          </ElSelect>
          <div
            class="font-preview"
            :style="store.settings.font.family ? { fontFamily: store.settings.font.family } : undefined"
          >
            例: 今日は良いお天気です。The quick brown fox jumps over the lazy dog. 1234567890
          </div>
        </div>
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

    <div class="dote-field-row indent-1">
      <div class="content">
        <span class="title">通知の既読化</span>
      </div>
      <div class="form-actions">
        <ElSelect
          class="action-field notification-read-field"
          :model-value="store.settings.notifications.markAsRead"
          size="small"
          @change="onChangeNotificationMarkAsRead"
        >
          <ElOption
            v-for="option in notificationMarkAsReadOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
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
    <div class="dote-field-row indent-1 wrap">
      <div class="content">
        <label class="title" for="shortcut">ウィンドウを表示/非表示切り替え</label>
      </div>
      <div class="form-actions shortcut-settings">
        <input
          id="shortcut"
          ref="shortcutInput"
          class="shortcut-input"
          type="text"
          v-bind="inputAttrs"
          aria-describedby="shortcut-help shortcut-error"
          :aria-busy="isStarting || isSaving"
          @focus="start"
          @click="start"
          @blur="cancel"
          @keydown.capture="onKeydown"
        />
        <p id="shortcut-help" class="shortcut-help" role="status">
          {{
            isStarting
              ? "入力準備中…"
              : isSaving
                ? "保存中…"
                : isRecording
                  ? "キーの組み合わせを入力してください。"
                  : "クリックして記録を開始します。"
          }}
          Escapeで取消、Backspace / Deleteで解除できます。
        </p>
        <p v-if="errorMessage" id="shortcut-error" class="shortcut-help" role="alert">{{ errorMessage }}</p>
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

.font-settings {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.font-preview {
  color: var(--color-text-body);
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.8;
}

.dote-field-row {
  display: flex;
  border: none;
}

.max-post-count {
  width: 80px;
}
.shortcut-settings {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.shortcut-help {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
.shortcut-input {
  box-sizing: border-box;
  width: min(100%, 240px);
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
.font-field {
  width: 220px;
}
.notification-read-field {
  width: 190px;
}
</style>
