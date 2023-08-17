<script setup lang="ts">
import { onMounted, ref } from "vue";
import SectionTitle from "../Post/SectionTitle.vue";
import { ElSelect, ElOption } from "element-plus";
import { useUsersStore } from "@/store/users";
import { useTimelineStore, TimelineSetting, Timeline, ChannelName } from "@/store/timeline";
import { useSettingsStore } from "@/store/settings";

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

const usersStore = useUsersStore();
const timelineStore = useTimelineStore();

const timelineSettings = ref<TimelineSetting[]>([]);

const onChangeUser = async (userId: number, timelineId: number) => {
  const newTimeline = timelineStore.timelines.find((timeline) => timeline.id === timelineId);
  if (newTimeline) {
    updateTimeline({ ...newTimeline, userId });
  }
};

const onChangeChannel = async (channel: ChannelName, timelineId: number) => {
  const newTimeline = timelineStore.timelines.find((timeline) => timeline.id === timelineId);
  if (newTimeline) {
    updateTimeline({ ...newTimeline, channel });
  }
};

const updateTimeline = async (timeline: Timeline) => {
  await timelineStore.setTimeline({
    id: timeline.id,
    userId: timeline.userId,
    channel: timeline?.channel || "misskey:homeTimeline",
    options: timeline?.options || {},
  });
};

onMounted(async () => {
  await timelineStore.init();
  await usersStore.init();

  if (timelineStore.$state.timelines.length === 0 && usersStore.$state.length !== 0) {
    await timelineStore.addTimeline({
      userId: usersStore.$state[0].id,
      channel: "misskey:homeTimeline",
      options: {},
    });
  }

  timelineSettings.value.push(
    ...timelineStore.timelines.map((timeline) => {
      console.log(timeline);
      return {
        id: timeline.id,
        userId: timeline.userId,
        channel: timeline.channel,
        options: timeline.options,
      };
    }),
  );
});
</script>

<template>
  <div class="account-settings hazy-post-list" v-if="timelineStore.timelines.length !== 0">
    <SectionTitle title="タイムライン" />
    <div class="accounts-container" v-for="timeline in timelineSettings" :key="timeline.id">
      <div class="hazy-post account indent-1">
        <div class="content">
          <span class="label">アカウント</span>
        </div>
        <div class="attachments form-actions">
          <ElSelect v-model="timeline.userId" size="small">
            <ElOption
              v-for="user in usersStore.$state"
              :key="user.id"
              :label="`${user.name}@${user.instanceUrl.replace('https://', '')}`"
              :value="user.id"
              @change="onChangeUser(user.id, timeline.id)"
            />
          </ElSelect>
        </div>
      </div>
      <div class="hazy-post account indent-1">
        <div class="content">
          <span class="label">チャンネル</span>
        </div>
        <div class="attachments form-actions">
          <ElSelect v-model="timeline.channel" size="small">
            <ElOption
              v-for="channel in channelList"
              :key="channel.value"
              :label="channel.label"
              :value="channel.value"
              @change="onChangeChannel(channel.value, timeline.id)"
            />
          </ElSelect>
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
.hazy-post {
  &.indent-1 {
    padding-left: 16px;
  }
}
</style>
