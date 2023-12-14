<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { Icon } from "@iconify/vue";
import { computed } from "vue";
import type { ChannelName, Timeline } from "~/types/store";
import SectionTitle from "../Post/SectionTitle.vue";
import HazySelect from "../common/HazySelect.vue";

const store = useStore();
const timelineStore = useTimelineStore();

const streamList = [
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
    value: "misskey:list",
  },
  // {
  //   label: "アンテナ...",
  //   value: "misskey:antenna",
  // },
  {
    label: "チャンネル...",
    value: "misskey:channel",
  },
  {
    label: "検索...",
    value: "misskey:search",
  },
] as { label: string; value: ChannelName }[];

const streamOptions = streamList.map((stream) => ({
  label: stream.label,
  value: stream.value,
}));

const accountOptions = computed(() =>
  store.$state.users.map((user) => ({
    label:
      user.name +
      "@" +
      store.instances.find((instance) => instance.id === user.instanceId)?.url.replace("https://", ""),
    value: user.id,
  })),
);

const onChangeTimelineInput = async (newTimeline: Timeline, timelineId: string) => {
  const timeline = getTimelineById(timelineId);
  if (timeline) {
    await updateTimeline(newTimeline);
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

const getTimelineById = (id: string) => {
  return store.timelines.find((timeline) => timeline.id === id);
};

watch(
  () => store.timelines,
  async () => {
    store.timelines.forEach(async (timeline) => {
      timeline.channels = await timelineStore.getFollowedChannels();
      console.log(timeline.channels);
    });
  },
);

onMounted(() => {
  store.timelines.forEach(async (timeline) => {
    timeline.channels = await timelineStore.getFollowedChannels();
    console.log(timeline.channels);
  });
});
</script>

<template>
  <div class="account-settings hazy-post-list" v-if="store.$state.users.length">
    <SectionTitle title="タイムライン" />
    <div class="accounts-container" v-for="timeline in store.timelines" :key="timeline.id">
      <div class="hazy-post account indent-1">
        <div class="content">
          <Icon icon="mingcute:user-1-line" class="nn-icon size-small" />
          <span class="label">アカウント</span>
        </div>
        <div class="attachments form-actions">
          <HazySelect
            name="user"
            :options="accountOptions"
            :value="timeline.userId"
            @change="onChangeTimelineInput({ ...timeline, userId: $event.target.value }, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-1">
        <div class="content">
          <Icon icon="mingcute:list-check-3-line" class="nn-icon size-small" />
          <span class="label">タイムライン</span>
        </div>
        <div class="attachments form-actions">
          <HazySelect
            name="channel"
            :options="streamOptions"
            :value="timeline.channel"
            @change="onChangeTimelineInput({ ...timeline, channel: $event.target.value }, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-2" v-if="timeline.channel === 'misskey:channel'">
        <div class="content">
          <Icon icon="mingcute:tv-2-line" class="nn-icon size-small" />
          <span class="label">チャンネル</span>
        </div>
        <div class="attachments form-actions">
          <HazySelect
            name="channel"
            v-if="timeline.channels.length"
            :options="timeline.channels.map((channel) => ({ label: channel.name, value: channel.id }))"
            :value="timeline.options?.channelId"
            @change="onChangeTimelineInput({ ...timeline, options: { channelId: $event.target.value } }, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-2" v-if="timeline.channel === 'misskey:search'">
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
  display: flex;
  align-items: center;
  color: #fff;
  font-size: var(--font-size-14);

  & > * {
    flex: 0 0 auto;
  }

  .nn-icon + .label {
    margin-left: 4px;
  }
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
.hazy-post {
  border: none;
}
</style>
