<script setup lang="ts">
import { NewUser } from "@/store/users";
import { useStore } from "@/store";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { ElInput } from "element-plus";
import { nanoid } from "nanoid/non-secure";
import { ref } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";

const instanceUrl = ref("");
const clientName = ref("");
const clientId = ref("");
const clientSecret = ref("");
const authCode = ref("");
const accessToken = ref("");
const store = useStore();

const unwrapApiResult = <T>(result: ApiInvokeResult<T>, message: string): T | undefined => {
  if (!result.ok) {
    store.$state.errors.push({
      message,
    });
    console.error(message, result.error);
    return undefined;
  }
  return result.data;
};

const emit = defineEmits<{
  complete: [user: NewUser];
  close: [];
}>();

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

const registerMastodonApp = async () => {
  instanceUrl.value = /^https?:\/\//.test(instanceUrl.value) ? instanceUrl.value : "https://" + instanceUrl.value;
  clientName.value = `dote-${nanoid()}`;
  const result = await ipcInvoke("api", {
    method: "mastodon:registerApp",
    instanceUrl: instanceUrl.value,
    clientName: clientName.value,
  });
  const res = unwrapApiResult(result, `${instanceUrl.value} のアプリ登録に失敗しました`);
  if (!res) return;
  clientId.value = (res as any).client_id;
  clientSecret.value = (res as any).client_secret;

  ipcSend("open-url", {
    url: getMastodonAuthUrl(instanceUrl.value, clientId.value, clientSecret.value),
  });
};

const checkMastodonAuth = async () => {
  const result = await ipcInvoke("api", {
    method: "mastodon:getAccessToken",
    instanceUrl: instanceUrl.value,
    clientId: clientId.value,
    clientSecret: clientSecret.value,
    code: authCode.value,
  });
  const res = unwrapApiResult(result, `${instanceUrl.value} の認証トークン取得に失敗しました`);
  if (!res) return;
  accessToken.value = (res as any).access_token;
  await fetchAndSetMastodonMyself(accessToken.value);

  // 色々リセットするのが面倒なのでリロード
  setTimeout(() => {
    window.ipc.send("main:reload");
  }, 100);
};

const fetchAndSetMastodonMyself = async (token: string) => {
  const result = await ipcInvoke("api", {
    method: "mastodon:getAccount",
    instanceUrl: instanceUrl.value,
    token,
  });
  const res = unwrapApiResult(result, `${instanceUrl.value} のアカウント取得に失敗しました`);
  if (!res) return;

  emit("complete", {
    name: (res as any).username,
    avatarUrl: (res as any).avatar,
    token: token,
    instanceUrl: instanceUrl.value,
    instanceType: "mastodon",
    options: {
      clientName: clientName.value,
    },
  });
};
</script>

<template>
  <div>
    <div class="dote-field-row as-thread indent-1 active" v-if="!clientId">
      <div class="content">
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="instanceUrl" placeholder="https://..." size="small" />
        </div>
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="registerMastodonApp" :disabled="!instanceUrl">
          認証
          <Icon icon="ion:open" class="nn-icon size-small" />
        </button>
      </div>
    </div>
    <div class="dote-field-row as-thread indent-1 active" v-if="clientId">
      <div class="content">
        <ElInput class="token-input" v-model="authCode" placeholder="認証コード" size="small" />
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="emit('close')">戻る</button>
        <button class="nn-button size-small action" @click="checkMastodonAuth">認証した</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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
