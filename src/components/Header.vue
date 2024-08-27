<script setup lang="ts">
import router from "@/router";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useUsersStore } from "@/store/users";
import { useInstanceStore } from "@/store/instance";
import { onClickOutside } from "@vueuse/core";
import ChannelIcon from "./ChannelIcon.vue";
import { useStore } from "@/store";

const appLogoImagePathMap = {
  misskey: "/images/icons/misskey.png",
  mastodon: "/images/icons/mastodon.png",
};

const store = useStore();
const { currentInstance, currentUser, current } = useTimelineStore();
const { findUser } = useUsersStore();
const { findInstanceByUserId } = useInstanceStore();

const isDetailVisible = ref(false);
const detailRef = ref(null);
const toggleButtonRef = ref(null);

onClickOutside(
  detailRef,
  () => {
    isDetailVisible.value = false;
  },
  {
    ignore: [toggleButtonRef],
  },
);

const currentTimelineImages = computed(() => {
  return {
    app: currentInstance ? appLogoImagePathMap[currentInstance.type] : "",
    instance: currentInstance?.iconUrl,
    account: currentUser?.avatarUrl,
    channel: current?.channel,
  };
});

const timelineWithImages = computed(() => {
  console.log("### timelines", store.$state.timelines);
  return store.$state.timelines.map((timeline) => {
    const instance = findInstanceByUserId(timeline.userId);
    return {
      ...timeline,
      images: {
        app: instance ? appLogoImagePathMap[instance.type] : "",
        instance: instance?.iconUrl,
        account: findUser(timeline.userId)?.avatarUrl,
        channel: timeline.channel,
      },
    };
  });
});

const toggleMenu = () => {
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

const changeTimeline = (_: any) => {
  isDetailVisible.value = false;
};
</script>

<template>
  <div class="header">
    <div class="summary" :class="{ detailed: isDetailVisible }">
      <div class="timeline-images open-button" @click="toggleMenu" ref="toggleButtonRef">
        <img class="image app" :src="currentTimelineImages.app" alt="app" />
        <img class="image instance" :src="currentTimelineImages.instance" alt="instance" />
        <img class="image user" :src="currentTimelineImages.account" alt="account" />
        <ChannelIcon :channel="currentTimelineImages.channel" />
      </div>
    </div>
    <div class="detail" v-if="isDetailVisible" ref="detailRef">
      <div class="action-group">
        <button class="nn-button type-ghost haze" @click="haze" title="ウィンドウ透過モード">
          <Icon icon="mingcute:ghost-line" class="nn-icon size-xsmall" />
        </button>
        <button class="nn-button type-ghost post" @click="post" title="投稿">
          <Icon icon="mingcute:pencil-line" class="nn-icon size-xsmall" />
        </button>
        <button class="nn-button type-ghost refresh" @click="reload" title="リロード">
          <Icon icon="mingcute:refresh-1-line" class="nn-icon size-xsmall" />
        </button>
        <button class="nn-button type-ghost settings" @click="settings" title="設定">
          <Icon icon="mingcute:settings-3-line" class="nn-icon size-xsmall" />
        </button>
      </div>
      <div class="timeline-list">
        <div class="timeline-item" v-for="timeline in timelineWithImages" @click="changeTimeline">
          <div
            class="timeline-images"
            :class="{
              current: timeline.id === current?.id,
            }"
          >
            <img class="image app" :class="currentInstance?.type" :src="timeline.images.app" alt="app" />
            <img class="image instance" :src="timeline.images.instance" alt="instance" />
            <img class="image user" :src="timeline.images.account" alt="account" />
            <ChannelIcon :channel="timeline.images.channel" />
          </div>
          <div class="timeline-title">
            <div class="account">
              <span class="nickname">{{ findUser(timeline.userId)?.name }}</span>
              <span class="instance">@{{ findInstanceByUserId(timeline.userId)?.url?.replace("https://", "") }}</span>
            </div>
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
  z-index: 1000;
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

  &.current {
    box-shadow: 0 0 0 2px var(--dote-color-white-t4);
  }

  &.open-button {
    cursor: pointer;
  }

  .image {
    width: 24px;
    height: 24px;

    &.instance,
    &.user {
      width: 20px;
      height: 20px;
      border-radius: 2px;
    }
  }
}
.summary {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 0;
  box-shadow:
    rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
    rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;

  &.detailed {
    box-shadow: none;
  }
  .timeline-images {
    margin: 0 auto;
  }
}
.detail {
  position: absolute;
  top: 39px;
  left: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  /* height: 200px; */
  background-color: var(--dote-background-color);
  border-bottom: 1px solid var(--dote-border-color);
  box-shadow:
    rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
    rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
}
.action-group {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 4px;
  .haze {
    margin: auto auto auto 0;
  }
  .post {
    position: absolute;
    top: 8px;
    right: 0;
    left: 0;
    width: 80px;
    margin: 0 auto;
  }
}
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 8px 4px;
}
.timeline-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 40px;
  padding: 8px;
  background-color: var(--dote-background-color);
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: var(--dote-color-white-t1);
  }
  .timeline-title {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-left: 8px;
    .account {
      color: var(--dote-color-white);
      font-weight: bold;
      font-size: 14px;
      line-height: 1;
    }
    .stream {
      margin-left: 4px;
      color: var(--dote-color-white);
      font-weight: bold;
      font-size: 12px;
      line-height: 1;
    }
  }
}
</style>
