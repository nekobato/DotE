<script setup lang="ts">
import { useStore } from "@/store";
import { NewUser, useUsersStore } from "@/store/users";
import { useTimelineStore } from "@/store/timeline";
import { Icon } from "@iconify/vue";
import { ref } from "vue";
import { ElAvatar, ElRadioButton, ElRadioGroup } from "element-plus";
import type { User } from "@shared/types/store";
import AddAccountMisskey from "./AddAccountMisskey.vue";
import AddAccountMastodon from "./AddAccountMastodon.vue";
import AddAccountBluesky from "./AddAccountBluesky.vue";
import InstanceIcon from "../InstanceIcon.vue";

const store = useStore();
const usersStore = useUsersStore();
const timelineStore = useTimelineStore();

const state = ref({
  actions: {
    delete: {
      id: null as string | null,
    },
  },
});

const newAccountInstanceType = ref<"misskey" | "mastodon" | "bluesky">();

const startDeleteAccount = (id: string) => {
  resetStatues();
  state.value.actions.delete.id = id;
};

const confirmDeleteAccount = async () => {
  if (state.value.actions.delete.id) {
    usersStore.deleteUser(state.value.actions.delete.id);
    timelineStore.deleteTimelineByUserId(state.value.actions.delete.id);
  }
  state.value.actions.delete.id = null;

  setTimeout(() => {
    window.ipc.send("main:reload");
  }, 100);
};

const resetStatues = () => {
  state.value.actions.delete.id = null;
};

const getInstanceFromUser = (user: User) => {
  return store.instances?.find((i) => i.id === user.instanceId);
};

const startAddAccount = () => {
  newAccountInstanceType.value = "misskey";
};

const exitAddAccount = () => {
  newAccountInstanceType.value = undefined;
};

const createAccount = (user: NewUser) => {
  newAccountInstanceType.value = undefined;
  usersStore.createUser(user);
};

const closeAddAccount = () => {
  newAccountInstanceType.value = undefined;
};
</script>

<template>
  <div class="account-settings dote-post-list">
    <h2 class="dote-field-group-title">アカウント</h2>
    <div class="accounts-container" v-for="user in store.users" :key="user.id">
      <div class="dote-field-row">
        <InstanceIcon :instance="getInstanceFromUser(user)" />
        <ElAvatar :src="user.avatarUrl || ''" class="avatar" />
        <div class="content">
          <span class="nickname">{{ user.name }}</span>
          <span class="instance">@{{ usersStore.findInstance(user.instanceId)?.url.replace("https://", "") }}</span>
        </div>
        <div class="actions">
          <button
            class="nn-button size-small action"
            @click="startDeleteAccount(user.id)"
            v-if="!state.actions.delete.id"
          >
            <Icon icon="ion:trash" class="nn-icon" />
          </button>
          <button class="nn-button size-small action" @click="resetStatues" v-if="state.actions.delete.id === user.id">
            <Icon icon="ion:close" class="nn-icon" />
          </button>
        </div>
      </div>
      <div class="dote-field-row as-thread indent-1" v-if="state.actions.delete.id === user.id">
        <div class="content">
          <span class="nickname">確認：削除しますか？</span>
        </div>
        <div class="actions">
          <button class="nn-button size-small type-warning action" @click="confirmDeleteAccount()">
            <Icon icon="ion:checkmark-done" class="nn-icon" />
          </button>
        </div>
      </div>
    </div>
    <!-- new accounts -->
    <div class="dote-field-row as-thread indent-1" :class="{ active: newAccountInstanceType }">
      <div class="content" v-if="newAccountInstanceType">
        <h3>新規アカウント</h3>
      </div>
      <div class="actions">
        <span class="add-account-hint" v-if="!newAccountInstanceType && store.users.length === 0">アカウント追加 →</span>
        <button class="nn-button size-small action" v-if="!newAccountInstanceType" @click="startAddAccount">
          <Icon icon="mingcute:add-fill" class="nn-icon" />
        </button>
        <button class="nn-button size-small action" v-if="newAccountInstanceType" @click="exitAddAccount">
          <Icon icon="ion:close" class="nn-icon" />
        </button>
      </div>
    </div>
    <div class="dote-field-row as-thread indent-1 active" v-if="newAccountInstanceType">
      <div class="content">
        <ElRadioGroup v-model="newAccountInstanceType" size="small">
          <ElRadioButton class="radio-button" key="misskey" value="misskey">Misskey</ElRadioButton>
          <ElRadioButton class="radio-button" key="mastodon" value="mastodon">Mastodon</ElRadioButton>
          <ElRadioButton class="radio-button" key="bluesky" value="bluesky">Bluesky</ElRadioButton>
        </ElRadioGroup>
      </div>
    </div>
    <AddAccountMisskey v-if="newAccountInstanceType === 'misskey'" @complete="createAccount" @close="closeAddAccount" />
    <AddAccountMastodon
      v-if="newAccountInstanceType === 'mastodon'"
      @complete="createAccount"
      @close="closeAddAccount"
    />
    <AddAccountBluesky v-if="newAccountInstanceType === 'bluesky'" @complete="createAccount" @close="closeAddAccount" />
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
  padding: 8px 0 0;
}
.account {
  display: flex;
  gap: 8px;
  align-items: center;
}
.content {
  padding: 4px 0;
  color: var(--color-text-body);
  font-size: var(--font-size-14);
  .account-input {
    width: 200px;
  }
}
.action {
  > svg {
    width: 16px;
    height: 16px;
  }
  &:hover {
    background: var(--dote-color-ink-t2);
  }
}
.add-account-hint {
  margin-left: 8px;
  color: var(--color-text-caption);
  font-size: var(--font-size-12);
}
</style>
