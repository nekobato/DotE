<script setup lang="ts">
import router from "@/router";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { ElTooltip } from "element-plus";
import { storeToRefs } from "pinia";
import { useUsersStore } from "@/store/users";
import { useInstanceStore } from "@/store/instance";
import { onClickOutside } from "@vueuse/core";
import ChannelIcon from "./ChannelIcon.vue";
import { useStore } from "@/store";
import { mastodonChannelsMap } from "@/utils/mastodon";
import { misskeyChannelsMap } from "@/utils/misskey";
import { blueskyChannelsMap } from "@/utils/bluesky";
import { webSocketState } from "@/utils/misskeyStream";
import {
  useMisskeyTimelineConnectionStore,
  type MisskeyTimelineWebSocketState,
} from "@/store/misskeyTimelineConnection";
import { BlueskyChannelName, MastodonChannelName, MisskeyChannelName } from "@shared/types/store";

const appLogoImagePathMap = {
  misskey: "/images/icons/misskey.png",
  mastodon: "/images/icons/mastodon.png",
  bluesky: "/images/icons/bluesky.png",
};

const store = useStore();
const timelineStore = useTimelineStore();
const usersStore = useUsersStore();
const instanceStore = useInstanceStore();
const misskeyTimelineConnectionStore = useMisskeyTimelineConnectionStore();
const { connectionType, webSocketStatus, nextPollingAt } = storeToRefs(misskeyTimelineConnectionStore);

const webSocketStatusViewMap: Record<
  MisskeyTimelineWebSocketState,
  {
    className: string;
    icon: string;
    title: string;
  }
> = {
  [webSocketState.CONNECTING]: {
    className: "is-connecting",
    icon: "mingcute:heartbeat-line",
    title: "WebSocket 接続確認中",
  },
  [webSocketState.OPEN]: {
    className: "is-open",
    icon: "mingcute:heartbeat-line",
    title: "WebSocket 接続中",
  },
  [webSocketState.CLOSING]: {
    className: "is-closing",
    icon: "mingcute:heartbeat-line",
    title: "WebSocket 切断中",
  },
  [webSocketState.CLOSED]: {
    className: "is-closed",
    icon: "mingcute:heartbeat-line",
    title: "WebSocket 未接続",
  },
};

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
    app: timelineStore.currentInstance ? appLogoImagePathMap[timelineStore.currentInstance.type] : "",
    instance: timelineStore.currentInstance?.iconUrl,
    account: timelineStore.currentUser?.avatarUrl,
    channel: timelineStore.current?.channel,
  };
});

const timelineWithImages = computed(() => {
  return store.$state.timelines.map((timeline) => {
    const instance = instanceStore.findInstanceByUserId(timeline.userId);
    return {
      ...timeline,
      images: {
        app: instance ? appLogoImagePathMap[instance.type] : "",
        instance: instance?.iconUrl,
        account: usersStore.findUser(timeline.userId)?.avatarUrl,
        channel: timeline.channel,
      },
    };
  });
});

const currentEmojis = computed(() => {
  if (timelineStore.currentInstance?.type !== "misskey") return [];
  return timelineStore.currentInstance.misskey?.emojis || [];
});

const now = ref(Date.now());
const nextUpdateAt = ref<number | null>(null);
let countdownTimer: number | undefined;

const isCurrentMisskeyTimeline = computed(() => timelineStore.currentInstance?.type === "misskey");
const shouldShowMisskeyWebSocketStatus = computed(
  () => isCurrentMisskeyTimeline.value && connectionType.value === "websocket",
);
const shouldShowMisskeyPollingCountdown = computed(
  () => isCurrentMisskeyTimeline.value && connectionType.value === "polling" && nextPollingAt.value !== null,
);
const shouldShowLocalUpdateCountdown = computed(() => {
  const type = timelineStore.currentInstance?.type;
  const channel = timelineStore.current?.channel;
  const interval = timelineStore.current?.updateInterval ?? 0;
  if (!interval) return false;
  if (type === "misskey") return false;
  if (type === "bluesky") return true;
  if (type === "mastodon" && channel !== "mastodon:notifications") return true;
  return false;
});

const syncCountdown = () => {
  if (!shouldShowLocalUpdateCountdown.value || !timelineStore.current?.updateInterval) {
    nextUpdateAt.value = null;
    return;
  }

  nextUpdateAt.value = Date.now() + timelineStore.current.updateInterval;
};

const tickCountdown = () => {
  now.value = Date.now();
  const interval = timelineStore.current?.updateInterval ?? 0;
  if (!shouldShowLocalUpdateCountdown.value || !interval || nextUpdateAt.value === null) {
    return;
  }

  while (nextUpdateAt.value <= now.value) {
    nextUpdateAt.value += interval;
  }
};

const countdownTargetAt = computed(() => {
  if (shouldShowMisskeyPollingCountdown.value) return nextPollingAt.value;
  if (shouldShowLocalUpdateCountdown.value) return nextUpdateAt.value;
  return null;
});

const updateCountdownLabel = computed(() => {
  const targetAt = countdownTargetAt.value;
  if (targetAt === null) return "";

  const remainingSeconds = Math.max(0, Math.ceil((targetAt - now.value) / 1000));
  return `${remainingSeconds}`;
});

const webSocketStatusView = computed(
  () => webSocketStatusViewMap[webSocketStatus.value] ?? webSocketStatusViewMap[webSocketState.CLOSED],
);

const toggleMenu = () => {
  isDetailVisible.value = !isDetailVisible.value;
};

const haze = () => {
  toggleMenu();
  ipcSend("set-mode", { mode: "haze" });
};

const post = () => {
  toggleMenu();
  ipcSend("post:create", {
    emojis: currentEmojis.value,
  });
};

const reload = () => {
  toggleMenu();
  ipcSend("main:reload");
};

const settings = () => {
  toggleMenu();
  router.push("/main/settings");
};

type HeaderActionButton = {
  className: string;
  icon: string;
  title: string;
  onClick: () => void;
};

const headerActionButtons: HeaderActionButton[] = [
  {
    className: "haze",
    icon: "mingcute:ghost-line",
    title: "ウィンドウ透過モード",
    onClick: haze,
  },
  {
    className: "post",
    icon: "mingcute:pencil-line",
    title: "投稿",
    onClick: post,
  },
  {
    className: "refresh",
    icon: "mingcute:refresh-1-line",
    title: "リロード",
    onClick: reload,
  },
  {
    className: "settings",
    icon: "mingcute:settings-3-line",
    title: "設定",
    onClick: settings,
  },
];

const changeTimeline = async (index: number) => {
  await timelineStore.changeActiveTimeline(index);
  toggleMenu();
};

const getChannelLabel = (channel: MisskeyChannelName | MastodonChannelName | BlueskyChannelName) => {
  const allChannelNameMap = { ...mastodonChannelsMap, ...misskeyChannelsMap, ...blueskyChannelsMap };

  return allChannelNameMap[channel] || channel;
};

watch(
  () =>
    [
      timelineStore.current?.id,
      timelineStore.current?.channel,
      timelineStore.current?.updateInterval,
      timelineStore.currentInstance?.type,
    ] as const,
  () => {
    syncCountdown();
    tickCountdown();
  },
  { immediate: true },
);

onMounted(() => {
  countdownTimer = window.setInterval(() => {
    tickCountdown();
  }, 1000);
});

onBeforeUnmount(() => {
  if (!countdownTimer) return;
  window.clearInterval(countdownTimer);
});
</script>

<template>
  <div class="header">
    <div class="summary" :class="{ detailed: isDetailVisible }">
      <div
        class="timeline-images open-button"
        :class="{ open: isDetailVisible }"
        @click="toggleMenu"
        ref="toggleButtonRef"
      >
        <img class="image app" v-if="currentTimelineImages.app" :src="currentTimelineImages.app" alt="app" />
        <img
          class="image instance"
          v-if="currentTimelineImages.instance"
          :src="currentTimelineImages.instance"
          alt="instance"
        />
        <img
          class="image user"
          v-if="currentTimelineImages.account"
          :src="currentTimelineImages.account"
          alt="account"
        />
        <ChannelIcon v-if="currentTimelineImages.channel" :channel="currentTimelineImages.channel" />
      </div>
    </div>
    <div
      class="connection-status websocket-status"
      v-if="shouldShowMisskeyWebSocketStatus"
      :class="webSocketStatusView.className"
      :title="webSocketStatusView.title"
      :aria-label="webSocketStatusView.title"
    >
      <Icon :icon="webSocketStatusView.icon" class="nn-icon size-xsmall" />
    </div>
    <div class="connection-status update-countdown" v-else-if="updateCountdownLabel" title="次回更新まで">
      <span>{{ updateCountdownLabel }}</span>
    </div>
    <div class="detail" v-if="isDetailVisible" ref="detailRef">
      <div class="action-group">
        <ElTooltip
          v-for="actionButton in headerActionButtons"
          :key="actionButton.className"
          :content="actionButton.title"
          placement="bottom"
          :show-after="200"
        >
          <button
            class="nn-button type-ghost"
            :class="actionButton.className"
            @click="actionButton.onClick"
            :title="actionButton.title"
          >
            <Icon :icon="actionButton.icon" class="nn-icon size-xsmall" />
          </button>
        </ElTooltip>
      </div>
      <div class="timeline-list">
        <div class="timeline-item" v-for="(timeline, index) in timelineWithImages" @click="changeTimeline(index)">
          <div
            class="timeline-images"
            :class="{
              current: timeline.id === timelineStore.current?.id,
            }"
          >
            <img class="image app" v-if="timeline.images.app" :src="timeline.images.app" alt="app" />
            <img
              class="image instance"
              v-if="timeline.images.instance"
              :src="timeline.images.instance"
              alt="instance"
            />
            <img class="image user" v-if="timeline.images.account" :src="timeline.images.account" alt="account" />
            <ChannelIcon v-if="timeline.images.channel" :channel="timeline.images.channel" />
          </div>
          <div class="timeline-title">
            <div class="account">
              <span class="nickname">{{ usersStore.findUser(timeline.userId)?.name }}</span>
              <span class="instance"
                >@{{ instanceStore.findInstanceByUserId(timeline.userId)?.url?.replace("https://", "") }}</span
              >
            </div>
            <div class="stream">{{ getChannelLabel(timeline.channel) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  background-color: var(--dote-background-color);
  border: 1px solid var(--dote-border-color);
  -webkit-app-region: drag;
}
.connection-status {
  position: absolute;
  top: 10px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  -webkit-app-region: no-drag;
}
.websocket-status {
  color: var(--color-text-caption);
  line-height: 1;

  &.is-open {
    color: var(--dote-color-success);
  }

  &.is-connecting,
  &.is-closing {
    color: var(--dote-color-warning);
  }

  &.is-closed {
    color: var(--dote-color-error);
  }

  .nn-icon {
    fill: currentColor;
  }
}
.update-countdown {
  color: var(--color-text-caption);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
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

    &.open * {
      visibility: hidden;
    }
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 7px 0 9px; /* for appearance */
  -webkit-app-region: no-drag;

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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  background-color: var(--dote-background-color);
  border-bottom: 1px solid var(--dote-border-color);
  box-shadow:
    rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
    rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
  -webkit-app-region: no-drag;
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
