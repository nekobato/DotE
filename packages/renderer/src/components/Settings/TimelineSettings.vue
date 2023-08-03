<script setup lang="ts">
import { onMounted, reactive, watch } from "vue";
import SectionTitle from "../Post/SectionTitle.vue";
import { Account } from "@/types/db";
import { Icon } from "@iconify/vue";
import { ElSelect, ElOption } from "element-plus";
import { useStorage } from "@vueuse/core";
import { ipcInvoke } from "@/utils/ipc";

const timelineSelect = [
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
];

const state = reactive({
  accounts: [] as Account[],
});

const settings = useStorage(
  "settings",
  {
    accountId: "",
    timeline: "misskey:homeTimeline",
  },
  localStorage,
);

watch(
  () => settings.value.accountId,
  async (accountId) => {
    await ipcInvoke("settings:set", { key: "timeline:accountId", value: accountId.toString() });
  },
);

watch(
  () => settings.value.timeline,
  async (timeline) => {
    await ipcInvoke("settings:set", { key: "timeline:timelineType", value: timeline });
  },
);

onMounted(async () => {
  const accounts = await ipcInvoke("db:get-users");
  state.accounts = accounts;
  settings.value.accountId = accounts[0].id;

  const allSettings = await ipcInvoke("settings:all");
  if (allSettings["timeline:accountId"]) {
    settings.value.accountId = allSettings["timeline:accountId"];
  } else {
    await ipcInvoke("settings:set", { key: "timeline:accountId", value: accounts[0].id.toString() });
  }
  if (allSettings["timeline:timelineType"]) {
    settings.value.timeline = allSettings["timeline:timelineType"];
  } else {
    await ipcInvoke("settings:set", { key: "timeline:timelineType", value: settings.value.timeline });
  }
});
</script>

<template>
  <div class="account-settings hazy-post-list">
    <SectionTitle title="タイムライン" />
    <div class="hazy-post account indent-1" v-for="account in state.accounts" :key="account.name">
      <div class="content">
        <span class="label">アカウント</span>
      </div>
      <div class="attachments actions">
        <ElSelect v-model="settings.accountId" size="small">
          <ElOption
            v-for="account in state.accounts"
            :key="account.id"
            :label="`${account.name}@${account.instanceUrl.replace('https://', '')}`"
            :value="account.id"
          />
        </ElSelect>
      </div>
    </div>
    <div class="hazy-post account indent-1" v-for="account in state.accounts" :key="account.name">
      <div class="content">
        <span class="label">タイムライン</span>
      </div>
      <div class="attachments actions">
        <ElSelect v-model="settings.timeline" size="small">
          <ElOption
            v-for="timeline in timelineSelect"
            :key="timeline.value"
            :label="timeline.label"
            :value="timeline.value"
          />
        </ElSelect>
      </div>
    </div>
    <div class="hazy-post account indent-1" v-if="false">
      <div class="content">
        <span class="label">検索</span>
      </div>
      <div class="attachments actions">
        <input class="nn-text-field" type="search" />
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
.actions {
  margin: 0 0 0 auto;
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
