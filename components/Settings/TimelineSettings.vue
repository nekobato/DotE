<script setup lang="ts">
import { TimelineStore, useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import SectionTitle from "../Post/SectionTitle.vue";
import HazySelect from "../common/HazySelect.vue";
import { ChannelName, Timeline } from "~/types/store";

const channelList = [
  {
    label: "ホーム",
    value: "misskey:homeTimeline",
  },
  {
    label: "ローカル",
    value: "misskey:localTimeline",
  },
  {
    label: "ソーシャル",
    value: "misskey:socialTimeline",
  },
  {
    label: "グローバル",
    value: "misskey:globalTimeline",
  },
  {
    label: "リスト...",
    value: "misskey:listTimeline",
  },
  {
    label: "アンテナ...",
    value: "misskey:antennaTimeline",
  },
  {
    label: "チャンネル...",
    value: "misskey:channelTimeline",
  },
] as const;

const store = useStore();
const timelineStore = useTimelineStore();

const selectedUserId = ref(timelineStore.currentUser?.id || "");
const selectedChannel = ref<ChannelName>(timelineStore.current?.channel || "misskey:homeTimeline");

const accountOptions = computed(() =>
  store.users.map((user) => ({
    label:
      user.name +
      "@" +
      store.instances.find((instance) => instance.id === user.instanceId)?.url.replace("https://", ""),
    value: user.id,
  })),
);

const timelineOptions = channelList.map((channel) => ({
  label: channel.label,
  value: channel.value,
}));

const onChangeUser = async (e: InputEvent, timelineId: string) => {
  if (!e) return;
  selectedUserId.value = (e.target as HTMLInputElement).value;

  const timeline = store.timelines.find((timeline) => timeline.id === timelineId);
  if (timeline) {
    await updateTimeline({ ...timeline, userId: selectedUserId.value });
  }
};

const onChangeChannel = async (e: InputEvent, timelineId: string) => {
  if (!e) return;
  selectedChannel.value = (e.target as HTMLInputElement).value as ChannelName;
  const timeline = store.timelines.find((timeline) => timeline.id === timelineId);
  if (timeline) {
    await updateTimeline({ ...timeline, channel: selectedChannel.value });
  }
};

const updateTimeline = async (timeline: Timeline) => {
  await timelineStore.updateTimeline({
    id: timeline.id,
    userId: timeline.userId,
    channel: timeline?.channel,
    options: timeline?.options,
    available: timeline?.available,
  });
};
</script>

<template>
  <div class="account-settings hazy-post-list" v-if="store.$state.users.length">
    <SectionTitle title="タイムライン" />
    <div class="accounts-container" v-for="timeline in store.timelines" :key="timeline.id">
      <div class="hazy-post account indent-1">
        <div class="content">
          <span class="label">アカウント</span>
        </div>
        <div class="attachments form-actions">
          <HazySelect
            name="user"
            :options="accountOptions"
            :value="timeline.userId"
            @change="onChangeUser($event, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-1">
        <div class="content">
          <span class="label">チャンネル</span>
        </div>
        <div class="attachments form-actions">
          <HazySelect
            name="channel"
            :options="timelineOptions"
            :value="timeline.channel"
            @change="onChangeChannel($event, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-1" v-if="false">
        <div class="content">
          <span class="label">検索</span>
        </div>
        <div class="attachments form-actions">
          <input class="nn-text-field" type="search" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
}
.account {
  display: flex;
  gap: 8px;
  align-items: center;
}
.content {
  color: #fff;
  font-size: var(--font-size-14);
}
.action {
  > svg {
    width: 16px;
    height: 16px;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.4);
  }
}
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  > button {
    flex: 0 0 auto;
  }
}
.form-actions {
  width: 200px;
  .select {
    width: 100%;
  }
}
</style>
