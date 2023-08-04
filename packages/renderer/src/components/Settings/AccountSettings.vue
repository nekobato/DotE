<script setup lang="ts">
import { onMounted, reactive } from "vue";
import { Icon } from "@iconify/vue";
import { v4 as uuid } from "uuid";
import { Account } from "@/types/db";
import { hazyMisskeyPermissionString } from "@/utils/hazy";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { User } from "@prisma/client";
import SectionTitle from "../Post/SectionTitle.vue";
import store from "@/store";

const state = reactive({
  accounts: [] as Account[],
  accountActions: {
    delete: {
      id: null as string | null,
    },
  },
  timelines: [],
  settings: {},
  newAccount: {
    misskey: {
      progress: "default" as "default" | "step1:instance" | "step2:confirm",
      sessionId: "",
      instanceUrl: {
        value: "",
        error: "",
      },
    },
  },
});

const getCurrentAccounts = () => {
  window.ipc.invoke("db:get-users").then((accounts) => {
    state.accounts = accounts;
  });
};

const startAuth = (target: "misskey" | "mastodon") => {
  resetStatues();
  if (target === "misskey") {
    state.newAccount.misskey.progress = "step1:instance";
  }
};

const checkMiAuth = async () => {
  const check = await ipcInvoke("api", {
    method: "misskey:checkMiAuth",
    instanceUrl: state.newAccount.misskey.instanceUrl.value,
    sessionId: state.newAccount.misskey.sessionId,
  });

  saveMiUser({
    userId: check.data.user.id,
    name: check.data.user.name,
    username: check.data.user.username,
    avatarUrl: check.data.user.avatarUrl,
    instanceUrl: state.newAccount.misskey.instanceUrl.value,
    instanceType: "misskey",
    token: check.data.token,
  });
};

const deleteAccount = (id: string) => {
  resetStatues();
  state.accountActions.delete.id = id;
};

const confirmDeleteAccount = async () => {
  await ipcInvoke("db:delete-user", { id: state.accountActions.delete.id });
  getCurrentAccounts();
  state.accountActions.delete.id = null;
};

const openAuthLink = (type: "misskey" | "mastodon") => {
  state.newAccount.misskey.sessionId = uuid();
  let endpoint = "";
  switch (type) {
    case "misskey":
      endpoint = `/miauth/${state.newAccount.misskey.sessionId}`;
      break;
    case "mastodon":
      endpoint = "/auth/";
      break;
  }
  const url = new URL(endpoint, state.newAccount.misskey.instanceUrl.value);
  url.search = new URLSearchParams({
    name: "hazy",
    permission: hazyMisskeyPermissionString(),
  }).toString();
  ipcSend("open-url", { url });
  state.newAccount.misskey.progress = "step2:confirm";
};

const saveMiUser = async (user: Omit<User, "id">) => {
  const result = await ipcInvoke("db:upsert-user", user);
  console.log(result);
  getCurrentAccounts();
  state.newAccount.misskey.progress = "default";
};

const resetStatues = () => {
  state.accountActions.delete.id = null;
  state.newAccount.misskey.progress = "default";
  state.newAccount.misskey.instanceUrl.value = "";
  state.newAccount.misskey.instanceUrl.error = "";
};

onMounted(() => {
  store.dispatch("fetchAndSetUsers");
});
</script>

<template>
  <div class="account-settings hazy-post-list">
    <SectionTitle title="アカウント" />
    <div class="hazy-post account indent-1">
      <img src="/images/logo/misskey.png" class="hazy-avatar" />
      <div class="content">
        <span class="nickname">Misskey</span>
      </div>
    </div>
    <div class="hazy-post account indent-1" v-for="account in state.accounts" :key="account.username">
      <img :src="account.avatarUrl" class="hazy-avatar" />
      <div class="content">
        <span class="nickname">{{ account.username }}</span>
        <span class="instance">@{{ account.instanceUrl.replace("https://", "") }}</span>
      </div>
      <div class="hazy-post-actions">
        <button
          class="nn-button size-small action"
          @click="deleteAccount(account.id)"
          v-if="!state.accountActions.delete.id"
        >
          <Icon icon="ion:trash" class="nn-icon" />
        </button>
        <button class="nn-button size-small action" @click="resetStatues" v-if="state.accountActions.delete.id">
          <Icon icon="ion:close" class="nn-icon" />
        </button>
      </div>
    </div>
    <div class="hazy-post account as-thread indent-1" v-if="state.accountActions.delete.id">
      <div class="content">
        <span class="nickname">確認：削除しますか？</span>
      </div>
      <div class="hazy-post-actions">
        <button class="nn-button size-small type-warning action" @click="confirmDeleteAccount()">
          <Icon icon="ion:checkmark-done" class="nn-icon" />
        </button>
      </div>
    </div>
    <!-- new accounts -->
    <div class="hazy-post account indent-1">
      <div class="content">
        <span>アカウント追加</span>
      </div>
      <div class="hazy-post-actions">
        <button
          class="nn-button size-small action"
          v-if="state.newAccount.misskey.progress === 'default'"
          @click="startAuth('misskey')"
        >
          <Icon icon="ion:plus" class="nn-icon" />
        </button>
        <button
          class="nn-button size-small action"
          v-if="state.newAccount.misskey.progress !== 'default'"
          @click="resetStatues"
        >
          <Icon icon="ion:close" class="nn-icon" />
        </button>
      </div>
    </div>
    <div class="hazy-post as-thread indent-1" v-if="state.newAccount.misskey.progress === 'step1:instance'">
      <div class="content">
        <div class="nn-form-item">
          <label class="nn-label">インスタンスURL</label>
          <input
            type="text"
            class="nn-text-field"
            v-model="state.newAccount.misskey.instanceUrl.value"
            placeholder="https://..."
          />
        </div>
      </div>
      <div class="hazy-post-actions">
        <button class="nn-button size-small action" @click="openAuthLink('misskey')">
          <Icon icon="ion:open" class="nn-icon size-small" />
        </button>
      </div>
    </div>
    <div class="hazy-post account as-thread indent-1" v-if="state.newAccount.misskey.progress === 'step2:confirm'">
      <div class="content">
        <span>認証した？</span>
      </div>
      <div class="hazy-post-actions">
        <button class="nn-button size-small action" @click="startAuth('misskey')">戻る</button>
        <button class="nn-button size-small action" @click="checkMiAuth()">認証した</button>
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
  padding: 4px 0;
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
.hazy-post {
  display: flex;
  &.indent-1 {
    padding-left: 16px;
  }
}
</style>
