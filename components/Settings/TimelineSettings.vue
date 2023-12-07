<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { Icon } from "@iconify/vue";
import { computed, ref } from "vue";
import type { MisskeyChannel } from "~/types/misskey";
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
    value: "misskey:listTimeline",
  },
  // {
  //   label: "アンテナ...",
  //   value: "misskey:antennaTimeline",
  // },
  {
    label: "チャンネル...",
    value: "misskey:channelTimeline",
  },
  {
    label: "検索...",
    value: "misskey:searchTimeline",
  },
] as const;

const streamOptions = streamList.map((stream) => ({
  label: stream.label,
  value: stream.value,
}));

const followedMisskeyChannels = ref<MisskeyChannel[]>([]);
const misskeyChannelOptions = computed(() =>
  followedMisskeyChannels.value.map((channel) => ({
    label: channel.name,
    value: channel.id,
  })),
);

const selectedUserId = ref(timelineStore.currentUser?.id || "");
const selectedStream = ref<ChannelName>(timelineStore.current?.channel || "misskey:homeTimeline");
const selectedChannelId = ref<string>(timelineStore.current?.options?.channelId || "");

const accountOptions = computed(() =>
  store.users.map((user) => ({
    label:
      user.name +
      "@" +
      store.instances.find((instance) => instance.id === user.instanceId)?.url.replace("https://", ""),
    value: user.id,
  })),
);

const onChangeUser = async (e: InputEvent, timelineId: string) => {
  if (!e) return;
  selectedUserId.value = (e.target as HTMLInputElement).value;

  const timeline = store.timelines.find((timeline) => timeline.id === timelineId);
  if (timeline) {
    await updateTimeline({ ...timeline, userId: selectedUserId.value });
  }
};

const onChangeTimeline = async (e: InputEvent, timelineId: string) => {
  if (!e) return;
  selectedStream.value = (e.target as HTMLInputElement).value as ChannelName;
  const timeline = store.timelines.find((timeline) => timeline.id === timelineId);
  if (timeline) {
    await updateTimeline({ ...timeline, channel: selectedStream.value });
  }
};

const onChangeChannel = async ({ target }: InputEvent, timelineId: string) => {
  const channelId = (target as HTMLInputElement).value;
  const timeline = store.timelines.find((timeline) => timeline.id === timelineId);
  if (timeline) {
    await updateTimeline({
      ...timeline,
      options: {
        channelId,
      },
    });
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

onMounted(async () => {
  followedMisskeyChannels.value = await timelineStore.getFollowedChannels();
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
            @change="onChangeUser($event, timeline.id)"
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
            @change="onChangeTimeline($event, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-2" v-if="timeline.channel === 'misskey:channelTimeline'">
        <div class="content">
          <Icon icon="mingcute:tv-2-line" class="nn-icon size-small" />
          <span class="label">チャンネル</span>
        </div>
        <div class="attachments form-actions">
          <HazySelect
            name="channel"
            :options="misskeyChannelOptions"
            :value="timeline.options?.channelId"
            @change="onChangeChannel($event, timeline.id)"
            placeholder="--"
            class="select"
          />
        </div>
      </div>
      <div class="hazy-post account indent-2" v-if="selectedStream === 'misskey:searchTimeline'">
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
