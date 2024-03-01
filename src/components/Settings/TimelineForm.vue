<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { Icon } from "@iconify/vue";
import { computed, onMounted, ref, watch } from "vue";
import type { MisskeyChannel, MisskeyEntities } from "@shared/types/misskey";
import type { ChannelName, Timeline } from "@shared/types/store";
import HazySelect from "../common/HazySelect.vue";

const props = defineProps<{
  timeline: Timeline;
}>();

const emit = defineEmits<{
  updateTimeline: [Timeline];
}>();

const store = useStore();
const timelineStore = useTimelineStore();

const streamOptions: {
  label: string;
  value: ChannelName;
}[] = [
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
  {
    label: "アンテナ...",
    value: "misskey:antenna",
  },
  {
    label: "チャンネル...",
    value: "misskey:channel",
  },
  {
    label: "検索...",
    value: "misskey:search",
  },
];

const followedMisskeyChannels = ref<MisskeyChannel[]>([]);
const myMisskeyAntennas = ref<MisskeyEntities.Antenna[]>([]);
const searchQuery = ref(props.timeline.options?.query ?? "");
const misskeyChannelOptions = computed(() =>
  followedMisskeyChannels.value?.length > 0
    ? followedMisskeyChannels.value.map((channel) => ({
        label: channel.name,
        value: channel.id,
      }))
    : [],
);
const misskeyAntennaOptions = computed(
  () =>
    myMisskeyAntennas.value?.map((antenna) => ({
      label: antenna.name,
      value: antenna.id,
    })) || [],
);

const accountOptions = computed(() =>
  store.users.map((user) => ({
    label:
      user.name +
      "@" +
      store.instances.find((instance) => instance.id === user.instanceId)?.url.replace("https://", ""),
    value: user.id,
  })),
);

const onChangeUser = async (e: InputEvent) => {
  const userId = (e.target as HTMLInputElement).value;

  emit("updateTimeline", {
    ...props.timeline,
    userId,
    options: {},
  });
};

const onChangeStream = async (e: InputEvent) => {
  const stream = (e.target as HTMLInputElement).value as ChannelName;

  emit("updateTimeline", {
    ...props.timeline,
    channel: stream,
    options: {},
  });
};

const onChangeChannel = async ({ target }: InputEvent) => {
  const channelId = (target as HTMLInputElement).value;
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      channelId,
    },
  });
};

const onChangeAntenna = async ({ target }: InputEvent) => {
  const antennaId = (target as HTMLInputElement).value;
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      antennaId,
    },
  });
};

const onChangeSearchQuery = async (e: Event) => {
  const query = (e.target as HTMLInputElement).value;

  emit("updateTimeline", {
    ...props.timeline,
    options: {
      query,
    },
  });
};

watch(
  () => props.timeline.channel,
  async (channel) => {
    if (channel === "misskey:channel") {
      followedMisskeyChannels.value = await timelineStore.getFollowedChannels();
    }
    if (channel === "misskey:antenna") {
      myMisskeyAntennas.value = await timelineStore.getMyAntennas();
    }
  },
);

onMounted(async () => {
  if (props.timeline.channel === "misskey:channel") {
    followedMisskeyChannels.value = await timelineStore.getFollowedChannels();
  }
  if (props.timeline.channel === "misskey:antenna") {
    myMisskeyAntennas.value = await timelineStore.getMyAntennas();
  }
});
</script>

<template>
  <div class="accounts-container">
    <div class="hazy-field-row indent-1">
      <div class="content">
        <Icon icon="mingcute:user-1-line" class="nn-icon size-small" />
        <span class="label">アカウント</span>
      </div>
      <div class="actions">
        <HazySelect
          name="user"
          :options="accountOptions"
          :value="props.timeline.userId"
          @change="onChangeUser"
          class="select"
        />
      </div>
    </div>
    <div class="hazy-field-row indent-1">
      <div class="content">
        <Icon icon="mingcute:list-check-3-line" class="nn-icon size-small" />
        <span class="label">タイムライン</span>
      </div>
      <div class="actions">
        <HazySelect
          name="channel"
          :options="streamOptions"
          :value="props.timeline.channel"
          @change="onChangeStream"
          class="select"
        />
      </div>
    </div>
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:channel'">
      <div class="content">
        <Icon icon="mingcute:tv-2-line" class="nn-icon size-small" />
        <span class="label">チャンネル</span>
      </div>
      <div class="actions">
        <HazySelect
          v-if="misskeyChannelOptions.length"
          name="channel"
          :options="misskeyChannelOptions"
          :value="props.timeline.options?.channelId"
          @change="onChangeChannel"
          class="select"
        />
      </div>
    </div>
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:antenna'">
      <div class="content">
        <Icon icon="mingcute:tv-2-line" class="nn-icon size-small" />
        <span class="label">アンテナ</span>
      </div>
      <div class="actions">
        <HazySelect
          v-if="misskeyAntennaOptions.length"
          name="antenna"
          :options="misskeyAntennaOptions"
          :value="props.timeline.options?.antennaId"
          @change="onChangeAntenna"
          class="select"
        />
      </div>
    </div>
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:search'">
      <div class="content">
        <Icon icon="mingcute:search-line" class="nn-icon size-small" />
        <span class="label">検索</span>
      </div>
      <div class="actions">
        <input class="nn-text-field" type="search" :value="searchQuery" @change="onChangeSearchQuery" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.accounts-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.content {
  display: inline-flex;
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
</style>
