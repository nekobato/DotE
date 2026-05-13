<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import TimelineForm from "./TimelineForm.vue";
import type { ChannelName, InstanceType, Timeline } from "@shared/types/store";
import { Icon } from "@iconify/vue";
import { defaultChannelNameFromType } from "@/utils/dote";
import { resolvePlatformIconUrl } from "@/utils/platformIcon";
import { computed, ref } from "vue";
import { useUsersStore } from "@/store/users";
import { useInstanceStore } from "@/store/instance";
import ChannelIcon from "@/components/ChannelIcon.vue";

const appLogoImagePathMap: Record<InstanceType, string> = {
  misskey: resolvePlatformIconUrl("misskey"),
  mastodon: resolvePlatformIconUrl("mastodon"),
  bluesky: resolvePlatformIconUrl("bluesky"),
};

const store = useStore();
const timelineStore = useTimelineStore();
const usersStore = useUsersStore();
const instanceStore = useInstanceStore();
const deleteConfirmingTimelineId = ref<string | null>(null);

const timelineItems = computed(() => {
  return store.timelines.map((timeline) => {
    const instance = instanceStore.findInstanceByUserId(timeline.userId);

    return {
      timeline,
      images: {
        app: instance ? appLogoImagePathMap[instance.type] : "",
        instance: instance?.iconUrl,
        account: usersStore.findUser(timeline.userId)?.avatarUrl,
        channel: timeline.channel as ChannelName,
      },
    };
  });
});

const onUpdateTimeline = async (timeline: Timeline) => {
  await timelineStore.updateTimeline(timeline);
};

const canDeleteTimeline = computed(() => store.timelines.length > 1);

const isDeleteConfirming = (timelineId: string) => deleteConfirmingTimelineId.value === timelineId;

const startDeleteTimeline = (timelineId: string) => {
  if (!canDeleteTimeline.value) return;
  deleteConfirmingTimelineId.value = timelineId;
};

const cancelDeleteTimeline = () => {
  deleteConfirmingTimelineId.value = null;
};

const addTimeline = async () => {
  await timelineStore.createTimeline({
    userId: timelineStore.timelines[0].userId,
    channel: defaultChannelNameFromType(timelineStore.currentInstance?.type),
    options: {},
    updateInterval: 60 * 1000, // 60 sec
    available: false,
  });
};

const onDeleteTimeline = async (timeline: Timeline) => {
  await timelineStore.deleteTimeline(timeline.id);
  deleteConfirmingTimelineId.value = null;
};
</script>

<template>
  <div class="account-settings dote-post-list" v-if="store.$state.users.length">
    <ElDivider class="divider" />
    <h2 class="dote-field-group-title">タイムライン</h2>
    <div class="timeline-list">
      <div v-for="timelineItem in timelineItems" :key="timelineItem.timeline.id">
        <div class="timeline-item">
          <div class="timeline-summary">
            <div class="timeline-images" :class="{ current: timelineItem.timeline.available }">
              <img class="image app" v-if="timelineItem.images.app" :src="timelineItem.images.app" alt="app" />
              <img
                class="image instance"
                v-if="timelineItem.images.instance"
                :src="timelineItem.images.instance"
                alt="instance"
              />
              <img
                class="image user"
                v-if="timelineItem.images.account"
                :src="timelineItem.images.account"
                alt="account"
              />
              <ChannelIcon v-if="timelineItem.images.channel" :channel="timelineItem.images.channel" />
            </div>
            <div class="timeline-delete-actions">
              <button
                class="nn-button size-small type-warning summary-action"
                :disabled="!canDeleteTimeline"
                @click="startDeleteTimeline(timelineItem.timeline.id)"
                v-if="!isDeleteConfirming(timelineItem.timeline.id)"
                title="削除"
              >
                <Icon icon="ion:trash" class="nn-icon" />
              </button>
              <button
                class="nn-button size-small summary-action"
                @click="cancelDeleteTimeline"
                v-if="isDeleteConfirming(timelineItem.timeline.id)"
                title="キャンセル"
              >
                <Icon icon="ion:close" class="nn-icon" />
              </button>
              <button
                class="nn-button size-small type-warning summary-action"
                @click="onDeleteTimeline(timelineItem.timeline)"
                v-if="isDeleteConfirming(timelineItem.timeline.id)"
                title="削除を確定"
              >
                <Icon icon="ion:checkmark-done" class="nn-icon" />
              </button>
            </div>
          </div>
          <div class="delete-confirmation" v-if="isDeleteConfirming(timelineItem.timeline.id)">
            確認：このタイムラインを削除しますか？
          </div>
          <TimelineForm :timeline="timelineItem.timeline" @updateTimeline="onUpdateTimeline" />
        </div>
      </div>
    </div>
    <button class="nn-button size-small add-button" @click="addTimeline">
      <Icon icon="mingcute:add-fill" class="nn-icon" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
}
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px;
}
.timeline-item {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--dote-color-white-t1);
  border-radius: 8px;

  :deep(.accounts-container) {
    border: none;
    border-radius: 0;
  }
}
.timeline-summary {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dote-color-white-t1);
}
.timeline-delete-actions {
  position: absolute;
  right: 8px;
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.summary-action {
  padding: 0 8px;

  > svg {
    width: 16px;
    height: 16px;
  }

  &.type-warning .nn-icon {
    color: currentColor;
    fill: currentColor;
  }
}
.delete-confirmation {
  padding: 8px 16px 0 32px;
  color: var(--color-text-body);
  font-size: var(--font-size-14);
}
.timeline-images {
  display: inline-flex;
  flex: 0 0 160px;
  gap: 12px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 160px;
  min-width: 160px;
  height: 24px;
  overflow: hidden;
  background: var(--dote-color-white-t2);
  border: 1px solid transparent;
  border-radius: 4px;

  &.current {
    box-shadow: 0 0 0 2px var(--dote-color-white-t4);
  }

  .image {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    object-fit: cover;

    &.instance,
    &.user {
      flex-basis: 20px;
      width: 20px;
      height: 20px;
      border-radius: 2px;
    }
  }
}
.add-button {
  display: block;
  margin: 16px 16px 0 auto;
}
</style>
