<script setup lang="ts">
import { information } from "@/store/information";
import { ipcInvoke } from "@/utils/ipc";
import { ElButton, ElProgress } from "element-plus";
import type { AutoUpdateState } from "@shared/types/update";
import { computed, onMounted, onUnmounted, ref } from "vue";

const autoUpdateState = ref<AutoUpdateState>({
  status: "idle",
  currentVersion: information.version,
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: null,
  bytesPerSecond: null,
  transferredBytes: null,
  totalBytes: null,
  checkedAt: null,
  releaseDate: null,
  releaseName: null,
  releaseNotes: null,
  errorMessage: null,
});
const isChecking = ref(false);
const isInstalling = ref(false);

/**
 * Pull the latest auto update state from the main process.
 */
const syncAutoUpdateState = async () => {
  autoUpdateState.value = await ipcInvoke("app:update:get-state");
};

/**
 * Request a new update check.
 */
const checkForUpdates = async () => {
  isChecking.value = true;

  try {
    autoUpdateState.value = await ipcInvoke("app:update:check");
  } finally {
    isChecking.value = false;
  }
};

/**
 * Restart the app and apply the downloaded update.
 */
const installUpdate = async () => {
  isInstalling.value = true;

  try {
    autoUpdateState.value = await ipcInvoke("app:update:install");
  } finally {
    isInstalling.value = false;
  }
};

const statusLabel = computed(() => {
  const labelMap: Record<AutoUpdateState["status"], string> = {
    idle: "未確認",
    checking: "確認中",
    available: "更新があります",
    "not-available": "最新です",
    downloading: "ダウンロード中",
    downloaded: "適用できます",
    error: "エラー",
    disabled: "利用できません",
  };

  return labelMap[autoUpdateState.value.status];
});

const statusClass = computed(() => `is-${autoUpdateState.value.status}`);

const latestVersion = computed(() => autoUpdateState.value.downloadedVersion ?? autoUpdateState.value.availableVersion);

const checkedAtLabel = computed(() => {
  if (!autoUpdateState.value.checkedAt) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(autoUpdateState.value.checkedAt));
});

const progressLabel = computed(() => {
  const percent = autoUpdateState.value.progressPercent;

  if (percent === null) {
    return "";
  }

  const bytesToMiB = (bytes: number | null) => (bytes === null ? null : bytes / (1024 * 1024));
  const transferredMiB = bytesToMiB(autoUpdateState.value.transferredBytes);
  const totalMiB = bytesToMiB(autoUpdateState.value.totalBytes);

  if (transferredMiB === null || totalMiB === null) {
    return `${percent.toFixed(0)}%`;
  }

  return `${percent.toFixed(0)}% (${transferredMiB.toFixed(1)} / ${totalMiB.toFixed(1)} MiB)`;
});

const canCheckForUpdates = computed(() => {
  return !["checking", "available", "downloading", "downloaded"].includes(autoUpdateState.value.status);
});

const canInstallUpdate = computed(() => autoUpdateState.value.status === "downloaded");

let disposeAutoUpdateListener: (() => void) | undefined;

onMounted(async () => {
  await syncAutoUpdateState();
  disposeAutoUpdateListener = window.ipc?.on("app:update-state", (_, nextState: AutoUpdateState) => {
    autoUpdateState.value = nextState;
  });
});

onUnmounted(() => {
  disposeAutoUpdateListener?.();
});
</script>

<template>
  <div class="information dote-post-list">
    <h2 class="dote-field-group-title">その他</h2>

    <div class="dote-field-row indent-1">
      <div class="content">バージョン</div>
      <div class="form-actions">
        <span>{{ information.version }}</span>
      </div>
    </div>

    <div class="dote-field-row indent-1">
      <div class="content">更新状態</div>
      <div class="form-actions status-actions">
        <span class="status-badge" :class="statusClass">{{ statusLabel }}</span>
        <span v-if="checkedAtLabel" class="help-text">{{ checkedAtLabel }}</span>
      </div>
    </div>

    <div v-if="latestVersion" class="dote-field-row indent-1">
      <div class="content">新しいバージョン</div>
      <div class="form-actions">
        <span>{{ latestVersion }}</span>
      </div>
    </div>

    <div v-if="autoUpdateState.progressPercent !== null" class="dote-field-row indent-1 wrap">
      <div class="content">ダウンロード</div>
      <div class="form-actions progress-actions">
        <ElProgress
          :percentage="Math.round(autoUpdateState.progressPercent ?? 0)"
          :stroke-width="8"
          :show-text="false"
        />
        <span class="help-text">{{ progressLabel }}</span>
      </div>
    </div>

    <div v-if="autoUpdateState.errorMessage" class="dote-field-row indent-1 wrap">
      <div class="content">更新メッセージ</div>
      <div class="form-actions status-actions">
        <span class="error-text">{{ autoUpdateState.errorMessage }}</span>
      </div>
    </div>

    <div class="dote-field-row indent-1 wrap">
      <div class="content">更新操作</div>
      <div class="form-actions button-actions">
        <ElButton size="small" :loading="isChecking" :disabled="!canCheckForUpdates" @click="checkForUpdates">
          更新を確認
        </ElButton>
        <ElButton
          size="small"
          type="primary"
          :loading="isInstalling"
          :disabled="!canInstallUpdate"
          @click="installUpdate"
        >
          再起動して適用
        </ElButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.information {
  width: 100%;
  padding-bottom: 24px;
}

.content {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  color: var(--color-text-body);
  font-size: var(--font-size-14);
  .title {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-body);
  }
}
.form-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  color: var(--color-text-body);
  font-size: var(--font-size-16);
}
.dote-post {
  display: flex;
  border: none;
}

.status-actions,
.progress-actions {
  width: min(280px, 100%);
}

.button-actions {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-badge {
  padding: 2px 8px;
  border: 1px solid var(--dote-border-color);
  border-radius: 6px;
  color: var(--color-text-body);
  font-size: var(--font-size-12);
  line-height: 1.5;
}

.status-badge.is-not-available,
.status-badge.is-downloaded {
  color: var(--color-text-link);
  border-color: var(--color-text-link);
}

.status-badge.is-error,
.status-badge.is-disabled {
  color: var(--color-text-notice);
  border-color: var(--color-text-notice);
}

.status-badge.is-checking,
.status-badge.is-downloading,
.status-badge.is-available {
  color: var(--color-text-body);
}

.help-text,
.error-text {
  color: var(--color-text-description);
  font-size: var(--font-size-12);
  text-align: right;
  word-break: break-word;
}

.error-text {
  color: var(--color-text-notice);
}
</style>
