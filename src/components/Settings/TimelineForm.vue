<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { Icon } from "@iconify/vue";
import { computed, onMounted, ref, watch } from "vue";
import type { MisskeyChannel, MisskeyEntities } from "@shared/types/misskey";
import type { ChannelName, Timeline } from "@shared/types/store";
import { ElInput, ElSelect, ElOption } from "element-plus";
import { useInstanceStore } from "@/store/instance";

const props = defineProps<{
  timeline: Timeline;
}>();

const emit = defineEmits<{
  updateTimeline: [Timeline];
}>();

const store = useStore();
const timelineStore = useTimelineStore();
const instanceStore = useInstanceStore();

const misskeyStreamOptions: {
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
    value: "misskey:userList",
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
    label: "ハッシュタグ...",
    value: "misskey:hashtag",
  },
  {
    label: "検索...",
    value: "misskey:search",
  },
];

const mastodonStreamOptions: {
  label: string;
  value: ChannelName;
}[] = [
  {
    label: "ホーム",
    value: "mastodon:homeTimeline",
  },
  {
    label: "ローカル",
    value: "mastodon:localTimeline",
  },
  {
    label: "パブリック",
    value: "mastodon:publicTimeline",
  },
  {
    label: "リスト...",
    value: "mastodon:list",
  },
  {
    label: "ハッシュタグ...",
    value: "mastodon:hashtag",
  },
];

const followedMisskeyChannels = ref<MisskeyChannel[]>([]);
const myMisskeyAntennas = ref<MisskeyEntities.Antenna[]>([]);
const myMisskeyUserLists = ref<MisskeyEntities.UserList[]>([]);
const channelId = ref(props.timeline.options?.channelId ?? "");
const antennaId = ref(props.timeline.options?.antennaId ?? "");
const listId = ref(props.timeline.options?.listId ?? "");
const tag = ref(props.timeline.options?.tag ?? "");
const searchQuery = ref(props.timeline.options?.query ?? "");

const accountOptions = computed(() =>
  store.users.map((user) => ({
    label:
      user.name +
      "@" +
      store.instances.find((instance) => instance.id === user.instanceId)?.url.replace("https://", ""),
    value: user.id,
  })),
);

const streamOptions = (
  timeline: Timeline,
): {
  label: string;
  value: ChannelName;
}[] => {
  const instance = instanceStore.findInstanceByUserId(timeline.userId);
  switch (instance?.type) {
    case "misskey":
      return misskeyStreamOptions;
    case "mastodon":
      return mastodonStreamOptions;
    default:
      return [];
  }
};

const clearOptionValues = () => {
  channelId.value = "";
  antennaId.value = "";
  listId.value = "";
  tag.value = "";
  searchQuery.value = "";
};

const onChangeUser = async (userId: string) => {
  const defaultChannel =
    instanceStore.findInstanceByUserId(userId)?.type === "misskey" ? "misskey:homeTimeline" : "mastodon:homeTimeline";
  emit("updateTimeline", {
    ...props.timeline,
    userId,
    channel: defaultChannel,
    options: {},
  });
};

const onChangeStream = async (channel: ChannelName) => {
  clearOptionValues();
  emit("updateTimeline", {
    ...props.timeline,
    channel,
    options: {},
  });
};

const onChangeChannel = async (channelId: string) => {
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      channelId,
    },
  });
};

const onChangeAntenna = async (antennaId: string) => {
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      antennaId,
    },
  });
};

const onChangeList = async (listId: string) => {
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      listId,
    },
  });
};

const onChangeHashtag = async (tag: string) => {
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      tag,
    },
  });
};

const onChangeSearchQuery = async (query: string) => {
  emit("updateTimeline", {
    ...props.timeline,
    options: {
      query,
    },
  });
};

const fetchSelectionsFromChannel = async (channel: ChannelName) => {
  if (channel === "misskey:channel") {
    followedMisskeyChannels.value = await timelineStore.misskeyGetFollowedChannels();
  }
  if (channel === "misskey:antenna") {
    myMisskeyAntennas.value = await timelineStore.misskeyGetMyAntennas();
  }
  if (channel === "misskey:userList") {
    myMisskeyUserLists.value = await timelineStore.misskeyGetUserLists();
  }
};

watch(
  () => props.timeline.channel,
  (channel) => {
    fetchSelectionsFromChannel(channel);
  },
);

onMounted(() => {
  fetchSelectionsFromChannel(props.timeline.channel);
});
</script>

<template>
  <div class="accounts-container">
    <div class="hazy-field-row indent-1">
      <div class="content">
        <Icon icon="mingcute:user-1-line" class="nn-icon size-small" />
        <span class="label">アカウント</span>
      </div>
      <div class="actions for-select">
        <ElSelect v-model="props.timeline.userId" size="small" @change="onChangeUser">
          <ElOption
            v-for="account in accountOptions"
            :key="account.value"
            :label="account.label"
            :value="account.value"
          />
        </ElSelect>
      </div>
    </div>
    <div class="hazy-field-row indent-1">
      <div class="content">
        <Icon icon="mingcute:list-check-3-line" class="nn-icon size-small" />
        <span class="label">タイムライン</span>
      </div>
      <div class="actions for-select">
        <ElSelect v-model="props.timeline.channel" size="small" @change="onChangeStream">
          <ElOption
            v-for="option in streamOptions(timeline)"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </div>
    </div>
    <!-- misskey:channel -->
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:channel'">
      <div class="content">
        <Icon icon="mingcute:tv-2-line" class="nn-icon size-small" />
        <span class="label">チャンネル</span>
      </div>
      <div class="actions for-select">
        <ElSelect v-if="followedMisskeyChannels.length" v-model="channelId" size="small" @change="onChangeChannel">
          <ElOption
            v-for="channel in followedMisskeyChannels"
            :key="channel.id"
            :label="channel.name"
            :value="channel.id"
          />
        </ElSelect>
      </div>
    </div>
    <!-- misskey:antenna -->
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:antenna'">
      <div class="content">
        <Icon icon="mingcute:tv-2-line" class="nn-icon size-small" />
        <span class="label">アンテナ</span>
      </div>
      <div class="actions for-select">
        <ElSelect v-if="myMisskeyAntennas.length" v-model="antennaId" @change="onChangeAntenna" size="small">
          <ElOption v-for="antenna in myMisskeyAntennas" :key="antenna.id" :label="antenna.name" :value="antenna.id" />
        </ElSelect>
      </div>
    </div>
    <!-- misskey:userList -->
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:userList'">
      <div class="content">
        <Icon icon="mingcute:list-line" class="nn-icon size-small" />
        <span class="label">リスト</span>
      </div>
      <div class="actions for-select">
        <ElSelect v-if="myMisskeyUserLists.length" v-model="listId" @change="onChangeList" size="small">
          <ElOption v-for="list in myMisskeyUserLists" :key="list.id" :label="list.name" :value="list.id" />
        </ElSelect>
      </div>
    </div>
    <!-- misskey:search -->
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:search'">
      <div class="content">
        <Icon icon="mingcute:search-line" class="nn-icon size-small" />
        <span class="label">検索</span>
      </div>
      <div class="actions for-text-field">
        <ElInput size="small" v-model="searchQuery" @change="onChangeSearchQuery" />
      </div>
    </div>
    <!-- misskey:hashtag -->
    <div class="hazy-field-row indent-1" v-if="props.timeline.channel === 'misskey:hashtag'">
      <div class="content">
        <Icon icon="mingcute:list-line" class="nn-icon size-small" />
        <span class="label">ハッシュタグ</span>
      </div>
      <div class="actions for-text-field">
        <ElInput size="small" placeholder="#" v-model="tag" @change="onChangeHashtag" />
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

.actions.for-select,
.actions.for-text-field {
  width: 200px;
}
</style>
