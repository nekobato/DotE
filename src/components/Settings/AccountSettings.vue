<script setup lang="ts">
import { useStore } from "@/store";
import { useUsersStore } from "@/store/users";
import { useTimelineStore } from "@/store/timeline";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { nanoid } from "nanoid/non-secure";
import { ref } from "vue";
import { ElAvatar, ElRadioButton, ElRadioGroup, ElInput } from "element-plus";
import type { User } from "@shared/types/store";
import { doteMisskeyPermissionString } from "@/utils/dote";

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

const newAccountDefault = {
  instanceType: "misskey",
  instanceUrl: "",
  progress: "default" as "default" | "step1:instance" | "step2:confirm",
  misskey: {
    sessionId: "",
  },
  mastodon: {
    clientName: "",
    clientId: "",
    clientSecret: "",
    authCode: "",
    accessToken: "",
  },
};

const newAccount = ref(newAccountDefault);

const getMisskeyAuthUrl = (instanceUrl: string, sessionId: string) => {
  const url = new URL(`/miauth/${sessionId}`, instanceUrl);
  url.search = new URLSearchParams({
    name: "dote",
    permission: doteMisskeyPermissionString(),
  }).toString();
  return url.toString();
};

const getMastodonAuthUrl = (instanceUrl: string, clientId: string, clientSecret: string) => {
  const url = new URL("/oauth/authorize", instanceUrl);
  url.search = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    response_type: "code",
    redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
    scope: "read write follow",
  }).toString();
  return url.toString();
};

const resetStep = () => {
  resetStatues();
  newAccount.value.progress = "step1:instance";
};

const checkMiAuth = async () => {
  const misskey = newAccount.value.misskey;
  const check = await ipcInvoke("api", {
    method: "misskey:checkMiAuth",
    instanceUrl: newAccount.value.instanceUrl,
    sessionId: misskey.sessionId,
  }).catch(() => {
    store.$state.errors.push({
      message: `${newAccount.value.instanceUrl}の認証失敗`,
    });
  });

  await usersStore.createUser({
    name: check.user.name,
    avatarUrl: check.user.avatarUrl,
    token: check.token,
    instanceUrl: newAccount.value.instanceUrl,
    instanceType: "misskey",
  });
  newAccount.value.progress = "default";

  // 色々リセットするのが面倒なのでリロード
  setTimeout(() => {
    window.ipc.send("main:reload");
  }, 100);
};

const registerMastodonApp = async () => {
  const clientName = `dote-${nanoid()}`;
  const res = await ipcInvoke("api", {
    method: "mastodon:registerApp",
    instanceUrl: newAccount.value.instanceUrl,
    clientName: clientName,
  });
  newAccount.value.mastodon = {
    ...newAccount.value.mastodon,
    clientName,
    clientId: res.client_id,
    clientSecret: res.client_secret,
  };
};

const checkMastodonAuth = async () => {
  const res = await ipcInvoke("api", {
    method: "mastodon:getAccessToken",
    instanceUrl: newAccount.value.instanceUrl,
    clientId: newAccount.value.mastodon.clientId,
    clientSecret: newAccount.value.mastodon.clientSecret,
    code: newAccount.value.mastodon.authCode,
  });
  newAccount.value.mastodon.accessToken = res.access_token;
  await fetchAndSetMastodonMyself(res.access_token);
  newAccount.value.progress = "default";

  // 色々リセットするのが面倒なのでリロード
  setTimeout(() => {
    window.ipc.send("main:reload");
  }, 100);
};

const fetchAndSetMastodonMyself = async (token: string) => {
  const res = await ipcInvoke("api", {
    method: "mastodon:getAccount",
    instanceUrl: newAccount.value.instanceUrl,
    token,
  });
  await usersStore.createUser({
    name: res.username,
    avatarUrl: res.avatar,
    token: token,
    instanceUrl: newAccount.value.instanceUrl,
    instanceType: "mastodon",
    options: {
      clientName: newAccount.value.mastodon.clientName,
    },
  });
};

const auth = () => {
  if (newAccount.value.instanceType === "misskey") {
    openMisskeyAuthLink();
  } else {
    openMastodonAuthLink();
  }
};

const authCompleted = () => {
  if (newAccount.value.instanceType === "misskey") {
    checkMiAuth();
  } else {
    checkMastodonAuth();
  }
};

const openMisskeyAuthLink = () => {
  newAccount.value.misskey.sessionId = nanoid();
  newAccount.value.instanceUrl = /^https?:\/\//.test(newAccount.value.instanceUrl)
    ? newAccount.value.instanceUrl
    : "https://" + newAccount.value.instanceUrl;
  const url = getMisskeyAuthUrl(newAccount.value.instanceUrl, newAccount.value.misskey.sessionId);
  ipcSend("open-url", { url });
  newAccount.value.progress = "step2:confirm";
};

const openMastodonAuthLink = async () => {
  newAccount.value.instanceUrl = /^https?:\/\//.test(newAccount.value.instanceUrl)
    ? newAccount.value.instanceUrl
    : "https://" + newAccount.value.instanceUrl;
  await registerMastodonApp();
  const url = getMastodonAuthUrl(
    newAccount.value.instanceUrl,
    newAccount.value.mastodon.clientId,
    newAccount.value.mastodon.clientSecret,
  );
  ipcSend("open-url", { url });

  newAccount.value.progress = "step2:confirm";
};

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
  newAccount.value = newAccountDefault;
};

const getInstanceIconFromUser = (user: User) => {
  const instance = store.instances?.find((i) => i.id === user.instanceId);
  return instance?.iconUrl || "";
};
</script>

<template>
  <div class="account-settings dote-post-list">
    <h2 class="dote-field-group-title no-border">アカウント</h2>
    <div class="accounts-container" v-for="user in store.users" :key="user.id">
      <div class="dote-field-row">
        <ElAvatar shape="square" :size="40" :src="getInstanceIconFromUser(user)" class="avatar" />
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
    <div class="dote-field-row as-thread indent-1" :class="{ active: newAccount.progress !== 'default' }">
      <div class="actions">
        <button class="nn-button size-small action" v-if="newAccount.progress === 'default'" @click="resetStep">
          <Icon icon="ion:plus" class="nn-icon" />
          アカウント追加
        </button>
        <button class="nn-button size-small action" v-if="newAccount.progress !== 'default'" @click="resetStatues">
          <Icon icon="ion:close" class="nn-icon" />
        </button>
      </div>
    </div>
    <div class="dote-field-row as-thread indent-1 active" v-if="newAccount.progress === 'step1:instance'">
      <div class="content">
        <ElRadioGroup
          class="account-input"
          v-model="newAccount.instanceType"
          size="small"
          :disabled="newAccount.progress !== 'step1:instance'"
        >
          <ElRadioButton class="radio-button" key="misskey" value="misskey">Misskey</ElRadioButton>
          <ElRadioButton class="radio-button" key="mastodon" value="mastodon">Mastodon</ElRadioButton>
        </ElRadioGroup>
      </div>
    </div>
    <div class="dote-field-row as-thread indent-1 active" v-if="newAccount.progress === 'step1:instance'">
      <div class="content">
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="newAccount.instanceUrl" placeholder="https://..." size="small" />
        </div>
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="auth" :disabled="!newAccount.instanceUrl">
          認証
          <Icon icon="ion:open" class="nn-icon size-small" />
        </button>
      </div>
    </div>
    <div class="dote-field-row as-thread indent-1 active" v-if="newAccount.progress === 'step2:confirm'">
      <div class="content">
        <span v-if="newAccount.instanceType === 'misskey'">認証できた？</span>
        <ElInput
          class="token-input"
          v-model="newAccount.mastodon.authCode"
          placeholder="認証コード"
          size="small"
          v-if="newAccount.instanceType === 'mastodon'"
        />
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="resetStep">戻る</button>
        <button class="nn-button size-small action" @click="authCompleted">認証した</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
}
.avatar {
  background-color: #fff;
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
    background: rgba(255, 255, 255, 0.4);
  }
}
</style>
