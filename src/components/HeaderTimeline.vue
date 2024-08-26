<script setup lang="ts">
import router from "@/router";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";

const { timelines, currentInstance, currentUser } = useTimelineStore();

const isDetailVisible = ref(false);

const timelineImages = computed(() => {
  return {
    app: "",
    instance: currentInstance?.iconUrl,
    account: currentUser?.avatarUrl,
    timeline: "",
  };
});

const openMenu = () => {
  isDetailVisible.value = !isDetailVisible.value;
};

const haze = () => {
  ipcSend("set-mode", { mode: "haze" });
};

const post = () => {
  ipcSend("post:create");
};

const reload = () => {
  ipcSend("main:reload");
};

const settings = () => {
  router.push("/main/settings");
};
</script>

<template>
  <div class="header">
    <div class="summary">
      <div class="timeline-images open-button" @click="openMenu">
        <img class="image" :src="timelineImages.app" alt="app" />
        <img class="image" :src="timelineImages.instance" alt="server" />
        <img class="image" :src="timelineImages.account" alt="account" />
        <img class="image" :src="timelineImages.timeline" alt="timeline" />
      </div>
    </div>
    <div class="detail" v-if="isDetailVisible">
      <div class="action-group">
        <button class="nn-button type-ghost haze" @click="haze" title="ウィンドウ透過モード">
          <Icon icon="mingcute:ghost-line" class="nn-icon size-xsmall" />
        </button>
        <button class="nn-button type-ghost post" @click="post" title="投稿">
          <Icon icon="mingcute:pencil-line" class="nn-icon size-xsmall" />
        </button>
        <div class="rest"></div>
        <button class="nn-button type-ghost refresh" @click="reload" title="リロード">
          <Icon icon="mingcute:refresh-1-line" class="nn-icon size-xsmall" />
        </button>
        <button class="nn-button type-ghost settings" @click="settings" title="設定">
          <Icon icon="mingcute:settings-3-line" class="nn-icon size-xsmall" />
        </button>
      </div>
      <div class="timeline-list">
        <div class="timeline-item" v-for="timeline in timelines">
          <div class="timeline-images">
            <img class="image" :src="timelineImages.app" alt="app" />
            <img class="image" :src="timelineImages.instance" alt="server" />
            <img class="image" :src="timelineImages.account" alt="account" />
            <img class="image" :src="timelineImages.timeline" alt="timeline" />
          </div>
          <div class="timeline-title">
            <div class="account">account@instance.domain</div>
            <div class="stream">グローバル</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header {
  position: relative;
  z-index: 1;
  height: 40px;
  background-color: var(--dote-background-color);
  border: 1px solid var(--dote-border-color);
}
.timeline-images {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 24px;
  overflow: hidden;
  background: var(--dote-color-white-t2);
  border: var(--dote-color-white);
  border-radius: 4px;

  &.open-button {
    cursor: pointer;
  }

  .image {
    width: 24px;
    height: 24px;
  }
}
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 0;
  .timeline-images {
    margin: 0 auto;
  }
}
.detail {
  position: absolute;
  top: 40px;
  left: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 200px;
  background-color: var(--dote-background-color);
}
.action-group {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  padding: 8px 4px;
  .haze {
    margin: auto auto auto 0;
  }
  .post {
    position: absolute;
    top: 8px;
    right: 0;
    left: 0;
    width: 64px;
    margin: 0 auto;
  }
}
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 16px;
  padding: 0 16px;
}
.timeline-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 40px;
  padding: 8px;
  background-color: var(--dote-background-color);
  border-radius: 8px;
  &:hover {
    background-color: var(--dote-color-white-t1);
  }
  .timeline-title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    margin-left: 8px;
    .account {
      color: var(--dote-color-white);
      font-weight: bold;
      font-size: 16px;
      line-height: 1;
    }
    .stream {
      margin-top: 4px;
      color: var(--dote-color-white);
      font-weight: bold;
      font-size: 14px;
      line-height: 1;
    }
  }
}
</style>
